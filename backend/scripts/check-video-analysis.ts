import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { ConnectedAccount } from '../src/models/ConnectedAccount.js';
import { ContentItem } from '../src/models/ContentItem.js';
import { aiAnalysisService } from '../src/services/ai/aiAnalysis.service.js';
try {
  await mongoose.connect(config.database.mongoUri, { autoIndex: false, autoCreate: false });
  const accounts = await ConnectedAccount.find({ platform: 'instagram', active: true }).select('_id userId').lean();
  const item = await ContentItem.findOne({ platform: 'instagram', title: /^A heartfelt thank you to everyone who came/, connectedAccountId: { $in: accounts.map((a) => a._id) } }).lean();
  if (!item) throw new Error('Screenshot video was not found');
  const result = await aiAnalysisService.diagnosePost(String(item.userId), item.legacyId);
  console.log(JSON.stringify({ ai: result.ai, evidence: result.videoEvidence, summary: result.executiveSummary }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Verification failed'); process.exitCode = 1;
} finally { await mongoose.disconnect(); }
