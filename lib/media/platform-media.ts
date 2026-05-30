import { getPlatformMeta } from '@/lib/platforms/catalog';
import { MAX_IMAGES_PER_POST } from './constants';

export interface PlatformMediaCapabilities {
  supportsImages: boolean;
  maxImages: number;
  imageFirst?: boolean;
  hint?: string;
}

const DEFAULT: PlatformMediaCapabilities = {
  supportsImages: false,
  maxImages: 0,
};

/** Per-platform image attachment rules (keep in sync with product docs). */
const PLATFORM_MEDIA: Record<string, PlatformMediaCapabilities> = {
  linkedin: {
    supportsImages: true,
    maxImages: 4,
    hint: 'LinkedIn supports image carousels with your post text.',
  },
  facebook: {
    supportsImages: true,
    maxImages: 4,
    hint: 'Facebook Page posts can include multiple photos.',
  },
  instagram: {
    supportsImages: true,
    maxImages: 10,
    imageFirst: true,
    hint: 'Instagram is image-first — add at least one photo for best results.',
  },
  threads: {
    supportsImages: true,
    maxImages: 4,
    hint: 'Threads supports photo attachments with your caption.',
  },
  devto: {
    supportsImages: true,
    maxImages: 1,
    hint: 'Dev.to accepts an optional cover image for articles.',
  },
  youtube: {
    supportsImages: true,
    maxImages: 1,
    hint: 'YouTube Community posts can include one image (no video uploads).',
  },
  producthunt: {
    supportsImages: true,
    maxImages: 1,
    hint: 'Product Hunt launches often include a thumbnail or gallery image.',
  },
};

export function getPlatformMediaCapabilities(
  platform: string
): PlatformMediaCapabilities {
  return PLATFORM_MEDIA[platform] ?? DEFAULT;
}

export function validatePlatformMediaCount(
  platform: string,
  imageCount: number
): { ok: true } | { ok: false; error: string } {
  if (imageCount === 0) return { ok: true };

  const caps = getPlatformMediaCapabilities(platform);
  if (!caps.supportsImages) {
    return {
      ok: false,
      error: `${getPlatformMeta(platform)?.label ?? platform} does not support image attachments.`,
    };
  }

  const max = Math.min(caps.maxImages, MAX_IMAGES_PER_POST);
  if (imageCount > max) {
    return {
      ok: false,
      error: `Maximum ${max} image(s) allowed for ${getPlatformMeta(platform)?.label ?? platform}.`,
    };
  }

  return { ok: true };
}

export function platformRecommendsImages(platform: string): boolean {
  return getPlatformMediaCapabilities(platform).imageFirst === true;
}
