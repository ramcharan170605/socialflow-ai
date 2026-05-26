import { v4 as uuidv4 } from 'uuid';
import { connectDB } from '@/lib/db';
import { scrapeWebsite } from '@/lib/firecrawl';
import { triggerN8nWorkflow, type N8nGenerateResponse } from '@/lib/n8n';
import { optimizePromptForPlatform, type PlatformId } from '@/lib/platforms';
import { isConnectablePlatform } from '@/lib/oauth/providers';
import { getValidPlatformToken } from '@/lib/oauth/token-manager';
import type { PlatformTokenPayload } from '@/lib/oauth/types';
import { sanitizeUrl } from '@/lib/sanitize';
import { GeneratedPost } from '@/models/GeneratedPost';
import { PromptHistory } from '@/models/PromptHistory';
import { WorkflowHistory } from '@/models/WorkflowHistory';
import { ConnectedAccount } from '@/models/ConnectedAccount';

export interface TriggerWorkflowInput {
  userId: string;
  websiteUrl: string;
  userPrompt: string;
  platform: PlatformId;
  publish?: boolean;
}

export interface TriggerWorkflowResult extends N8nGenerateResponse {
  executionId: string;
  status: 'completed' | 'failed';
  publishStatus?: 'skipped' | 'success' | 'failed' | 'not_connected';
  durationMs?: number;
}

export async function triggerUserWorkflow(
  input: TriggerWorkflowInput
): Promise<TriggerWorkflowResult> {
  const start = Date.now();
  const executionId = uuidv4();
  const safeUrl = sanitizeUrl(input.websiteUrl);
  const optimizedPrompt = optimizePromptForPlatform(
    input.userPrompt,
    input.platform
  );
  const publish = input.publish ?? false;

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
      userPrompt: input.userPrompt,
      platform: input.platform,
      publish,
    },
    tokensInjected,
  });

  await GeneratedPost.create({
    userId: input.userId,
    executionId,
    websiteUrl: safeUrl,
    userPrompt: input.userPrompt,
    platform: input.platform,
    status: 'pending',
    content: '',
  });

  await PromptHistory.create({
    userId: input.userId,
    websiteUrl: safeUrl,
    userPrompt: input.userPrompt,
    platform: input.platform,
    optimizedPrompt,
  });

  try {
    const scraped = await scrapeWebsite(safeUrl);

    const result = await triggerN8nWorkflow({
      websiteUrl: safeUrl,
      scrapedContent: scraped.markdown,
      userPrompt: input.userPrompt,
      optimizedPrompt,
      platform: input.platform,
      userId: input.userId,
      executionId,
      platformTokens,
      publish: publish && tokensInjected,
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
