import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { disconnectPlatform } from '@/lib/oauth/service';
import { isConnectablePlatform } from '@/lib/oauth/providers';

export async function DELETE(
  _req: Request,
  { params }: { params: { platform: string } }
) {
  try {
    const userId = await requireAuth();
    const platform = params.platform;

    if (!isConnectablePlatform(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    await disconnectPlatform(userId, platform);

    return NextResponse.json({
      success: true,
      platform,
      message: `${platform} disconnected`,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Disconnect failed' }, { status: 500 });
  }
}
