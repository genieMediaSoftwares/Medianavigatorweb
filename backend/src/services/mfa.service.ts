import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';
import { AppError, badRequest, conflict, forbidden, invalidCredentials, notFound } from '../lib/errors.js';
import { decryptSecret, encryptSecret, sha256 } from '../lib/crypto.js';
import { toObjectId } from '../lib/ids.js';
import { generateRecoveryCodes, generateTotpSecret, normaliseRecoveryCode, otpauthUrl, verifyTotp } from '../lib/totp.js';
import { User, type UserDoc } from '../models/User.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { isStaffRole } from '../../../shared/admin.js';

export interface SecondFactor { mfaCode?: string; recoveryCode?: string }
interface Actor { userId: string; requestId?: string; ip?: string }

const SECRET_FIELDS = '+passwordHash +mfa.secretEnc +mfa.pendingSecretEnc +mfa.recoveryCodeHashes';
const loadWithSecrets = (userId: string) => User.findById(toObjectId(userId)).select(SECRET_FIELDS).lean<UserDoc>();
const hashRecovery = (code: string) => sha256(`mfa-recovery:${normaliseRecoveryCode(code)}`);

async function checkPassword(user: UserDoc | null, password: string) {
  if (!user || user.deletedAt) throw notFound('User not found');
  if (!(await bcrypt.compare(password, user.passwordHash))) throw invalidCredentials('Password is incorrect');
}

export const mfaService = {
  /**
   * Verifies a TOTP code (never the same time step twice) or consumes a recovery code (each works once). The update is
   * conditional, so two concurrent sign-ins cannot both use one code.
   */
  async verifySecondFactor(user: UserDoc, factor: SecondFactor): Promise<boolean> {
    if (!user.mfa?.enabled || !user.mfa.secretEnc) return false;
    if (factor.mfaCode) {
      const step = verifyTotp(decryptSecret(user.mfa.secretEnc), factor.mfaCode.trim(), user.mfa.lastUsedStep ?? null);
      if (step === null) return false;
      const res = await User.updateOne({ _id: user._id, $or: [{ 'mfa.lastUsedStep': null }, { 'mfa.lastUsedStep': { $lt: step } }] }, { $set: { 'mfa.lastUsedStep': step } });
      return res.modifiedCount === 1;
    }
    if (factor.recoveryCode) {
      const hash = hashRecovery(factor.recoveryCode);
      const res = await User.updateOne({ _id: user._id, 'mfa.recoveryCodeHashes': hash }, { $pull: { 'mfa.recoveryCodeHashes': hash } });
      if (res.modifiedCount === 1) await auditRepository.record({ actorId: user._id, action: 'mfa.recovery_code_used', targetType: 'user', targetId: String(user._id) });
      return res.modifiedCount === 1;
    }
    return false;
  },

  /** For sign-in and step-up: throws unless the user either has no MFA or supplied a valid second factor. */
  async requireSecondFactor(userId: string, factor: SecondFactor, onFailure?: () => Promise<unknown>) {
    const user = await loadWithSecrets(userId);
    if (!user?.mfa?.enabled) return;
    if (!factor.mfaCode && !factor.recoveryCode) throw new AppError('MFA_REQUIRED', 'Enter the 6-digit code from your authenticator app, or one of your recovery codes.');
    if (!(await mfaService.verifySecondFactor(user, factor))) {
      await onFailure?.();
      throw invalidCredentials('That authentication code is not valid. Codes change every 30 seconds and each one works once.');
    }
  },

  async status(userId: string) {
    const user = await User.findById(toObjectId(userId)).select('+mfa.recoveryCodeHashes').lean<UserDoc>();
    if (!user) throw notFound('User not found');
    return {
      enabled: Boolean(user.mfa?.enabled), enabledAt: user.mfa?.enabledAt ?? null,
      recoveryCodesRemaining: user.mfa?.enabled ? user.mfa.recoveryCodeHashes?.length ?? 0 : 0,
      available: isStaffRole(user.role), required: config.auth.staffMfaRequired && isStaffRole(user.role),
    };
  },

  /** Starts enrolment. The secret is returned once, here, for the authenticator app; it is stored only encrypted. */
  async setup(actor: Actor, password: string) {
    const user = await loadWithSecrets(actor.userId);
    await checkPassword(user, password);
    // Customer clients have no code prompt yet, so enrolment is limited to staff accounts.
    if (!isStaffRole(user!.role)) throw forbidden('Two-step sign-in is currently available for staff accounts only.');
    if (user!.mfa?.enabled) throw conflict('Two-step sign-in is already on. Turn it off first to set up a new device.');
    const secret = generateTotpSecret();
    await User.updateOne({ _id: user!._id }, { $set: { 'mfa.pendingSecretEnc': encryptSecret(secret), 'mfa.enabled': false } });
    await auditRepository.record({ actorId: user!._id, action: 'mfa.setup_started', targetType: 'user', targetId: actor.userId, requestId: actor.requestId, ip: actor.ip });
    return { secret, otpauthUrl: otpauthUrl(secret, user!.email) };
  },

  /** Confirms enrolment with a code from the new device. Returns recovery codes once; other sessions are signed out. */
  async enable(actor: Actor & { sessionId: string }, code: string) {
    const user = await loadWithSecrets(actor.userId);
    if (!user) throw notFound('User not found');
    if (user.mfa?.enabled) throw conflict('Two-step sign-in is already on.');
    if (!user.mfa?.pendingSecretEnc) throw badRequest('Start setup first.');
    const secret = decryptSecret(user.mfa.pendingSecretEnc);
    const step = verifyTotp(secret, code.trim());
    if (step === null) throw invalidCredentials('That code does not match. Check the time on your device and try the newest code.');
    const codes = generateRecoveryCodes();
    await User.updateOne({ _id: user._id }, { $set: { mfa: { enabled: true, secretEnc: user.mfa.pendingSecretEnc, pendingSecretEnc: null, enabledAt: new Date(), lastUsedStep: step, recoveryCodeHashes: codes.map(hashRecovery) } } });
    await sessionRepository.revokeAllForUser(user._id, 'mfa_enabled', actor.sessionId);
    await auditRepository.record({ actorId: user._id, action: 'mfa.enable', targetType: 'user', targetId: actor.userId, requestId: actor.requestId, ip: actor.ip });
    return { enabled: true, recoveryCodes: codes };
  },

  async disable(actor: Actor, password: string, factor: SecondFactor) {
    const user = await loadWithSecrets(actor.userId);
    await checkPassword(user, password);
    if (!user!.mfa?.enabled) return { enabled: false };
    if (config.auth.staffMfaRequired && isStaffRole(user!.role)) throw forbidden('Two-step sign-in is required for staff accounts and cannot be turned off.');
    if (!(await mfaService.verifySecondFactor(user!, factor))) throw invalidCredentials('That authentication code is not valid.');
    await User.updateOne({ _id: user!._id }, { $set: { mfa: { enabled: false, secretEnc: null, pendingSecretEnc: null, enabledAt: null, lastUsedStep: null } } });
    await auditRepository.record({ actorId: user!._id, action: 'mfa.disable', targetType: 'user', targetId: actor.userId, requestId: actor.requestId, ip: actor.ip });
    return { enabled: false };
  },

  async regenerateRecoveryCodes(actor: Actor, password: string, factor: SecondFactor) {
    const user = await loadWithSecrets(actor.userId);
    await checkPassword(user, password);
    if (!user!.mfa?.enabled) throw badRequest('Two-step sign-in is not on.');
    if (!(await mfaService.verifySecondFactor(user!, factor))) throw invalidCredentials('That authentication code is not valid.');
    const codes = generateRecoveryCodes();
    await User.updateOne({ _id: user!._id }, { $set: { 'mfa.recoveryCodeHashes': codes.map(hashRecovery) } });
    await auditRepository.record({ actorId: user!._id, action: 'mfa.recovery_codes_regenerated', targetType: 'user', targetId: actor.userId, requestId: actor.requestId, ip: actor.ip });
    return { recoveryCodes: codes };
  },

  /**
   * Recovery when a staff member has lost both their device and their recovery codes: a super administrator removes the
   * enrolment and signs the person out everywhere. They must enrol again (and, when enforced, before using admin pages).
   */
  async resetByAdmin(actor: Actor, targetId: string) {
    if (targetId === actor.userId) throw badRequest('You cannot reset your own two-step sign-in here.');
    const target = await User.findById(toObjectId(targetId)).lean<UserDoc>();
    if (!target || target.deletedAt) throw notFound('User not found');
    await User.updateOne({ _id: target._id }, { $set: { mfa: { enabled: false, secretEnc: null, pendingSecretEnc: null, enabledAt: null, lastUsedStep: null } } });
    await sessionRepository.revokeAllForUser(target._id, 'mfa_reset_by_admin');
    await auditRepository.record({ actorId: toObjectId(actor.userId), action: 'mfa.reset_by_admin', targetType: 'user', targetId, requestId: actor.requestId, ip: actor.ip, meta: { wasEnabled: Boolean(target.mfa?.enabled) } });
    return { reset: true };
  },
};
