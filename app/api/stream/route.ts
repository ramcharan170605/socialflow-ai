import { NextRequest } from 'next/server';
import { requireAuth, getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { generateRequestSchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limit';
import { triggerUserWorkflow } from '@/lib/workflow-service';
import { deductCredit, trackUsage, ensureUser } from '@/lib/user-service';
import type { PlatformId } from '@/lib/platforms';

export const maxDuration = 120;

function sse(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sse(payload)));
      };

      try {
        const userId = await requireAuth();
        const authUser = await getAuthUser();
        const body = await req.json();
        const parsed = generateRequestSchema.safeParse(body);

        if (!parsed.success) {
          send({ type: 'error', message: 'Validation failed' });
          controller.close();
          return;
        }

        const rate = await checkRateLimit(`generate:${userId}`);
        if (!rate.allowed) {
          send({ type: 'error', message: 'Rate limit exceeded' });
          controller.close();
          return;
        }

        await connectDB();
        await ensureUser({
          clerkId: userId,
          email: authUser?.email ?? '',
          name: authUser?.name ?? 'User',
        });

        const hasCredit = await deductCredit(userId, 1);
        if (!hasCredit) {
          send({ type: 'error', message: 'Insufficient credits' });
          controller.close();
          return;
        }

        const { websiteUrl, userPrompt, platform, publish } = parsed.data;

        send({ type: 'status', message: 'Crawling website & loading your tokens...' });

        const result = await triggerUserWorkflow({
          userId,
          websiteUrl,
          userPrompt,
          platform: platform as PlatformId,
          publish,
        });

        await trackUsage(userId, platform, 1);

        send({
          type: 'complete',
          executionId: result.executionId,
          content: result.content,
          summary: result.summary,
          qualityScore: result.qualityScore,
          wordCount: result.wordCount,
          platform: result.platformName,
          publishStatus: result.publishStatus,
          publishResult: result.publishResult,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream failed';
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
