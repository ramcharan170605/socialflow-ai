import { connectDB } from '@/lib/db';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import { ConnectedAccount } from '@/models/ConnectedAccount';
import { OAuthToken } from '@/models/OAuthToken';
import type { ConnectablePlatform, PlatformTokenPayload } from './types';
import { getProvider, getClientCredentials } from './providers';
import type { OAuthTokenResponse } from './types';

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export class TokenExpiredError extends Error {
  constructor(platform: string) {
    super(`Token expired for ${platform}. Please reconnect.`);
    this.name = 'TokenExpiredError';
  }
}

export async function saveTokens(params: {
  userId: string;
  platform: ConnectablePlatform;
  connectedAccountId: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
}): Promise<void> {
  await connectDB();
  const expiresAt = params.expiresIn
    ? new Date(Date.now() + params.expiresIn * 1000)
    : undefined;

  await OAuthToken.findOneAndUpdate(
    { userId: params.userId, platform: params.platform },
    {
      userId: params.userId,
      connectedAccountId: params.connectedAccountId,
      platform: params.platform,
      accessTokenEncrypted: encryptSecret(params.accessToken),
      refreshTokenEncrypted: params.refreshToken
        ? encryptSecret(params.refreshToken)
        : undefined,
      tokenType: params.tokenType ?? 'Bearer',
      scope: params.scope,
      expiresAt,
    },
    { upsert: true, new: true }
  );
}

export async function refreshAccessToken(
  userId: string,
  platform: ConnectablePlatform
): Promise<PlatformTokenPayload> {
  await connectDB();
  const tokenDoc = await OAuthToken.findOne({ userId, platform });
  if (!tokenDoc?.refreshTokenEncrypted) {
    await markAccountExpired(userId, platform);
    throw new TokenExpiredError(platform);
  }

  const provider = getProvider(platform);
  if (!provider?.tokenUrl) throw new TokenExpiredError(platform);

  const creds = getClientCredentials(provider);
  if (!creds) throw new Error(`OAuth not configured for ${platform}`);

  const refreshToken = decryptSecret(tokenDoc.refreshTokenEncrypted);
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  if (!res.ok) {
    await markAccountExpired(userId, platform);
    throw new TokenExpiredError(platform);
  }

  const data = (await res.json()) as OAuthTokenResponse;
  await saveTokens({
    userId,
    platform,
    connectedAccountId: String(tokenDoc.connectedAccountId),
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
  });

  await ConnectedAccount.findOneAndUpdate(
    { userId, platform },
    { status: 'connected', lastError: undefined }
  );

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
    tokenType: data.token_type,
    scope: data.scope,
  };
}

export async function getValidPlatformToken(
  userId: string,
  platform: ConnectablePlatform
): Promise<PlatformTokenPayload | null> {
  await connectDB();

  const account = await ConnectedAccount.findOne({ userId, platform });
  if (!account || account.status !== 'connected') return null;

  const tokenDoc = await OAuthToken.findOne({ userId, platform });
  if (!tokenDoc) return null;

  const needsRefresh =
    tokenDoc.expiresAt &&
    tokenDoc.expiresAt.getTime() - Date.now() < REFRESH_BUFFER_MS;

  if (needsRefresh && tokenDoc.refreshTokenEncrypted) {
    try {
      return await refreshAccessToken(userId, platform);
    } catch {
      return null;
    }
  }

  if (
    tokenDoc.expiresAt &&
    tokenDoc.expiresAt.getTime() < Date.now()
  ) {
    if (tokenDoc.refreshTokenEncrypted) {
      try {
        return await refreshAccessToken(userId, platform);
      } catch {
        return null;
      }
    }
    await markAccountExpired(userId, platform);
    return null;
  }

  const accountMeta = account.metadata
    ? Object.fromEntries(account.metadata.entries())
    : undefined;

  return {
    accessToken: decryptSecret(tokenDoc.accessTokenEncrypted),
    refreshToken: tokenDoc.refreshTokenEncrypted
      ? decryptSecret(tokenDoc.refreshTokenEncrypted)
      : undefined,
    expiresAt: tokenDoc.expiresAt?.toISOString(),
    tokenType: tokenDoc.tokenType,
    scope: tokenDoc.scope,
    metadata: accountMeta,
  };
}

export async function getValidTokensForPlatforms(
  userId: string,
  platforms: ConnectablePlatform[]
): Promise<Record<string, PlatformTokenPayload>> {
  const tokens: Record<string, PlatformTokenPayload> = {};
  for (const platform of platforms) {
    const token = await getValidPlatformToken(userId, platform);
    if (token) tokens[platform] = token;
  }
  return tokens;
}

async function markAccountExpired(
  userId: string,
  platform: string
): Promise<void> {
  await ConnectedAccount.findOneAndUpdate(
    { userId, platform },
    {
      status: 'expired',
      lastError: 'Token expired — reconnect required',
    }
  );
}

export async function revokeTokens(
  userId: string,
  platform: string
): Promise<void> {
  await connectDB();
  await OAuthToken.deleteOne({ userId, platform });
  await ConnectedAccount.findOneAndUpdate(
    { userId, platform },
    { status: 'revoked' }
  );
}
