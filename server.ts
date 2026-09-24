import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { dataStore } from './backend/src/services/dataStore.js';
import { askMediaNavigator, generateContentInsight, deepDiagnosePostAI } from './backend/src/services/geminiService.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API Response Helper
function jsonResponse(res: express.Response, data: any, message = 'Success', status = 200) {
  return res.status(status).json({
    success: true,
    data,
    message,
  });
}

function errorResponse(res: express.Response, message = 'Internal Error', code = 'ERROR', status = 500) {
  return res.status(status).json({
    success: false,
    message,
    code,
  });
}

// REST APIs (/api/v1)

// Workspace
app.get('/api/v1/workspaces', (req, res) => {
  jsonResponse(res, dataStore.getWorkspace());
});

// Platform Connections
app.get('/api/v1/connections', (req, res) => {
  jsonResponse(res, dataStore.getConnections());
});

// Connect platform with real credentials
app.post('/api/v1/connections/:platform/connect', async (req, res) => {
  const { platform } = req.params;
  const credentials = req.body || {};

  try {
    const result = await dataStore.connectAndSyncPlatform(platform as any, credentials);
    if (!result.success) {
      return errorResponse(res, result.message, 'CONNECTION_FAILED', 400);
    }
    jsonResponse(res, result.connection, result.message);
  } catch (err: any) {
    errorResponse(res, err.message || `Failed to connect ${platform}`, 'CONNECTION_ERROR', 500);
  }
});

// Sync platform using saved credentials
app.post('/api/v1/connections/:platform/sync', async (req, res) => {
  const { platform } = req.params;

  try {
    const result = await dataStore.syncPlatform(platform as any);
    if (!result.success) {
      return errorResponse(res, result.message, 'SYNC_FAILED', 400);
    }
    jsonResponse(res, result.connection, result.message);
  } catch (err: any) {
    errorResponse(res, err.message || `Failed to sync ${platform}`, 'SYNC_ERROR', 500);
  }
});

// Disconnect platform
app.post('/api/v1/connections/:platform/disconnect', (req, res) => {
  const { platform } = req.params;
  try {
    const conn = dataStore.disconnectPlatform(platform as any);
    jsonResponse(res, conn, `Disconnected ${platform}`);
  } catch (err: any) {
    errorResponse(res, err.message, 'DISCONNECT_ERROR', 404);
  }
});

// Auto-fetch YouTube Channel endpoint
app.post('/api/v1/youtube/fetch-channel', async (req, res) => {
  const { apiKey, accessToken, channelQuery, channelId } = req.body || {};
  try {
    const channel = await dataStore.fetchYouTubeChannel({ apiKey, accessToken, channelQuery, channelId });
    jsonResponse(res, channel, 'YouTube channel fetched successfully');
  } catch (err: any) {
    errorResponse(res, err.message || 'Failed to auto-fetch YouTube channel', 'YOUTUBE_FETCH_FAILED', 400);
  }
});

// Overview / Analytics Signals (Real data only)
app.get('/api/v1/analytics/overview', (req, res) => {
  jsonResponse(res, dataStore.getOverviewData());
});

// Media Content Feed
app.get('/api/v1/media', (req, res) => {
  const platform = req.query.platform as string | undefined;
  jsonResponse(res, dataStore.getMedia(platform));
});

app.get('/api/v1/media/:id', (req, res) => {
  const item = dataStore.getMediaById(req.params.id);
  if (!item) {
    return errorResponse(res, 'Media item not found', 'NOT_FOUND', 404);
  }
  jsonResponse(res, item);
});

// Timing Intelligence (Real data only)
app.get('/api/v1/timing', (req, res) => {
  jsonResponse(res, dataStore.getTimingData());
});

// AI Intelligence Stream
app.get('/api/v1/intelligence/signals', (req, res) => {
  jsonResponse(res, {
    title: 'What should you know right now?',
    insights: dataStore.getInsights(),
  });
});

// Section 4 & 5: Top & Bottom Performers
app.get('/api/v1/intelligence/performers', (req, res) => {
  const sortBy = (req.query.sortBy as any) || 'views';
  jsonResponse(res, {
    top: dataStore.getTopPerformers(sortBy),
    bottom: dataStore.getBottomPerformers(sortBy),
  });
});

// Section 9: Content Pattern Analysis
app.get('/api/v1/intelligence/patterns', (req, res) => {
  jsonResponse(res, dataStore.getContentPatterns());
});

// Comprehensive Archive Audit (All Posts & All Reels)
app.get('/api/v1/intelligence/archive-audit', (req, res) => {
  jsonResponse(res, dataStore.getComprehensiveArchiveAnalysis());
});

// Ask Media Navigator (AI Q&A based on REAL data)
app.post('/api/v1/intelligence/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      return errorResponse(res, 'Question is required', 'BAD_REQUEST', 400);
    }

    const connected = dataStore.getConnections().filter(c => c.connected);
    const media = dataStore.getMedia();

    let contextSummary = '';
    if (connected.length === 0 || media.length === 0) {
      contextSummary = 'No media accounts connected or no media posts found yet. Media Navigator has 0 connected channels and 0 analyzed assets.';
    } else {
      const archive = dataStore.getComprehensiveArchiveAnalysis();
      const topItems = [...media].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 5);
      const bottomItems = [...media].sort((a, b) => a.engagementRate - b.engagementRate).slice(0, 5);

      const topItemDesc = topItems.map((t, idx) => `#${idx + 1}: "${t.title}" (${t.platform} ${t.contentType}, ${t.engagementRate}% eng, ${t.views} views, ${t.likes} likes, ${t.comments} comments)`).join('\n');
      const bottomItemDesc = bottomItems.map((b, idx) => `#${idx + 1}: "${b.title}" (${b.platform} ${b.contentType}, ${b.engagementRate}% eng, ${b.views} views, ${b.likes} likes, ${b.comments} comments)`).join('\n');

      const formatBreakdown = archive.formats.map(f => `${f.format.toUpperCase()}: ${f.count} items (${f.percentageOfLibrary}% of library), avg eng: ${f.avgEngagement}%, avg views: ${f.avgViews}, avg comments: ${f.avgComments}`).join('; ');

      contextSummary = `
Connected Channels: ${connected.map(c => `${c.name} (@${c.accountHandle || c.name})`).join(', ')}
Total Published Assets Analyzed (Complete Archive): ${archive.totalAnalyzed} (Reels: ${archive.totalReels}, Posts/Carousels: ${archive.totalPostsAndCarousels})
Aggregate Verified Views: ${archive.totalVerifiedViews.toLocaleString()}
Aggregate Interactions: ${archive.totalInteractions.toLocaleString()}
Library-Wide Average Engagement: ${archive.avgEngagementRate}%
Format Performance Breakdown: ${formatBreakdown}
Question Hook Impact: Posts with "?" have ${archive.captionAnalysis.questionHook.avgEngagementWithQuestion}% avg eng vs ${archive.captionAnalysis.questionHook.avgEngagementWithoutQuestion}% without.
Top 5 Performing Assets:
${topItemDesc}
Bottom 5 Performing Assets:
${bottomItemDesc}
`;
    }

    const result = await askMediaNavigator(question, contextSummary);
    jsonResponse(res, result);
  } catch (err: any) {
    errorResponse(res, err.message || 'Failed to process AI query');
  }
});

// Deep dive item analysis
app.post('/api/v1/intelligence/analyze-item', async (req, res) => {
  try {
    const { mediaId } = req.body;
    const media = dataStore.getMediaById(mediaId);
    if (!media) {
      return errorResponse(res, 'Media not found', 'NOT_FOUND', 404);
    }
    const result = await generateContentInsight({
      title: media.title,
      platform: media.platform,
      views: media.views,
      reach: media.reach,
      engagementRate: media.engagementRate,
      shares: media.shares,
      contentType: media.contentType,
    });
    jsonResponse(res, result);
  } catch (err: any) {
    errorResponse(res, err.message || 'Failed to generate content insight');
  }
});

// Deep AI Post Diagnosis (Why it worked / Why it didn't work)
app.post('/api/v1/intelligence/diagnose-post', async (req, res) => {
  try {
    const { mediaId } = req.body;
    if (!mediaId) {
      return errorResponse(res, 'mediaId is required', 'BAD_REQUEST', 400);
    }
    const media = dataStore.getMediaById(mediaId);
    if (!media) {
      return errorResponse(res, 'Media not found', 'NOT_FOUND', 404);
    }
    const allMedia = dataStore.getMedia();
    const totalViews = allMedia.reduce((sum, m) => sum + (m.views || 0), 0);
    const avgViews = allMedia.length > 0 ? Math.round(totalViews / allMedia.length) : media.views;
    const totalEng = allMedia.reduce((sum, m) => sum + (m.engagementRate || 0), 0);
    const avgEngagement = allMedia.length > 0 ? totalEng / allMedia.length : media.engagementRate;

    const diagnosis = await deepDiagnosePostAI(media, {
      avgViews,
      avgEngagement,
      totalAnalyzed: allMedia.length,
    });
    jsonResponse(res, diagnosis);
  } catch (err: any) {
    errorResponse(res, err.message || 'Failed to diagnose media post');
  }
});

// Recommendations
app.get('/api/v1/recommendations', (req, res) => {
  jsonResponse(res, {
    title: 'What should you do next?',
    items: dataStore.getRecommendations(),
  });
});

app.post('/api/v1/recommendations/:id/plan', (req, res) => {
  const planned = dataStore.planRecommendation(req.params.id);
  if (!planned) {
    return errorResponse(res, 'Recommendation not found or cannot be planned', 'BAD_REQUEST', 400);
  }
  jsonResponse(res, planned, 'Added recommendation to Content Planner');
});

// Trends
app.get('/api/v1/trends', (req, res) => {
  jsonResponse(res, {
    title: "What's changing?",
    trends: dataStore.getTrends(),
  });
});

// Content Planner
app.get('/api/v1/planner', (req, res) => {
  jsonResponse(res, dataStore.getPlannedContent());
});

app.post('/api/v1/planner', (req, res) => {
  const { day, time, platform, contentType, title } = req.body;
  if (!day || !time || !platform || !title) {
    return errorResponse(res, 'Missing required fields for content planner', 'BAD_REQUEST', 400);
  }
  const created = dataStore.addPlannedContent({
    day,
    time,
    platform,
    contentType: contentType || 'Post',
    title,
    status: 'scheduled',
  });
  jsonResponse(res, created, 'Added item to planner');
});

app.delete('/api/v1/planner/:id', (req, res) => {
  dataStore.removePlannedContent(req.params.id);
  jsonResponse(res, { id: req.params.id }, 'Removed planned item');
});

// Alerts
app.get('/api/v1/alerts', (req, res) => {
  jsonResponse(res, dataStore.getAlerts());
});

app.post('/api/v1/alerts/:id/dismiss', (req, res) => {
  const dismissed = dataStore.dismissAlert(req.params.id);
  if (!dismissed) {
    return errorResponse(res, 'Alert not found', 'NOT_FOUND', 404);
  }
  jsonResponse(res, dismissed, 'Alert dismissed');
});

// Vite & Static Serving Setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Media Navigator server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };
