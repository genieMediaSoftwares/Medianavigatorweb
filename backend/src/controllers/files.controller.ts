import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/response.js';
import { badRequest } from '../lib/errors.js';
import { clampLimit, decodeCursor } from '../lib/pagination.js';
import { fileService } from '../services/file.service.js';

const uid = (req: any) => req.auth!.userId as string;

export const filesController = {
  upload: asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('A "file" field is required');
    ok(res, await fileService.upload(uid(req), req.file, (req.body as any).purpose), 201);
  }),
  list: asyncHandler(async (req, res) => {
    const q = req.query as any;
    const limit = clampLimit(q.limit);
    const out = await fileService.list(uid(req), limit, decodeCursor(q.cursor));
    ok(res, out.items, 200, { limit, nextCursor: out.nextCursor });
  }),
  get: asyncHandler(async (req, res) => ok(res, await fileService.accessUrl(uid(req), req.params.id))),
  remove: asyncHandler(async (req, res) => ok(res, await fileService.remove(uid(req), req.params.id))),
};
