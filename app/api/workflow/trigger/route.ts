import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { workflowTriggerSchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limit';
import { triggerUserWorkflow } from '@/lib/workflow-service';
import {
  ensureUser,
  deductCredit,
  trackUsage,
} from '@/lib/user-service';
import type { PlatformId } from '@/lib/platforms';
export const maxDuration = 120;

/**
 * Multi-tenant workflow trigger.
 * Fetches user tokens from MongoDB, injects into n8n — no static credentials.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const authUser = await getAuthUser();
    const body = await req.json();
    const parsed = workflowTriggerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const rate = await checkRateLimit(`workflow:${userId}`);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    await connectDB();
    await ensureUser({
      clerkId: userId,
      email: authUser?.email ?? '',
      name: authUser?.name ?? 'User',
      imageUrl: authUser?.imageUrl,
    });

    const hasCredit = await deductCredit(userId, 1);
    if (!hasCredit) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
    }

    const { websiteUrl, userPrompt, platform, publish } = parsed.data;

    if (publish) {
      const { isConnectablePlatform } = await import('@/lib/oauth/providers');
      const { getValidPlatformToken } = await import('@/lib/oauth/token-manager');
      if (
        isConnectablePlatform(platform) &&
        !(await getValidPlatformToken(userId, platform))
      ) {
        return NextResponse.json(
          {
            error: `Connect your ${platform} account before publishing`,
            code: 'PLATFORM_NOT_CONNECTED',
          },
          { status: 400 }
        );
      }
    }

    const result = await triggerUserWorkflow({
      userId,
      websiteUrl,
      userPrompt,
      platform: platform as PlatformId,
      publish,
    });

    await trackUsage(userId, platform, 1);

    return NextResponse.json({
      status: result.status,
      executionId: result.executionId,
      platform: result.platform,
      platformName: result.platformName,
      websiteUrl: result.websiteUrl ?? websiteUrl,
      summary: result.summary,
      content: result.content,
      qualityScore: result.qualityScore,
      wordCount: result.wordCount,
      publishStatus: result.publishStatus,
      publishResult: result.publishResult,
      generatedAt: result.generatedAt,
      durationMs: result.durationMs,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Workflow trigger failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
