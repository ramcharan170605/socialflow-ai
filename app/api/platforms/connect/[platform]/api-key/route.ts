import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { connectWithApiKey } from '@/lib/oauth/service';
import {
  isConnectablePlatform,
  getProvider,
  assertPlatformConnectReady,
} from '@/lib/oauth/providers';
import { apiKeyConnectSchema } from '@/lib/validations';
import type { ConnectablePlatform } from '@/lib/oauth/types';

export async function POST(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const userId = await requireAuth();
    const platform = params.platform;

    if (!isConnectablePlatform(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const provider = getProvider(platform);
    assertPlatformConnectReady(platform as ConnectablePlatform);

    if (provider?.authMethod !== 'api_key') {
      return NextResponse.json(
        { error: `${platform} requires OAuth. Use GET /api/platforms/connect/${platform}` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = apiKeyConnectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    await connectWithApiKey(
      userId,
      platform as ConnectablePlatform,
      parsed.data.apiKey
    );

    return NextResponse.json({
      success: true,
      platform,
      message: `${platform} connected successfully`,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Connection failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
