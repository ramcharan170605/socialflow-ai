import type { ConnectablePlatform } from '@/lib/platforms/catalog';

export type { ConnectablePlatform };

/** @deprecated Import CONNECTABLE_PLATFORMS from @/lib/platforms/catalog */
export { CONNECTABLE_PLATFORMS } from '@/lib/platforms/catalog';

export type ConnectionStatus = 'connected' | 'expired' | 'revoked' | 'error';

export type AuthMethod = 'oauth2' | 'api_key';

export interface PlatformTokenPayload {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  scope?: string;
  /** Platform-specific metadata (e.g. page id, person URN) */
  metadata?: Record<string, string>;
}

export interface OAuthProviderConfig {
  platform: ConnectablePlatform;
  authMethod: AuthMethod;
  authUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  usePkce?: boolean;
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Extra query params for authorize URL */
  extraAuthParams?: Record<string, string>;
  /** OAuth UI/connect disabled until provider integration ships */
  comingSoon?: boolean;
  /**
   * When `community_posts_only`, never request upload/video/Shorts scopes.
   * Publish path must mirror LinkedIn/Threads text-style posts.
   */
  integrationScope?: 'community_posts_only';
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface PlatformProfile {
  platformUserId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  metadata?: Record<string, string>;
}
