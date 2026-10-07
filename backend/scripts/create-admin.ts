/**
 * Creates (or promotes) an administrator. Run manually: `npm run admin:create -- admin@example.com`
 * The password is read from the terminal without echo. Nothing is created automatically at startup.
 */
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase, ensureIndexes } from '../src/db/client.js';
import { userRepository } from '../src/repositories/user.repository.js';
import { profileRepository } from '../src/repositories/profile.repository.js';
import { auditRepository } from '../src/repositories/audit.repository.js';
import { password as passwordRule } from '../src/validators/index.js';

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as any)._writeToOutput;
    (rl as any)._writeToOutput = (s: string) => { if (s.includes(question)) write.call(rl, s); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Usage: npm run admin:create -- <email>');
  await connectDatabase();
  await ensureIndexes();

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    await userRepository.setRole(String(existing._id), 'admin');
    await auditRepository.record({ actorId: null, action: 'admin.promote_cli', targetType: 'user', targetId: String(existing._id) });
    console.log(`Promoted existing user ${email} to admin.`);
  } else {
    const pw = await promptHidden('Password: ');
    const parsed = passwordRule.safeParse(pw);
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    const user = await userRepository.create({ email, passwordHash: await bcrypt.hash(pw, config.auth.passwordHashRounds), role: 'admin' });
    await profileRepository.upsert(user._id, { fullName: 'Administrator' });
    await auditRepository.record({ actorId: null, action: 'admin.create_cli', targetType: 'user', targetId: String(user._id) });
    console.log(`Created admin ${email}.`);
  }
  await disconnectDatabase();
}

main().catch((err) => { console.error(err.message); process.exit(1); });
