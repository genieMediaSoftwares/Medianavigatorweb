import crypto from 'node:crypto';
import path from 'node:path';
import type { Types } from 'mongoose';
import { config } from '../config/env.js';
import { AppError, badRequest, notFound } from '../lib/errors.js';
import { toObjectId } from '../lib/ids.js';
import { buildKey, deleteObject, presignedDownloadUrl, putObject, storageEnabled } from '../lib/storage.js';
import { fileRepository } from '../repositories/file.repository.js';
import type { FileDoc } from '../models/File.js';
import { unavailable } from '../lib/errors.js';
import { encodeCursor } from '../lib/pagination.js';

const EXT_BY_MIME: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'], 'image/gif': ['.gif'],
  'application/pdf': ['.pdf'], 'video/mp4': ['.mp4'], 'text/csv': ['.csv'], 'text/plain': ['.txt'],
};

const startsWith = (b: Buffer, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);
const MAGIC: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  'image/png': (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47]),
  'image/gif': (b) => startsWith(b, [0x47, 0x49, 0x46, 0x38]),
  'image/webp': (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  'application/pdf': (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]),
  'video/mp4': (b) => startsWith(b, [0x66, 0x74, 0x79, 0x70], 4),
};

const view = (f: FileDoc) => ({ id: String(f._id), name: f.originalName, mimeType: f.mimeType, size: f.size, purpose: f.purpose, createdAt: f.createdAt });

export const fileService = {
  enabled: storageEnabled,

  async upload(userId: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number }, purpose: FileDoc['purpose']) {
    if (!storageEnabled()) throw unavailable('File storage is not configured on this server');
    if (file.size > config.storage.maxFileBytes) throw new AppError('PAYLOAD_TOO_LARGE', 'File exceeds the maximum allowed size');
    const mime = file.mimetype.toLowerCase();
    if (!config.storage.allowedMimeTypes.includes(mime) || !EXT_BY_MIME[mime]) throw badRequest(`File type ${mime} is not allowed`);
    const ext = path.extname(file.originalname).toLowerCase();
    if (!EXT_BY_MIME[mime].includes(ext)) throw badRequest('File extension does not match its type');
    const sniff = MAGIC[mime];
    if (sniff && !sniff(file.buffer)) throw badRequest('File contents do not match the declared type');

    const key = buildKey(userId, purpose, ext);
    await putObject(key, file.buffer, mime);
    const doc = await fileRepository.create({
      userId: toObjectId(userId), key, originalName: path.basename(file.originalname).slice(0, 255), mimeType: mime, size: file.size, purpose,
      checksum: crypto.createHash('sha256').update(file.buffer).digest('hex'),
    });
    return view(doc);
  },

  async list(userId: string, limit: number, cursor?: { t: number; id: string }) {
    const rows = await fileRepository.page(toObjectId(userId), { limit, cursor });
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return { items: items.map(view), nextCursor: rows.length > limit && last ? encodeCursor({ t: last.createdAt.getTime(), id: String(last._id) }) : null };
  },

  async get(userId: string, id: string) {
    const f = await fileRepository.findOwned(toObjectId(userId), id);
    if (!f) throw notFound('File not found');
    return f;
  },

  async accessUrl(userId: string, id: string) {
    const f = await fileService.get(userId, id);
    return { ...view(f), url: await presignedDownloadUrl(f.key, f.originalName), expiresInSeconds: config.storage.presignTtlSeconds };
  },

  async remove(userId: string, id: string) {
    const f = await fileService.get(userId, id);
    await deleteObject(f.key);
    await fileRepository.markDeleted(f.userId as Types.ObjectId, f._id);
    return { id };
  },
};
