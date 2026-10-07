import { Router } from 'express';
import { dataStore } from '../services/dataStore.js';
import { jsonResponse, errorResponse } from '../lib/response.js';

export const router = Router();

// Workspace
router.get('/workspaces', (req, res) => {
  jsonResponse(res, dataStore.getWorkspace());
});

// Platform Connections
router.get('/connections', (req, res) => {
  jsonResponse(res, dataStore.getConnections());
});

// Connect platform with real credentials
router.post('/connections/:platform/connect', async (req, res) => {
  const { platform } = req.params;
  const credentials = req.body || {};

  try {
    const result = await dataStore.connectAndSyncPlatform(platform as any, credentials);
    if (!result.success) {
      return errorResponse(res, result.message, 'CONNECTION_FAILED', 400);
    }
    jsonResponse(res, {
      ...result.connection,
      media: (result as any).media || [],
      mediaCount: (result as any).mediaCount || 0,
    }, result.message);
  } catch (err: any) {
    errorResponse(res, err.message || `Failed to connect ${platform}`, 'CONNECTION_ERROR', 500);
  }
});

// Sync platform using saved or provided credentials
router.post('/connections/:platform/sync', async (req, res) => {
  const { platform } = req.params;
  const clientCreds = req.body || {};

  try {
    const result = await dataStore.syncPlatform(platform as any, clientCreds);
    if (!result.success) {
      return errorResponse(res, result.message, 'SYNC_FAILED', 400);
    }
    jsonResponse(res, {
      ...result.connection,
      media: (result as any).media || [],
      mediaCount: (result as any).mediaCount || 0,
    }, result.message);
  } catch (err: any) {
    errorResponse(res, err.message || `Failed to sync ${platform}`, 'SYNC_ERROR', 500);
  }
});

// Sync all connected platforms
router.post('/connections/sync-all', async (req, res) => {
  try {
    const connections = dataStore.getConnections().filter(c => c.connected);
    let totalSynced = 0;
    for (const c of connections) {
      try {
        const resSync = await dataStore.syncPlatform(c.platform as any);
        if (resSync.success) {
          totalSynced += (resSync as any).mediaCount || (resSync as any).media?.length || 0;
        }
      } catch (e) {
        console.warn(`[Sync All] Failed to sync ${c.platform}:`, e);
      }
    }
    const currentMedia = dataStore.getMedia();
    jsonResponse(res, {
      connections: dataStore.getConnections(),
      media: currentMedia,
      mediaCount: currentMedia.length,
    }, `Successfully synchronized ${currentMedia.length} verified media assets.`);
  } catch (err: any) {
    errorResponse(res, err.message || 'Failed to sync all channels', 'SYNC_ALL_ERROR', 500);
  }
});

// Disconnect platform
router.post('/connections/:platform/disconnect', (req, res) => {
  const { platform } = req.params;
  try {
    const conn = dataStore.disconnectPlatform(platform as any);
    jsonResponse(res, conn, `Disconnected ${platform}`);
  } catch (err: any) {
    errorResponse(res, err.message, 'DISCONNECT_ERROR', 404);
  }
});

// Auto-fetch YouTube Channel endpoint
router.post('/youtube/fetch-channel', async (req, res) => {
  const { apiKey, accessToken, channelQuery, channelId } = req.body || {};
  try {
    const channel = await dataStore.fetchYouTubeChannel({ apiKey, accessToken, channelQuery, channelId });
    jsonResponse(res, channel, 'YouTube channel fetched successfully');
  } catch (err: any) {
    errorResponse(res, err.message || 'Failed to auto-fetch YouTube channel', 'YOUTUBE_FETCH_FAILED', 400);
  }
});
