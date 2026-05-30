/**
 * Single source of truth for content + OAuth platforms (SaaS MVP).
 */

/** Lightweight social post (LinkedIn/Threads style) vs long-form article. */
export type PlatformPublishStyle = 'social_post' | 'long_form';

export interface PlatformCatalogEntry {
  id: string;
  label: string;
  icon: string;
  connectable: boolean;
  authMethod: 'oauth2' | 'api_key';
  comingSoon?: boolean;
  /** How content is published — keeps YouTube scoped to Community posts only. */
  publishStyle: PlatformPublishStyle;
  /** Short UI/docs hint (optional). */
  description?: string;
  workflowName: string;
  maxChars: number;
}

export const PLATFORM_CATALOG: PlatformCatalogEntry[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: 'in',
    connectable: true,
    authMethod: 'oauth2' as const,
    publishStyle: 'social_post',
    workflowName: 'LinkedIn',
    maxChars: 300,
  },
  {
    id: 'facebook',
    label: 'Facebook Pages',
    icon: 'fb',
    connectable: true,
    authMethod: 'oauth2' as const,
    publishStyle: 'social_post',
    workflowName: 'Facebook',
    maxChars: 200,
  },
  {
    id: 'instagram',
    label: 'Instagram Business',
    icon: 'ig',
    connectable: true,
    authMethod: 'oauth2' as const,
    publishStyle: 'social_post',
    workflowName: 'Instagram',
    maxChars: 150,
  },
  {
    id: 'threads',
    label: 'Threads',
    icon: '@',
    connectable: true,
    authMethod: 'oauth2' as const,
    publishStyle: 'social_post',
    workflowName: 'Threads',
    maxChars: 100,
  },
  {
    id: 'devto',
    label: 'Dev.to',
    icon: '{ }',
    connectable: true,
    authMethod: 'api_key' as const,
    publishStyle: 'long_form',
    workflowName: 'Dev.to',
    maxChars: 400,
  },
  {
    id: 'youtube',
    label: 'YouTube Community',
    icon: '▶',
    connectable: true,
    authMethod: 'oauth2' as const,
    comingSoon: true,
    publishStyle: 'social_post',
    description:
      'Text and optional image posts on the Community tab — not video, Shorts, or uploads.',
    workflowName: 'YouTube Community',
    maxChars: 280,
  },
  {
    id: 'producthunt',
    label: 'Product Hunt',
    icon: 'PH',
    connectable: true,
    authMethod: 'oauth2' as const,
    comingSoon: true,
    publishStyle: 'social_post',
    workflowName: 'Product Hunt',
    maxChars: 260,
  },
];

export type PlatformId =
  | 'linkedin'
  | 'facebook'
  | 'instagram'
  | 'threads'
  | 'devto'
  | 'youtube'
  | 'producthunt';

export type ConnectablePlatform = PlatformId;

export const CONNECTABLE_PLATFORMS = PLATFORM_CATALOG.filter(
  (p) => p.connectable
).map((p) => p.id) as ConnectablePlatform[];

export const PLATFORMS = PLATFORM_CATALOG.map((p) => ({
  id: p.id,
  label: p.label,
  icon: p.icon,
}));

export function getPlatformMeta(id: string) {
  return PLATFORM_CATALOG.find((p) => p.id === id);
}

export function isValidPlatform(value: string): value is PlatformId {
  return PLATFORM_CATALOG.some((p) => p.id === value);
}

export function isConnectablePlatformId(
  value: string
): value is ConnectablePlatform {
  return CONNECTABLE_PLATFORMS.includes(value as ConnectablePlatform);
}

export function isPlatformComingSoon(platform: string): boolean {
  return getPlatformMeta(platform)?.comingSoon === true;
}

export function supportsOAuthConnect(platform: string): boolean {
  const meta = getPlatformMeta(platform);
  return Boolean(meta?.connectable && meta.authMethod === 'oauth2');
}

export function supportsPublishConnect(platform: string): boolean {
  const meta = getPlatformMeta(platform);
  return Boolean(meta?.connectable && !meta.comingSoon);
}

/** YouTube is Community-tab social posts only — never video/Shorts/upload pipelines. */
export function isYouTubeCommunityPlatform(platform: string): boolean {
  return platform === 'youtube';
}

export function getPlatformDescription(platform: string): string | undefined {
  return getPlatformMeta(platform)?.description;
}

/** Specs injected into n8n Platform Prompt Builder (keep in sync with workflow.json). */
export function getWorkflowPlatformSpecs(): Record<
  string,
  { name: string; max: number; promptHint?: string }
> {
  return Object.fromEntries(
    PLATFORM_CATALOG.map((p) => [
      p.id,
      {
        name: p.workflowName,
        max: p.maxChars,
        ...(p.id === 'youtube'
          ? {
              promptHint:
                'Community tab text/image post only. Do not mention video uploads, Shorts, thumbnails, or studio publishing.',
            }
          : {}),
      },
    ])
  );
}
