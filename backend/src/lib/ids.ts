import mongoose from 'mongoose';
import { badRequest } from './errors.js';

export const isObjectId = (v: unknown): v is string => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);

export function toObjectId(v: unknown, label = 'id'): mongoose.Types.ObjectId {
  if (!isObjectId(v)) throw badRequest(`Invalid ${label}`);
  return new mongoose.Types.ObjectId(v);
}
