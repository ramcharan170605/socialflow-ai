import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { triggerUserWorkflow } from '@/lib/workflow-service';
import { deductCredit, trackUsage, ensureUser } from '@/lib/user-service';
import { parseComposerRequest } from '@/lib/media/parse-composer-request';
import type { PlatformId } from '@/lib/platforms';
import type { TriggerWorkflowResult } from '@/lib/workflow-service';

export interface RunGenerationOptions {
  rateLimitPrefix?: 'generate' | 'workflow';
}

export async function runGeneration(
  req: NextRequest,
  options: RunGenerationOptions = {}
): Promise<
  | { ok: true; result: TriggerWorkflowResult }
  | { ok: false; response: NextResponse }
> {
  const userId = await requireAuth();
  const authUser = await getAuthUser();
  const rateKey = `${options.rateLimitPrefix ?? 'generate'}:${userId}`;

  const parsed = await parseComposerRequest(req, userId);
  if (!parsed.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: parsed.error }, { status: parsed.status }),
    };
  }

  const rate = await checkRateLimit(rateKey);
  if (!rate.allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 }),
    };
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
    return {
      ok: false,
      response: NextResponse.json({ error: 'Insufficient credits' }, { status: 402 }),
    };
  }

  const { websiteUrl, userPrompt, platform, publish, mediaAssets } = parsed.data;

  if (publish) {
    const { isConnectablePlatform } = await import('@/lib/oauth/providers');
    const { getValidPlatformToken } = await import('@/lib/oauth/token-manager');
    if (
      isConnectablePlatform(platform) &&
      !(await getValidPlatformToken(userId, platform))
    ) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: `Connect your ${platform} account before publishing`,
            code: 'PLATFORM_NOT_CONNECTED',
          },
          { status: 400 }
        ),
      };
    }
  }

  const result = await triggerUserWorkflow({
    userId,
    websiteUrl: websiteUrl || undefined,
    userPrompt: userPrompt || undefined,
    platform: platform as PlatformId,
    publish,
    mediaAssets,
  });

  await trackUsage(userId, platform, 1);

  return { ok: true, result };
}

export function generationJsonResponse(result: TriggerWorkflowResult) {
  return NextResponse.json({
    status: result.status,
    executionId: result.executionId,
    platform: result.platform,
    platformName: result.platformName,
    websiteUrl: result.websiteUrl,
    summary: result.summary,
    content: result.content,
    qualityScore: result.qualityScore,
    wordCount: result.wordCount,
    publishStatus: result.publishStatus,
    publishResult: result.publishResult,
    mediaAssets: result.mediaAssets,
    generatedAt: result.generatedAt,
    durationMs: result.durationMs,
  });
}
