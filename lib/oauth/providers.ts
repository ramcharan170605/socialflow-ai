import type { ConnectablePlatform, OAuthProviderConfig } from './types';
import { getPlatformMeta } from '@/lib/platforms/catalog';

export const OAUTH_PROVIDERS: Record<ConnectablePlatform, OAuthProviderConfig> = {
  linkedin: {
    platform: 'linkedin',
    authMethod: 'oauth2',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['openid', 'profile', 'email', 'w_member_social'],
    clientIdEnv: 'LINKEDIN_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_CLIENT_SECRET',
  },
  instagram: {
    platform: 'instagram',
    authMethod: 'oauth2',
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scopes: [
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list',
      'pages_read_engagement',
    ],
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
  },
  facebook: {
    platform: 'facebook',
    authMethod: 'oauth2',
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
  },
  threads: {
    platform: 'threads',
    authMethod: 'oauth2',
    authUrl: 'https://threads.net/oauth/authorize',
    tokenUrl: 'https://graph.threads.net/oauth/access_token',
    scopes: ['threads_basic', 'threads_content_publish'],
    clientIdEnv: 'META_APP_ID',
    clientSecretEnv: 'META_APP_SECRET',
  },
  medium: {
    platform: 'medium',
    authMethod: 'api_key',
    clientIdEnv: 'MEDIUM_CLIENT_ID',
    clientSecretEnv: 'MEDIUM_CLIENT_SECRET',
  },
  devto: {
    platform: 'devto',
    authMethod: 'api_key',
    clientIdEnv: 'DEVTO_API_KEY',
    clientSecretEnv: 'DEVTO_API_KEY',
  },
  youtube: {
    platform: 'youtube',
    authMethod: 'oauth2',
    comingSoon: true,
    /** Community-tab social posts only — no video/Shorts/upload scopes. */
    integrationScope: 'community_posts_only',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/youtube.readonly',
    ],
    clientIdEnv: 'YOUTUBE_CLIENT_ID',
    clientSecretEnv: 'YOUTUBE_CLIENT_SECRET',
    extraAuthParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
  producthunt: {
    platform: 'producthunt',
    authMethod: 'oauth2',
    comingSoon: true,
    authUrl: 'https://api.producthunt.com/v2/oauth/authorize',
    tokenUrl: 'https://api.producthunt.com/v2/oauth/token',
    scopes: ['public', 'write'],
    clientIdEnv: 'PRODUCTHUNT_CLIENT_ID',
    clientSecretEnv: 'PRODUCTHUNT_CLIENT_SECRET',
  },
};

export function getProvider(platform: string): OAuthProviderConfig | null {
  if (platform in OAUTH_PROVIDERS) {
    return OAUTH_PROVIDERS[platform as ConnectablePlatform];
  }
  return null;
}

export function getClientCredentials(
  provider: OAuthProviderConfig
): { clientId: string; clientSecret: string } | null {
  const clientId = process.env[provider.clientIdEnv];
  const clientSecret = process.env[provider.clientSecretEnv];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
    'http://localhost:3000'
  );
}

export function getCallbackUrl(platform: ConnectablePlatform): string {
  return `${getAppUrl()}/api/platforms/callback/${platform}`;
}

export function isConnectablePlatform(
  value: string
): value is ConnectablePlatform {
  return value in OAUTH_PROVIDERS;
}

export function assertPlatformConnectReady(platform: ConnectablePlatform): void {
  const meta = getPlatformMeta(platform);
  const provider = getProvider(platform);
  if (provider?.comingSoon || meta?.comingSoon) {
    throw new Error(
      `${meta?.label ?? platform} connection is coming soon. Content generation is available now.`
    );
  }
}
