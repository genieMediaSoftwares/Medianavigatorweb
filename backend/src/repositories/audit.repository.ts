import type { Types } from 'mongoose';
import { AuditLog, type AuditLogDoc } from '../models/AuditLog.js';
import { toObjectId } from '../lib/ids.js';

export const auditRepository = {
  record: (data: { actorId?: Types.ObjectId | null; action: string; targetType?: string; targetId?: string; ip?: string; requestId?: string; meta?: Record<string, unknown> }) =>
    AuditLog.create(data),
  async page(params: { limit: number; cursor?: { t: number; id: string }; action?: string }) {
    const filter: Record<string, unknown> = {};
    if (params.action) filter.action = params.action;
    if (params.cursor) {
      filter.$or = [
        { createdAt: { $lt: new Date(params.cursor.t) } },
        { createdAt: new Date(params.cursor.t), _id: { $lt: toObjectId(params.cursor.id) } },
      ];
    }
    return AuditLog.find(filter).sort({ createdAt: -1, _id: -1 }).limit(params.limit + 1).lean<AuditLogDoc[]>();
  },
};
