import type { Connection } from 'mongoose';

/** Explicit one-off repair: never remove current token protection or indexes used by legacy records. */
export async function repairLegacySessionIndex(db: NonNullable<Connection['db']>): Promise<boolean> {
  const sessions = db.collection('sessions');
  const indexes = await sessions.indexes();
  const legacy = indexes.find((index) => index.name === 'sessions_token_hash_unique');
  if (!legacy) return false;
  if (!legacy.unique || Object.keys(legacy.key).length !== 1 || legacy.key.tokenHash !== 1) {
    throw new Error('Unexpected legacy index definition; repair stopped');
  }
  const current = indexes.find((index) => index.unique && index.key.refreshTokenHash === 1 && Object.keys(index.key).length === 1 && !index.sparse && !index.partialFilterExpression);
  if (!current) throw new Error('Current refresh-token uniqueness protection is missing');
  if (await sessions.countDocuments({ tokenHash: { $exists: true } })) {
    throw new Error('Legacy token records still exist; migration requires review');
  }
  await sessions.dropIndex(legacy.name!);
  return true;
}
