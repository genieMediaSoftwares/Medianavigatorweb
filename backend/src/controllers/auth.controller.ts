import type { Request } from 'express';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/response.js';
import { authService } from '../services/auth.service.js';
import { userService } from '../services/user.service.js';
import { mfaService } from '../services/mfa.service.js';

const client = (req: Request) => ({ userAgent: req.header('user-agent') ?? undefined, ip: req.ip });
const actor = (req: Request) => ({ userId: req.auth!.userId, requestId: req.requestId, ip: req.ip });

export const authController = {
  register: asyncHandler(async (req, res) => ok(res, await authService.register(req.body, client(req)), 201)),
  login: asyncHandler(async (req, res) => ok(res, await authService.login(req.body, client(req)))),
  refresh: asyncHandler(async (req, res) => ok(res, { tokens: await authService.refresh(req.body.refreshToken, client(req)) })),
  logout: asyncHandler(async (req, res) => { await authService.logout(req.auth!.sessionId); ok(res, { loggedOut: true }); }),
  logoutAll: asyncHandler(async (req, res) => { await authService.logoutAll(req.auth!.userId); ok(res, { loggedOut: true }); }),
  me: asyncHandler(async (req, res) => ok(res, await userService.me(req.auth!.userId))),
  changePassword: asyncHandler(async (req, res) => {
    await authService.changePassword(req.auth!.userId, req.auth!.sessionId, req.body.currentPassword, req.body.newPassword);
    ok(res, { changed: true });
  }),
  forgotPassword: asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    ok(res, { message: 'If an active account matches that email, you’ll receive a reset link. Check your inbox and spam folder. If it doesn’t arrive, try again in a minute.' }, 202);
  }),
  resetPassword: asyncHandler(async (req, res) => { await authService.resetPassword(req.body.token, req.body.newPassword); ok(res, { reset: true }); }),
  reauth: asyncHandler(async (req, res) => ok(res, await authService.reauth(req.auth!.userId, req.auth!.sessionId, req.body, { ...client(req), requestId: req.requestId }))),
  mfaStatus: asyncHandler(async (req, res) => ok(res, await mfaService.status(req.auth!.userId))),
  mfaSetup: asyncHandler(async (req, res) => ok(res, await mfaService.setup(actor(req), req.body.password))),
  mfaEnable: asyncHandler(async (req, res) => ok(res, await mfaService.enable({ ...actor(req), sessionId: req.auth!.sessionId }, req.body.mfaCode))),
  mfaDisable: asyncHandler(async (req, res) => ok(res, await mfaService.disable(actor(req), req.body.password, req.body))),
  mfaRecoveryCodes: asyncHandler(async (req, res) => ok(res, await mfaService.regenerateRecoveryCodes(actor(req), req.body.password, req.body))),
};
