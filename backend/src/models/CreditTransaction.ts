import { Schema, model, type Types } from 'mongoose';

/**
 * Append-only record of every change to a user's Insight Credits balance, written in the same request as the change.
 * Only `admin_adjustment` is written today: credit charging is not enabled, so no spend or refund rows exist. Balances
 * from before this ledger existed have no rows; the ledger never reconstructs or invents history.
 */
export type CreditTransactionKind = 'admin_adjustment';

export interface CreditTransactionDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  kind: CreditTransactionKind;
  delta: number;
  balanceAfter: number;
  reason: string | null;
  actorId: Types.ObjectId | null;
  requestId: string | null;
  createdAt: Date;
}

const schema = new Schema<CreditTransactionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: ['admin_adjustment'], required: true },
    delta: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, default: null, maxlength: 200 },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    requestId: { type: String, default: null, maxlength: 64 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
schema.index({ userId: 1, createdAt: -1, _id: -1 });

export const CreditTransaction = model<CreditTransactionDoc>('CreditTransaction', schema);
