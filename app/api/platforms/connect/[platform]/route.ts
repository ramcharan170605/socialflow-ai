import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createOAuthAuthorizationUrl } from '@/lib/oauth/service';
import { isConnectablePlatform, assertPlatformConnectReady } from '@/lib/oauth/providers';
import type { ConnectablePlatform } from '@/lib/oauth/types';

export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const userId = await requireAuth();
    const platform = params.platform;

    if (!isConnectablePlatform(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const provider = await import('@/lib/oauth/providers').then((m) =>
      m.getProvider(platform)
    );

    assertPlatformConnectReady(platform as ConnectablePlatform);

    if (provider?.authMethod === 'api_key') {
      return NextResponse.json(
        {
          error: `${platform} uses API key connection`,
          connectMethod: 'api_key',
          endpoint: `/api/platforms/connect/${platform}/api-key`,
        },
        { status: 400 }
      );
    }

    const redirectAfter =
      req.nextUrl.searchParams.get('redirect') ?? '/dashboard?tab=connections';

    const authUrl = await createOAuthAuthorizationUrl(
      userId,
      platform as ConnectablePlatform,
      redirectAfter
    );

    return NextResponse.redirect(authUrl);
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Connect failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
