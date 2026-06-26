import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { readUserMedia, verifyMediaAccessToken } from '@/lib/media/storage';

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string; mediaId: string } }
) {
  const { userId, mediaId } = params;

  if (!userId || !mediaId || !/^[a-f0-9-]{36}$/i.test(mediaId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const apiKey = process.env.N8N_API_KEY;
  const internalAuth =
    apiKey && _req.headers.get('authorization') === `Bearer ${apiKey}`;
  const signedAccess = verifyMediaAccessToken(
    userId,
    mediaId,
    _req.nextUrl.searchParams.get('token')
  );

  if (!internalAuth && !signedAccess) {
    const session = await auth();
    if (!session.userId || session.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const file = await readUserMedia(userId, mediaId);
  if (!file) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      'Content-Type': file.mimeType,
      'Cache-Control': signedAccess
        ? 'public, max-age=86400, immutable'
        : 'private, max-age=3600',
    },
  });
}
