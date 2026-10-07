import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/response.js';
import { badRequest } from '../lib/errors.js';
import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { connectionService } from '../services/connection.service.js';
import { oauthService } from '../services/oauth.service.js';
import { getAdapter } from '../integrations/registry.js';
import { YouTubeClient } from '../integrations/youtube/youtubeClient.js';
import type { PlatformType } from '../../../shared/types.js';

export const connectionsController = {
  list: asyncHandler(async (req, res) => ok(res, await connectionService.list(req.auth!.userId))),

  connect: asyncHandler(async (req, res) =>
    ok(res, await connectionService.connectWithCredentials(req.auth!.userId, req.params.platform as PlatformType, req.body, req.requestId), 202)),

  sync: asyncHandler(async (req, res) => ok(res, await connectionService.requestSync(req.auth!.userId, req.params.platform as PlatformType, req.auth!.userId), 202)),
  syncAll: asyncHandler(async (req, res) => ok(res, await connectionService.requestSyncAll(req.auth!.userId), 202)),
  syncRun: asyncHandler(async (req, res) => ok(res, await connectionService.getRun(req.auth!.userId, req.params.id))),
  disconnect: asyncHandler(async (req, res) => ok(res, await connectionService.disconnect(req.auth!.userId, req.params.platform as PlatformType, req.requestId))),

  capabilities: asyncHandler(async (req, res) => ok(res, getAdapter(req.params.platform).capabilities)),

  oauthStart: asyncHandler(async (req, res) => ok(res, await oauthService.start(req.auth!.userId, req.params.platform as PlatformType))),

  /**
   * Browser redirect target (no Authorization header). Identity comes from the single-use state created in oauthStart.
   * The user is always sent back to the web app; tokens are never placed in the redirect.
   */
  oauthCallback: asyncHandler(async (req, res) => {
    const platform = req.params.platform as PlatformType;
    const back = (params: Record<string, string>) => {
      const url = new URL('/connections', config.server.webAppUrl);
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      res.redirect(302, url.toString());
    };
    const { code, state, error } = req.query as { code?: string; state: string; error?: string };
    if (error || !code) {
      logger.warn('oauth callback without code', { operation: 'oauth', provider: platform, requestId: req.requestId });
      return back({ oauth: 'denied', platform });
    }
    try {
      const done = await oauthService.complete(platform, code, state);
      await connectionService.finishConnect(done.userId, platform, done.credentials, undefined, req.requestId);
      back({ oauth: 'connected', platform });
    } catch (err) {
      logger.warn('oauth callback failed', { operation: 'oauth', provider: platform, requestId: req.requestId, error: err });
      back({ oauth: 'failed', platform });
    }
  }),

  /** Legacy helper: look up a YouTube channel with a key/token without connecting it. */
  youtubeLookup: asyncHandler(async (req, res) => {
    if (!req.body.apiKey && !req.body.accessToken) throw badRequest('apiKey or accessToken is required');
    ok(res, await new YouTubeClient().getChannel(req.body));
  }),
};
