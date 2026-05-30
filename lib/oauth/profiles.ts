import crypto from 'crypto';
import type { ConnectablePlatform, PlatformProfile } from './types';

export async function fetchPlatformProfile(
  platform: ConnectablePlatform,
  accessToken: string
): Promise<PlatformProfile> {
  switch (platform) {
    case 'linkedin':
      return fetchLinkedInProfile(accessToken);
    case 'facebook':
    case 'instagram':
    case 'threads':
      return fetchMetaProfile(platform, accessToken);
    case 'devto':
      return fetchDevToProfile(accessToken);
    case 'youtube':
      return fetchYouTubeProfilePlaceholder(accessToken);
    case 'producthunt':
      return fetchProductHuntProfilePlaceholder(accessToken);
    default:
      return { platformUserId: 'unknown' };
  }
}

async function fetchLinkedInProfile(
  accessToken: string
): Promise<PlatformProfile> {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch LinkedIn profile');
  const data = (await res.json()) as {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
  };
  return {
    platformUserId: data.sub,
    displayName: data.name,
    username: data.email,
    avatarUrl: data.picture,
  };
}

async function fetchMetaProfile(
  platform: ConnectablePlatform,
  accessToken: string
): Promise<PlatformProfile> {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=id,name,picture&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`Failed to fetch ${platform} profile`);
  const data = (await res.json()) as {
    id: string;
    name: string;
    picture?: { data?: { url?: string } };
  };
  return {
    platformUserId: data.id,
    displayName: data.name,
    avatarUrl: data.picture?.data?.url,
    metadata: { platform },
  };
}

async function fetchDevToProfile(accessToken: string): Promise<PlatformProfile> {
  const res = await fetch('https://dev.to/api/users/me', {
    headers: {
      'api-key': accessToken,
      'User-Agent': 'SocialFlowAI',
    },
  });
  if (!res.ok) throw new Error('Invalid Dev.to API key');
  const data = (await res.json()) as {
    id: number;
    username: string;
    name: string;
    profile_image?: string;
  };
  return {
    platformUserId: String(data.id),
    username: data.username,
    displayName: data.name,
    avatarUrl: data.profile_image,
  };
}

/** Placeholder — channel identity for Community posts only (no upload APIs). */
async function fetchYouTubeProfilePlaceholder(
  accessToken: string
): Promise<PlatformProfile> {
  return {
    platformUserId: hashKey(accessToken),
    displayName: 'YouTube Creator',
    metadata: {
      platform: 'youtube',
      integration: 'placeholder',
      publishMode: 'community_post',
    },
  };
}

/** Placeholder until Product Hunt API profile fetch is implemented. */
async function fetchProductHuntProfilePlaceholder(
  accessToken: string
): Promise<PlatformProfile> {
  return {
    platformUserId: hashKey(accessToken),
    displayName: 'Product Hunt Maker',
    metadata: { platform: 'producthunt', integration: 'placeholder' },
  };
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
}
