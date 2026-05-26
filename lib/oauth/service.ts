import { connectDB } from '@/lib/db';
import { ConnectedAccount } from '@/models/ConnectedAccount';
import { OAuthState } from '@/models/OAuthState';
import {
  getProvider,
  getClientCredentials,
  getCallbackUrl,
  isConnectablePlatform,
  assertPlatformConnectReady,
} from './providers';
import { generateState, generateCodeVerifier, generateCodeChallenge } from './pkce';
import { saveTokens, revokeTokens } from './token-manager';
import { fetchPlatformProfile } from './profiles';
import type { ConnectablePlatform, OAuthTokenResponse } from './types';

export async function createOAuthAuthorizationUrl(
  userId: string,
  platform: ConnectablePlatform,
  redirectAfter?: string
): Promise<string> {
  const provider = getProvider(platform);
  if (!provider || provider.authMethod !== 'oauth2') {
    throw new Error(`${platform} does not support OAuth redirect`);
  }

  assertPlatformConnectReady(platform);

  const creds = getClientCredentials(provider);
  if (!creds) {
    throw new Error(
      `OAuth credentials not configured for ${platform}. Set env vars in .env`
    );
  }

  await connectDB();
  const state = generateState();
  let codeVerifier: string | undefined;

  if (provider.usePkce) {
    codeVerifier = generateCodeVerifier();
  }

  await OAuthState.create({
    state,
    userId,
    platform,
    codeVerifier,
    redirectAfter,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: getCallbackUrl(platform),
    response_type: 'code',
    state,
    ...(provider.scopes?.length
      ? { scope: provider.scopes.join(' ') }
      : {}),
    ...(provider.extraAuthParams ?? {}),
  });

  if (provider.usePkce && codeVerifier) {
    params.set('code_challenge', generateCodeChallenge(codeVerifier));
    params.set('code_challenge_method', 'S256');
  }

  return `${provider.authUrl}?${params.toString()}`;
}

export async function handleOAuthCallback(
  platform: ConnectablePlatform,
  code: string,
  state: string
): Promise<{ userId: string; redirectAfter?: string }> {
  await connectDB();

  const stateDoc = await OAuthState.findOneAndDelete({ state, platform });
  if (!stateDoc || stateDoc.expiresAt < new Date()) {
    throw new Error('Invalid or expired OAuth state');
  }

  const provider = getProvider(platform);
  const creds = provider ? getClientCredentials(provider) : null;
  if (!provider?.tokenUrl || !creds) {
    throw new Error('OAuth provider not configured');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getCallbackUrl(platform),
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });

  if (stateDoc.codeVerifier) {
    body.set('code_verifier', stateDoc.codeVerifier);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const tokenRes = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Token exchange failed: ${errText.slice(0, 300)}`);
  }

  const tokenData = (await tokenRes.json()) as OAuthTokenResponse;
  const profile = await fetchPlatformProfile(platform, tokenData.access_token);

  const account = await ConnectedAccount.findOneAndUpdate(
    { userId: stateDoc.userId, platform },
    {
      userId: stateDoc.userId,
      platform,
      platformUserId: profile.platformUserId,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      status: 'connected',
      authMethod: 'oauth2',
      scopes: tokenData.scope?.split(' ') ?? provider.scopes,
      metadata: profile.metadata,
      lastError: undefined,
      lastUsedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  await saveTokens({
    userId: stateDoc.userId,
    platform,
    connectedAccountId: String(account._id),
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    tokenType: tokenData.token_type,
    scope: tokenData.scope,
  });

  return {
    userId: stateDoc.userId,
    redirectAfter: stateDoc.redirectAfter,
  };
}

export async function connectWithApiKey(
  userId: string,
  platform: ConnectablePlatform,
  apiKey: string
): Promise<void> {
  if (!isConnectablePlatform(platform)) {
    throw new Error('Invalid platform');
  }

  const provider = getProvider(platform);
  if (provider?.authMethod !== 'api_key') {
    throw new Error(`${platform} uses OAuth, not API key`);
  }

  const profile = await fetchPlatformProfile(platform, apiKey);

  await connectDB();
  const account = await ConnectedAccount.findOneAndUpdate(
    { userId, platform },
    {
      userId,
      platform,
      platformUserId: profile.platformUserId,
      username: profile.username,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      status: 'connected',
      authMethod: 'api_key',
      lastUsedAt: new Date(),
      lastError: undefined,
    },
    { upsert: true, new: true }
  );

  await saveTokens({
    userId,
    platform,
    connectedAccountId: String(account._id),
    accessToken: apiKey,
    tokenType: 'ApiKey',
  });
}

export async function disconnectPlatform(
  userId: string,
  platform: string
): Promise<void> {
  await revokeTokens(userId, platform);
  await connectDB();
  await ConnectedAccount.deleteOne({ userId, platform });
}

export async function listConnectedAccounts(userId: string) {
  await connectDB();
  const accounts = await ConnectedAccount.find({ userId })
    .sort({ platform: 1 })
    .lean();

  return accounts.map((a) => ({
    id: String(a._id),
    platform: a.platform,
    platformUserId: a.platformUserId,
    username: a.username,
    displayName: a.displayName,
    avatarUrl: a.avatarUrl,
    status: a.status,
    authMethod: a.authMethod,
    scopes: a.scopes,
    lastUsedAt: a.lastUsedAt,
    lastError: a.lastError,
    connectedAt: a.createdAt,
  }));
}
