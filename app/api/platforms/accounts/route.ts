import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { listConnectedAccounts } from '@/lib/oauth/service';
import { CONNECTABLE_PLATFORMS } from '@/lib/platforms/catalog';
import { getProvider } from '@/lib/oauth/providers';

export async function GET() {
  try {
    const userId = await requireAuth();
    const accounts = await listConnectedAccounts(userId);

    const connectedPlatforms = new Set(accounts.map((a) => a.platform));

    const available = CONNECTABLE_PLATFORMS.map((platform) => {
      const provider = getProvider(platform);
      const existing = accounts.find((a) => a.platform === platform);
      return {
        platform,
        authMethod: provider?.authMethod ?? 'oauth2',
        comingSoon: provider?.comingSoon ?? false,
        connected: connectedPlatforms.has(platform),
        account: existing ?? null,
      };
    });

    return NextResponse.json({ accounts, available });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch connected accounts' },
      { status: 500 }
    );
  }
}
