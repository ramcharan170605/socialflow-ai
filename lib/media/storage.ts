import { mkdir, writeFile, readFile, access } from 'fs/promises';
import { createHmac, timingSafeEqual } from 'crypto';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UPLOAD_ROOT } from './constants';
import type { MediaAsset, StoredMediaRecord } from './types';

function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '.bin';
  }
}

function publicBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    'http://localhost:3000'
  );
}

function internalBaseUrl(): string {
  return (
    process.env.MEDIA_INTERNAL_BASE_URL?.replace(/\/$/, '') ??
    publicBaseUrl()
  );
}

function mediaSigningSecret(): string | undefined {
  return (
    process.env.MEDIA_URL_SIGNING_SECRET ??
    process.env.N8N_API_KEY ??
    process.env.NEXTAUTH_SECRET ??
    process.env.CLERK_SECRET_KEY
  );
}

function mediaAccessToken(userId: string, mediaId: string): string | undefined {
  const secret = mediaSigningSecret();
  if (!secret) return undefined;

  return createHmac('sha256', secret)
    .update(`${userId}:${mediaId}`)
    .digest('base64url');
}

export function verifyMediaAccessToken(
  userId: string,
  mediaId: string,
  token: string | null
): boolean {
  const expected = mediaAccessToken(userId, mediaId);
  if (!expected || !token) return false;

  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);
  return (
    expectedBuffer.length === tokenBuffer.length &&
    timingSafeEqual(expectedBuffer, tokenBuffer)
  );
}

export function buildMediaUrls(userId: string, mediaId: string): {
  url: string;
  internalUrl: string;
} {
  const segment = `/api/media/${userId}/${mediaId}`;
  const token = mediaAccessToken(userId, mediaId);
  const publicUrl = `${publicBaseUrl()}${segment}`;

  return {
    url: token ? `${publicUrl}?token=${token}` : publicUrl,
    internalUrl: `${internalBaseUrl()}${segment}`,
  };
}

export async function saveUserMedia(
  userId: string,
  file: { buffer: Buffer; mimeType: string; originalName: string; size: number }
): Promise<StoredMediaRecord> {
  const mediaId = uuidv4();
  const ext = extensionForMime(file.mimeType);
  const dir = path.join(process.cwd(), UPLOAD_ROOT, userId);
  await mkdir(dir, { recursive: true });

  const filename = `${mediaId}${ext}`;
  const storagePath = path.join(dir, filename);
  await writeFile(storagePath, file.buffer);

  const { url, internalUrl } = buildMediaUrls(userId, mediaId);

  return {
    id: mediaId,
    userId,
    filename: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    url,
    internalUrl,
    storagePath,
  };
}

export async function readUserMedia(
  userId: string,
  mediaId: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const dir = path.join(process.cwd(), UPLOAD_ROOT, userId);
  const candidates = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].map((ext) =>
    path.join(dir, `${mediaId}${ext}`)
  );

  for (const filePath of candidates) {
    try {
      await access(filePath);
      const buffer = await readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.gif'
              ? 'image/gif'
              : 'image/jpeg';
      return { buffer, mimeType };
    } catch {
      // try next extension
    }
  }
  return null;
}

export function toMediaAsset(record: StoredMediaRecord): MediaAsset {
  const { userId: _u, storagePath: _s, ...asset } = record;
  return asset;
}
