import { Schema, model, type Types } from 'mongoose';
import type { Role } from '../types/auth.js';

export interface UserDoc {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: Role;
  status: 'active' | 'disabled';
  failedLoginCount: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  passwordChangedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user', required: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', required: true },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
schema.index({ email: 1 }, { unique: true });
schema.index({ createdAt: -1 });
schema.index({ role: 1, status: 1 });

export const User = model<UserDoc>('User', schema);
