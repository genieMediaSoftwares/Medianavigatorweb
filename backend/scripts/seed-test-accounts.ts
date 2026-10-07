/**
 * DEVELOPMENT ONLY. Creates (or resets) two well-known test logins so the app can be explored locally:
 *   test@admin.in / password  (admin)      test@user.in / password  (user)
 * These passwords are deliberately weak, so the script refuses to run when NODE_ENV=production.
 * Run manually: `npm run seed:test-accounts`. Nothing is created automatically at startup.
 */
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase, ensureIndexes } from '../src/db/client.js';
import { userRepository } from '../src/repositories/user.repository.js';
import { profileRepository } from '../src/repositories/profile.repository.js';
import { User } from '../src/models/User.js';

export const TEST_ACCOUNTS = [
  { email: 'test@admin.in', password: 'password', role: 'admin' as const, fullName: 'Test Admin' },
  { email: 'test@user.in', password: 'password', role: 'user' as const, fullName: 'Test User' },
];

export async function seedTestAccounts(): Promise<void> {
  if (config.server.isProduction) throw new Error('Refusing to create weak-password test accounts when NODE_ENV=production.');
  for (const a of TEST_ACCOUNTS) {
    const passwordHash = await bcrypt.hash(a.password, config.auth.passwordHashRounds);
    const existing = await userRepository.findByEmail(a.email);
    if (existing) {
      await User.updateOne({ _id: existing._id }, { $set: { passwordHash, role: a.role, status: 'active', failedLoginCount: 0, lockedUntil: null, passwordChangedAt: new Date() } });
    } else {
      const user = await userRepository.create({ email: a.email, passwordHash, role: a.role });
      await profileRepository.upsert(user._id, { fullName: a.fullName });
    }
  }
}

if (process.argv[1]?.endsWith('seed-test-accounts.ts')) {
  (async () => {
    await connectDatabase();
    await ensureIndexes();
    await seedTestAccounts();
    console.log(`Ready: ${TEST_ACCOUNTS.map((a) => `${a.email} (${a.role})`).join(', ')} — password: password`);
    await disconnectDatabase();
  })().catch((err) => { console.error(err.message); process.exit(1); });
}
