export {
  PLATFORM_CATALOG,
  PLATFORMS,
  type PlatformId,
  type PlatformPublishStyle,
  isValidPlatform,
  getPlatformMeta,
  getPlatformDescription,
  isYouTubeCommunityPlatform,
} from './platforms/catalog';

import type { PlatformId } from './platforms/catalog';
import { getPlatformMeta, PLATFORM_CATALOG } from './platforms/catalog';

const PLATFORM_GUIDES: Record<PlatformId, string> = {
  linkedin:
    'Write a professional LinkedIn post with structured insights, industry relevance, and a clear CTA. Use line breaks. 3-5 hashtags at the end.',
  facebook:
    'Write a friendly Facebook Page post that encourages comments. Conversational tone, 2-4 hashtags.',
  instagram:
    'Write an Instagram Business caption with a strong hook, emoji where natural, line breaks, and 10-15 hashtags in a separate block.',
  threads:
    'Write a casual Threads micro-post. Concise, conversational, 2-3 hashtags.',
  devto:
    'Write a Dev.to post intro: developer-focused, accessible, with suggested tags at the end.',
  youtube:
    'Write a YouTube Community tab post (text-first, optional single image reference). Conversational like LinkedIn or Threads. Do not suggest uploading videos, Shorts, thumbnails, or studio workflows.',
  producthunt:
    'Write a Product Hunt launch-style post: problem, solution, unique value. Exciting but credible.',
};

export function optimizePromptForPlatform(
  userPrompt: string,
  platform: PlatformId
): string {
  const guide = PLATFORM_GUIDES[platform] ?? PLATFORM_GUIDES.linkedin;
  return `${userPrompt.trim()}\n\n[Platform optimization: ${guide}]`;
}

export function getPlatformLabel(platformId: string): string {
  return getPlatformMeta(platformId)?.label ?? platformId;
}

export function listPlatformsForSelect(): Array<{
  id: PlatformId;
  label: string;
  icon: string;
}> {
  return PLATFORM_CATALOG.map((p) => ({
    id: p.id as PlatformId,
    label: p.label,
    icon: p.icon,
  }));
}
