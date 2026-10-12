import { Router } from 'express';
import { intelligenceController as c } from '../controllers/intelligence.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { intelligence as v } from '../validators/index.js';

export const intelligenceRouter = Router();
intelligenceRouter.use(authenticate);
intelligenceRouter.get('/status', c.status);
intelligenceRouter.get('/overview', c.overview);
intelligenceRouter.get('/timing', c.timing);
intelligenceRouter.get('/signals', c.signals);
intelligenceRouter.get('/performers', validate({ query: v.performers }), c.performers);
intelligenceRouter.get('/patterns', c.patterns);
intelligenceRouter.get('/archive-audit', c.archive);
intelligenceRouter.get('/summary', validate({ query: v.summary }), c.summary);
intelligenceRouter.get('/history', validate({ query: v.history }), c.history);
intelligenceRouter.get('/recommendations', c.recommendations);
intelligenceRouter.get('/trends', c.trends);
intelligenceRouter.post('/ask', aiLimiter, validate({ body: v.ask }), c.ask);
intelligenceRouter.post('/analyze-item', aiLimiter, validate({ body: v.item }), c.analyzeItem);
intelligenceRouter.post('/diagnose-post', aiLimiter, validate({ body: v.diagnose }), c.diagnose);
intelligenceRouter.post('/analyze-video', aiLimiter, validate({ body: v.item }), c.analyzeVideo);
intelligenceRouter.post('/compare', validate({ body: v.compare }), c.compare);
// Six-point content analysis (deep / why_top / why_bottom) over the real media, saved per post.
intelligenceRouter.post('/content-analysis', aiLimiter, validate({ body: v.contentAnalysis }), c.contentAnalysis);
intelligenceRouter.get('/content-analysis', validate({ query: v.contentAnalysisQuery }), c.savedContentAnalysis);
