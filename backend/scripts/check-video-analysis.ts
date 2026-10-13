import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { ConnectedAccount } from '../src/models/ConnectedAccount.js';
import { ContentItem } from '../src/models/ContentItem.js';
import { connectionRepository } from '../src/repositories/connection.repository.js';
import { decryptSecret } from '../src/lib/crypto.js';
import { generateJson } from '../src/services/ai/geminiClient.js';
import { z } from 'zod';
import { aiAnalysisService } from '../src/services/ai/aiAnalysis.service.js';
try {
  await mongoose.connect(config.database.mongoUri, { autoIndex: false, autoCreate: false });
  const accounts = await ConnectedAccount.find({ platform: 'instagram', active: true }).select('_id userId').lean();
  const item = await ContentItem.findOne({ platform: 'instagram', title: /^A heartfelt thank you to everyone who came/, connectedAccountId: { $in: accounts.map((a) => a._id) } }).lean();
  if (!item) throw new Error('Screenshot video was not found');
  const account = await connectionRepository.findForUserWithCredentials(item.userId, 'instagram');
  const credentials = JSON.parse(decryptSecret(account!.credentialsEnc!));
  for (const host of ['graph.facebook.com', 'graph.instagram.com']) {
    const url = new URL(`https://${host}/${config.providers.metaApiVersion}/${encodeURIComponent(item.providerMediaId)}`);
    url.searchParams.set('fields', 'media_url,media_type');
    const response = await fetch(url, { headers: { Authorization: `Bearer ${credentials.pageAccessToken || credentials.accessToken}` }, signal: AbortSignal.timeout(10000) });
    const body = await response.json();
    console.log(JSON.stringify({host,status:response.status,code:body.error?.code,subcode:body.error?.error_subcode,type:body.media_type,hasVideoUrl:!!body.media_url,numericId:/^\d+$/.test(item.providerMediaId)}));
  }
  const check = await generateJson({ system: 'Return JSON only.', prompt: 'Return {"ok":true}', schema: z.object({ok:z.boolean()}) });
  console.log(JSON.stringify({geminiWorking:check.data.ok,model:check.model}));

} catch (error) {
  console.error(error instanceof Error ? error.message : 'Verification failed'); process.exitCode = 1;
} finally { await mongoose.disconnect(); }
