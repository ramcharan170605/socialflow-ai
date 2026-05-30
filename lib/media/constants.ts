/** Max single image size (5 MB). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Max images per composer submission. */
export const MAX_IMAGES_PER_POST = 4;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
] as const;

export const UPLOAD_ROOT = process.env.MEDIA_UPLOAD_DIR ?? 'data/uploads';
