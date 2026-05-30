import { v4 as uuidv4 } from 'uuid';
import { connectDB } from '@/lib/db';
import { scrapeWebsite } from '@/lib/firecrawl';
import { triggerN8nWorkflow, type N8nGenerateResponse } from '@/lib/n8n';
import { optimizePromptForPlatform, type PlatformId } from '@/lib/platforms';
import { isConnectablePlatform } from '@/lib/oauth/providers';
import { getValidPlatformToken } from '@/lib/oauth/token-manager';
import type { PlatformTokenPayload } from '@/lib/oauth/types';
import type { MediaAsset } from '@/lib/media/types';
import { sanitizeUrl } from '@/lib/sanitize';
import { GeneratedPost } from '@/models/GeneratedPost';
import { PromptHistory } from '@/models/PromptHistory';
import { WorkflowHistory } from '@/models/WorkflowHistory';
import { ConnectedAccount } from '@/models/ConnectedAccount';

export interface TriggerWorkflowInput {
  userId: string;
  websiteUrl?: string;
  userPrompt?: string;
  platform: PlatformId;
  publish?: boolean;
  mediaAssets?: MediaAsset[];
}

export interface TriggerWorkflowResult extends N8nGenerateResponse {
  executionId: string;
  status: 'completed' | 'failed';
  publishStatus?: 'skipped' | 'success' | 'failed' | 'not_connected';
  durationMs?: number;
  mediaAssets?: MediaAsset[];
}

function buildEffectivePrompt(
  userPrompt: string | undefined,
  mediaAssets: MediaAsset[] | undefined,
  platform: PlatformId
): string {
  const trimmed = userPrompt?.trim() ?? '';
  if (trimmed.length >= 10) {
    return optimizePromptForPlatform(trimmed, platform);
  }
  if (mediaAssets?.length) {
    const base = `Create engaging ${platform} content inspired by the attached image${mediaAssets.length > 1 ? 's' : ''}.`;
    return optimizePromptForPlatform(base, platform);
  }
  return optimizePromptForPlatform(trimmed || 'Create engaging social content.', platform);
}

function mediaContextLine(mediaAssets?: MediaAsset[]): string {
  if (!mediaAssets?.length) return '';
  const list = mediaAssets
    .map((m, i) => `[Image ${i + 1}: ${m.filename} — ${m.internalUrl}]`)
    .join('\n');
  return `\n\n[Attached media — ${mediaAssets.length} image(s):\n${list}]`;
}

export async function triggerUserWorkflow(
  input: TriggerWorkflowInput
): Promise<TriggerWorkflowResult> {
  const start = Date.now();
  const executionId = uuidv4();
  const mediaAssets = input.mediaAssets ?? [];
  const hasUrl = Boolean(input.websiteUrl?.trim());
  const safeUrl = hasUrl ? sanitizeUrl(input.websiteUrl!) : '';
  const optimizedPrompt =
    buildEffectivePrompt(input.userPrompt, mediaAssets, input.platform) +
    mediaContextLine(mediaAssets);
  const publish = input.publish ?? false;
  const effectiveUserPrompt =
    input.userPrompt?.trim() ||
    (mediaAssets.length
      ? `Image-based ${input.platform} post`
      : 'Social content generation');

  await connectDB();

  let platformTokens: Record<string, PlatformTokenPayload> = {};
  let tokensInjected = false;
  let publishStatus: TriggerWorkflowResult['publishStatus'] = 'skipped';

  if (isConnectablePlatform(input.platform)) {
    const token = await getValidPlatformToken(input.userId, input.platform);
    if (token) {
      platformTokens = { [input.platform]: token };
      tokensInjected = true;
      await ConnectedAccount.findOneAndUpdate(
        { userId: input.userId, platform: input.platform },
        { lastUsedAt: new Date() }
      );
    } else if (publish) {
      publishStatus = 'not_connected';
    }
  }

  await WorkflowHistory.create({
    userId: input.userId,
    executionId,
    platform: input.platform,
    status: 'running',
    publishRequested: publish,
    publishStatus: publish ? publishStatus : 'skipped',
    input: {
      websiteUrl: safeUrl,
      userPrompt: effectiveUserPrompt,
      platform: input.platform,
      publish,
      mediaCount: mediaAssets.length,
    },
    tokensInjected,
  });

  await GeneratedPost.create({
    userId: input.userId,
    executionId,
    websiteUrl: safeUrl,
    userPrompt: effectiveUserPrompt,
    platform: input.platform,
    status: 'pending',
    content: '',
    mediaAssets: mediaAssets.map((m) => ({
      id: m.id,
      url: m.url,
      filename: m.filename,
      mimeType: m.mimeType,
    })),
  });

  await PromptHistory.create({
    userId: input.userId,
    websiteUrl: safeUrl,
    userPrompt: effectiveUserPrompt,
    platform: input.platform,
    optimizedPrompt,
  });

  try {
    let scrapedMarkdown = '';
    if (hasUrl) {
      const scraped = await scrapeWebsite(safeUrl);
      scrapedMarkdown = scraped.markdown;
    } else if (mediaAssets.length) {
      scrapedMarkdown =
        '[No URL provided. Content generation is based on the user prompt and attached images.]';
    }

    const result = await triggerN8nWorkflow({
      websiteUrl: safeUrl,
      scrapedContent: scrapedMarkdown,
      userPrompt: effectiveUserPrompt,
      optimizedPrompt,
      platform: input.platform,
      userId: input.userId,
      executionId,
      platformTokens,
      publish: publish && tokensInjected,
      mediaAssets,
    });

    if (result.publishResult?.success) {
      publishStatus = 'success';
    } else if (result.publishResult?.error && publish) {
      publishStatus = 'failed';
    } else if (publish && !tokensInjected) {
      publishStatus = 'not_connected';
    } else if (publish && tokensInjected && !result.publishResult) {
      publishStatus = 'skipped';
    }

    const durationMs = Date.now() - start;

    await GeneratedPost.findOneAndUpdate(
      { executionId },
      {
        status: 'completed',
        content: result.content ?? '',
        summary: result.summary,
        qualityScore: result.qualityScore,
        wordCount: result.wordCount,
      }
    );

    await WorkflowHistory.findOneAndUpdate(
      { executionId },
      {
        status: 'completed',
        output: result,
        durationMs,
        publishStatus,
        tokensInjected,
      }
    );

    return {
      ...result,
      executionId,
      status: 'completed',
      publishStatus,
      durationMs,
      mediaAssets,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Workflow failed';

    await GeneratedPost.findOneAndUpdate(
      { executionId },
      { status: 'failed', error: message }
    );

    await WorkflowHistory.findOneAndUpdate(
      { executionId },
      { status: 'failed', error: message, publishStatus }
    );

    throw err;
  }
}

export async function getWorkflowHistory(
  userId: string,
  options: { limit?: number; page?: number } = {}
) {
  await connectDB();
  const limit = Math.min(options.limit ?? 20, 50);
  const page = Math.max(options.page ?? 1, 1);
  const skip = (page - 1) * limit;

  const [history, total] = await Promise.all([
    WorkflowHistory.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WorkflowHistory.countDocuments({ userId }),
  ]);

  return { history, total, page, limit };
}
