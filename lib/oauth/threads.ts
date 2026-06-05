import type { OAuthTokenResponse, PlatformProfile } from './types';

const THREADS_GRAPH = 'https://graph.threads.net';

/** Exchange authorization code for a short-lived Threads access token (~1 hour). */
export async function exchangeThreadsAuthorizationCode(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<OAuthTokenResponse> {
  const query = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: params.redirectUri,
    code: params.code,
  });

  const res = await fetch(`${THREADS_GRAPH}/oauth/access_token?${query}`);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Threads token exchange failed: ${errText.slice(0, 300)}`);
  }

  return (await res.json()) as OAuthTokenResponse;
}

/** Exchange short-lived token for long-lived token (~60 days). */
export async function exchangeThreadsLongLivedToken(
  shortLivedAccessToken: string,
  clientSecret: string
): Promise<OAuthTokenResponse> {
  const query = new URLSearchParams({
    grant_type: 'th_exchange_token',
    client_secret: clientSecret,
    access_token: shortLivedAccessToken,
  });

  const res = await fetch(`${THREADS_GRAPH}/access_token?${query}`);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Threads long-lived token exchange failed: ${errText.slice(0, 300)}`
    );
  }

  return (await res.json()) as OAuthTokenResponse;
}

/** Refresh a long-lived Threads access token (GET th_refresh_token). */
export async function refreshThreadsAccessToken(
  accessToken: string
): Promise<OAuthTokenResponse> {
  const query = new URLSearchParams({
    grant_type: 'th_refresh_token',
    access_token: accessToken,
  });

  const res = await fetch(`${THREADS_GRAPH}/refresh_access_token?${query}`);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Threads token refresh failed: ${errText.slice(0, 300)}`);
  }

  return (await res.json()) as OAuthTokenResponse;
}

/** Fetch Threads user profile via Threads Graph API. */
export async function fetchThreadsProfile(
  accessToken: string
): Promise<PlatformProfile> {
  const fields = 'id,username,name,threads_profile_picture_url';
  const res = await fetch(
    `${THREADS_GRAPH}/v1.0/me?fields=${encodeURIComponent(fields)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error('Failed to fetch Threads profile');
  }

  const data = (await res.json()) as {
    id: string;
    username?: string;
    name?: string;
    threads_profile_picture_url?: string;
  };

  return {
    platformUserId: data.id,
    username: data.username,
    displayName: data.name ?? data.username,
    avatarUrl: data.threads_profile_picture_url,
    metadata: { platform: 'threads' },
  };
}
