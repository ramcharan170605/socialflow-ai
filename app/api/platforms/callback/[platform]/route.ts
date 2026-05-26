import { NextRequest, NextResponse } from 'next/server';
import { handleOAuthCallback } from '@/lib/oauth/service';
import { isConnectablePlatform, getAppUrl } from '@/lib/oauth/providers';
import type { ConnectablePlatform } from '@/lib/oauth/types';

export async function GET(
  req: NextRequest,
  { params }: { params: { platform: string } }
) {
  const appUrl = getAppUrl();
  const platform = params.platform;

  if (!isConnectablePlatform(platform)) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?tab=connections&error=invalid_platform`
    );
  }

  const error = req.nextUrl.searchParams.get('error');
  if (error) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?tab=connections&error=${encodeURIComponent(error)}`
    );
  }

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?tab=connections&error=missing_code`
    );
  }

  try {
    const result = await handleOAuthCallback(
      platform as ConnectablePlatform,
      code,
      state
    );

    const redirect =
      result.redirectAfter ??
      '/dashboard?tab=connections&connected=' + platform;

    return NextResponse.redirect(
      `${appUrl}${redirect.startsWith('/') ? redirect : `/${redirect}`}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'callback_failed';
    return NextResponse.redirect(
      `${appUrl}/dashboard?tab=connections&error=${encodeURIComponent(message)}`
    );
  }
}
