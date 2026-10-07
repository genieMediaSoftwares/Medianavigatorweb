import { Router } from 'express';
import { dataStore } from '../services/dataStore.js';
import { askMediaNavigator, generateContentInsight, deepDiagnosePostAI, deepAnalyzeVideoAI } from '../services/ai/geminiService.js';
import { jsonResponse, errorResponse } from '../lib/response.js';

export const router = Router();

// AI Intelligence Stream
router.get('/intelligence/signals', (req, res) => {
  jsonResponse(res, {
    title: 'What should you know right now?',
    insights: dataStore.getInsights(),
  });
});

// Section 4 & 5: Top & Bottom Performers
router.get('/intelligence/performers', (req, res) => {
  const sortBy = (req.query.sortBy as any) || 'views';
  jsonResponse(res, {
    top: dataStore.getTopPerformers(sortBy),
    bottom: dataStore.getBottomPerformers(sortBy),
  });
});

// Section 9: Content Pattern Analysis
router.get('/intelligence/patterns', (req, res) => {
  jsonResponse(res, dataStore.getContentPatterns());
});

// Comprehensive Archive Audit (All Posts & All Reels)
router.get('/intelligence/archive-audit', (req, res) => {
  jsonResponse(res, dataStore.getComprehensiveArchiveAnalysis());
});

// Ask Media Navigator (AI Q&A based on REAL data)
router.post('/intelligence/ask', async (req, res) => {
  try {
    const { question, contextSummary: clientContext } = req.body;
    if (!question || typeof question !== 'string') {
      return errorResponse(res, 'Question is required', 'BAD_REQUEST', 400);
    }

    const connected = dataStore.getConnections().filter(c => c.connected);
    const media = dataStore.getMedia();

    let contextSummary = clientContext || '';
    if (!contextSummary) {
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
    }

    const result = await askMediaNavigator(question, contextSummary);
    jsonResponse(res, result);
  } catch (err: any) {
    errorResponse(res, err.message || 'Failed to process AI query');
  }
});

// Deep dive item analysis
router.post('/intelligence/analyze-item', async (req, res) => {
  try {
    const { mediaId, media: clientMedia } = req.body || {};
    const media = dataStore.getMediaById(mediaId) || clientMedia;
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
router.post('/intelligence/diagnose-post', async (req, res) => {
  try {
    const { mediaId, media: clientMedia, forcedStatus } = req.body || {};
    if (!mediaId && !clientMedia) {
      return errorResponse(res, 'mediaId is required', 'BAD_REQUEST', 400);
    }
    const media = dataStore.getMediaById(mediaId) || clientMedia;
    if (!media) {
      return errorResponse(res, 'Media not found', 'NOT_FOUND', 404);
    }
    const allMedia = dataStore.getMedia();
    const totalViews = allMedia.reduce((sum, m) => sum + (m.views || 0), 0);
    const avgViews = allMedia.length > 0 ? Math.round(totalViews / allMedia.length) : (media.views || 100);
    const totalEng = allMedia.reduce((sum, m) => sum + (m.engagementRate || 0), 0);
    const avgEngagement = allMedia.length > 0 ? totalEng / allMedia.length : (media.engagementRate || 3.5);

    const diagnosis = await deepDiagnosePostAI(
      media, 
      {
        avgViews,
        avgEngagement,
        totalAnalyzed: allMedia.length || 1,
      },
      forcedStatus
    );
    jsonResponse(res, diagnosis);
  } catch (err: any) {
    errorResponse(res, err.message || 'Failed to diagnose media post');
  }
});

// Video & Reel AI Diagnostic Engine
router.post('/intelligence/analyze-video', async (req, res) => {
  try {
    const params = req.body || {};
    if (!params.title) {
      return errorResponse(res, 'Video title is required', 'BAD_REQUEST', 400);
    }
    const analysis = await deepAnalyzeVideoAI(params);
    jsonResponse(res, analysis);
  } catch (err: any) {
    errorResponse(res, err.message || 'Failed to analyze video with AI');
  }
});
