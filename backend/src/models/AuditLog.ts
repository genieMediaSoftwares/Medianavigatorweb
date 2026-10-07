import { Schema, model, type Types } from 'mongoose';

export interface AuditLogDoc {
  _id: Types.ObjectId;
  actorId?: Types.ObjectId | null;
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  requestId?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

const schema = new Schema<AuditLogDoc>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true, maxlength: 80 },
    targetType: { type: String, maxlength: 40 },
    targetId: { type: String, maxlength: 80 },
    ip: { type: String, maxlength: 64 },
    requestId: { type: String, maxlength: 64 },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ createdAt: -1 });
schema.index({ actorId: 1, createdAt: -1 });
schema.index({ action: 1, createdAt: -1 });

export const AuditLog = model<AuditLogDoc>('AuditLog', schema);
