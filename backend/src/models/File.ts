import { Schema, model, type Types } from 'mongoose';

export interface FileDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
  purpose: 'avatar' | 'media' | 'document';
  status: 'ready' | 'deleted';
  checksum: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<FileDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    key: { type: String, required: true },
    originalName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    purpose: { type: String, enum: ['avatar', 'media', 'document'], required: true },
    status: { type: String, enum: ['ready', 'deleted'], default: 'ready' },
    checksum: { type: String, required: true },
  },
  { timestamps: true },
);
schema.index({ key: 1 }, { unique: true });
schema.index({ userId: 1, status: 1, createdAt: -1 });

export const FileModel = model<FileDoc>('File', schema);
