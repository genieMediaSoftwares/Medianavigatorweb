import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/response.js';
import { mediaService } from '../services/media.service.js';

export const mediaController = {
  list: asyncHandler(async (req, res) => {
    const out = await mediaService.page(req.auth!.userId, req.query as any);
    ok(res, out.items, 200, { limit: out.limit, nextCursor: out.nextCursor });
  }),
  get: asyncHandler(async (req, res) => ok(res, await mediaService.get(req.auth!.userId, req.params.id))),
};
