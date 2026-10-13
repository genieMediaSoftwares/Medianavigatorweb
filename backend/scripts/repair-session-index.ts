import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { repairLegacySessionIndex } from '../src/db/repairLegacySessionIndex.js';

try {
  await mongoose.connect(config.database.mongoUri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000 });
  const repaired = await repairLegacySessionIndex(mongoose.connection.db!);
  console.log(repaired ? 'Removed obsolete session index; current token uniqueness retained. No records changed.' : 'No obsolete session index found.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Session index repair failed');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
