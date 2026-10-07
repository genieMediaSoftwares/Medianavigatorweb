import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/response.js';
import { clampLimit, decodeCursor } from '../lib/pagination.js';
import { adminService } from '../services/admin.service.js';

const actor = (req: any) => ({ userId: req.auth!.userId as string, requestId: req.requestId as string, ip: req.ip as string | undefined });
const paged = (req: any) => { const q = req.query; const limit = clampLimit(q.limit); return { ...q, limit, cursor: decodeCursor(q.cursor) }; };
const send = (res: any, out: { items: unknown[]; nextCursor: string | null; limit: number } & Record<string, unknown>) => {
  const { items, nextCursor, limit, ...rest } = out;
  ok(res, items, 200, { limit, nextCursor, ...(typeof rest.total === 'number' ? { total: rest.total } : {}) });
};

export const adminController = {
  system: asyncHandler(async (_req, res) => ok(res, await adminService.system())),
  users: asyncHandler(async (req, res) => send(res, await adminService.users(paged(req)))),
  user: asyncHandler(async (req, res) => ok(res, await adminService.userDetail(req.params.id))),
  setRole: asyncHandler(async (req, res) => ok(res, await adminService.setRole(actor(req), req.params.id, req.body.role))),
  setStatus: asyncHandler(async (req, res) => ok(res, await adminService.setStatus(actor(req), req.params.id, req.body.status))),
  connections: asyncHandler(async (req, res) => send(res, await adminService.connections(paged(req)))),
  syncRuns: asyncHandler(async (req, res) => send(res, await adminService.syncRuns(paged(req)))),
  triggerSync: asyncHandler(async (req, res) => ok(res, await adminService.triggerSync(actor(req), req.params.id), 202)),
  audit: asyncHandler(async (req, res) => send(res, await adminService.audit(paged(req)))),
};
