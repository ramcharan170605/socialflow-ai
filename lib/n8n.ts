import { sanitizeText } from './sanitize';
import type { PlatformId } from './platforms';
import type { PlatformTokenPayload } from './oauth/types';

export interface N8nGeneratePayload {
  websiteUrl: string;
  scrapedContent: string;
  userPrompt: string;
  optimizedPrompt: string;
  platform: PlatformId;
  userId: string;
  executionId: string;
  /** Per-user tokens injected by backend — n8n uses these, NOT static credentials */
  platformTokens?: Record<string, PlatformTokenPayload>;
  publish?: boolean;
}

export interface N8nPublishResult {
  success: boolean;
  platform?: string;
  postId?: string;
  url?: string;
  error?: string;
}

export interface N8nGenerateResponse {
  success: boolean;
  executionId?: string;
  userId?: string;
  platform?: string;
  platformName?: string;
  websiteUrl?: string;
  summary?: string;
  content?: string;
  qualityScore?: number;
  wordCount?: number;
  generatedAt?: string;
  publishResult?: N8nPublishResult;
  error?: string;
}

/** Strip refresh tokens before sending to n8n — only short-lived access tokens */
function sanitizeTokensForN8n(
  tokens?: Record<string, PlatformTokenPayload>
): Record<string, { accessToken: string; tokenType?: string; metadata?: Record<string, string> }> | undefined {
  if (!tokens) return undefined;

  const safe: Record<string, { accessToken: string; tokenType?: string; metadata?: Record<string, string> }> = {};
  for (const [platform, t] of Object.entries(tokens)) {
    safe[platform] = {
      accessToken: t.accessToken,
      tokenType: t.tokenType,
      metadata: t.metadata,
    };
  }
  return safe;
}

export async function triggerN8nWorkflow(
  payload: N8nGeneratePayload
): Promise<N8nGenerateResponse> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const apiKey = process.env.N8N_API_KEY;

  if (!webhookUrl) {
    throw new Error('N8N_WEBHOOK_URL is not configured');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-SocialFlow-User-Id': payload.userId,
    'X-SocialFlow-Execution-Id': payload.executionId,
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
    headers['X-N8N-API-KEY'] = apiKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.N8N_TIMEOUT_MS ?? 120000)
  );

  let lastError: Error | null = null;
  const maxRetries = Number(process.env.N8N_MAX_RETRIES ?? 2);

  const body = {
    websiteUrl: payload.websiteUrl,
    scrapedContent: sanitizeText(payload.scrapedContent, 30000),
    userPrompt: sanitizeText(payload.userPrompt, 4000),
    optimizedPrompt: sanitizeText(payload.optimizedPrompt, 5000),
    platform: payload.platform,
    userId: payload.userId,
    executionId: payload.executionId,
    platformTokens: sanitizeTokensForN8n(payload.platformTokens),
    publish: payload.publish ?? false,
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`n8n workflow failed (${res.status}): ${text.slice(0, 500)}`);
      }

      const data = (await res.json()) as N8nGenerateResponse;
      clearTimeout(timeout);

      if (!data.success && !data.content) {
        throw new Error(data.error ?? 'n8n returned empty content');
      }

      return {
        ...data,
        content: data.content ? sanitizeText(data.content, 20000) : undefined,
        summary: data.summary ? sanitizeText(data.summary, 5000) : undefined,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  clearTimeout(timeout);
  throw lastError ?? new Error('n8n workflow failed after retries');
}
