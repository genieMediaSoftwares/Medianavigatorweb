import { asyncHandler } from '../lib/asyncHandler.js';
import { ok } from '../lib/response.js';
import { clampLimit, decodeCursor, encodeCursor } from '../lib/pagination.js';
import { notificationService } from '../services/notification.service.js';

const uid = (req: any) => req.auth!.userId as string;

export const notificationsController = {
  list: asyncHandler(async (req, res) => {
    const q = req.query as any;
    const limit = clampLimit(q.limit);
    const out = await notificationService.page(uid(req), { limit, cursor: decodeCursor(q.cursor), unreadOnly: q.unreadOnly });
    const next = out.hasMore && out.last ? encodeCursor({ t: out.last.createdAt.getTime(), id: String(out.last._id) }) : null;
    ok(res, out.items, 200, { limit, nextCursor: next });
  }),
  unreadCount: asyncHandler(async (req, res) => ok(res, { unread: await notificationService.unreadCount(uid(req)) })),
  markRead: asyncHandler(async (req, res) => ok(res, await notificationService.markRead(uid(req), req.params.id))),
  markAllRead: asyncHandler(async (req, res) => { await notificationService.markAllRead(uid(req)); ok(res, { done: true }); }),
  alerts: asyncHandler(async (req, res) => ok(res, await notificationService.alerts(uid(req)))),
  dismissAlert: asyncHandler(async (req, res) => ok(res, await notificationService.markRead(uid(req), req.params.id))),
};
