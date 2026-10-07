import crypto from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/env.js';
import { unavailable } from './errors.js';

let client: S3Client | null = null;

function r2() {
  const cfg = config.storage.r2;
  if (!cfg) throw unavailable('File storage is not configured on this server');
  client ??= new S3Client({
    region: 'auto',
    endpoint: cfg.endpoint,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    requestHandler: { requestTimeout: config.providers.timeoutMs } as any,
    maxAttempts: config.providers.maxRetries + 1,
  });
  return { s3: client, bucket: cfg.bucket };
}

export const storageEnabled = () => Boolean(config.storage.r2);

/** Object keys are generated here and never derived from client-supplied names. */
export function buildKey(userId: string, purpose: string, ext: string): string {
  return `users/${userId}/${purpose}/${crypto.randomUUID()}${ext}`;
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const { s3, bucket } = r2();
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function deleteObject(key: string): Promise<void> {
  const { s3, bucket } = r2();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** Short-lived download URL. Bucket stays private; URLs are minted only after an ownership check. */
export async function presignedDownloadUrl(key: string, filename?: string): Promise<string> {
  const { s3, bucket } = r2();
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentDisposition: filename ? `attachment; filename="${encodeURIComponent(filename)}"` : undefined }),
    { expiresIn: config.storage.presignTtlSeconds },
  );
}
