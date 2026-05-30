import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_POST,
  type AllowedImageMimeType,
} from './constants';

export function isAllowedImageMime(mime: string): mime is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
}

export interface ImageValidationResult {
  ok: boolean;
  error?: string;
}

export function validateImageFile(
  file: { name: string; type: string; size: number },
  index: number
): ImageValidationResult {
  if (!isAllowedImageMime(file.type)) {
    return {
      ok: false,
      error: `"${file.name}" is not allowed. Use JPEG, PNG, WebP, or GIF.`,
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: `"${file.name}" exceeds ${MAX_IMAGE_BYTES / (1024 * 1024)}MB limit.`,
    };
  }
  if (index >= MAX_IMAGES_PER_POST) {
    return {
      ok: false,
      error: `Maximum ${MAX_IMAGES_PER_POST} images per post.`,
    };
  }
  return { ok: true };
}

export function validateImageBatch(
  files: { name: string; type: string; size: number }[]
): ImageValidationResult {
  if (files.length > MAX_IMAGES_PER_POST) {
    return {
      ok: false,
      error: `Maximum ${MAX_IMAGES_PER_POST} images per post.`,
    };
  }
  for (let i = 0; i < files.length; i++) {
    const result = validateImageFile(files[i], i);
    if (!result.ok) return result;
  }
  return { ok: true };
}
