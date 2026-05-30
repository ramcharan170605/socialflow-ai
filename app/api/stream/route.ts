import { NextRequest } from 'next/server';
import { runGeneration } from '@/lib/api/run-generation';

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
        send({ type: 'status', message: 'Preparing your content...' });

        const outcome = await runGeneration(req);

        if (!outcome.ok) {
          const errBody = await outcome.response.json().catch(() => ({}));
          send({
            type: 'error',
            message: (errBody as { error?: string }).error ?? 'Generation failed',
          });
          controller.close();
          return;
        }

        const { result } = outcome;

        send({ type: 'status', message: 'Generating platform-ready copy...' });

        send({
          type: 'complete',
          executionId: result.executionId,
          content: result.content,
          summary: result.summary,
          qualityScore: result.qualityScore,
          wordCount: result.wordCount,
          platform: result.platformName ?? result.platform,
          publishStatus: result.publishStatus,
          publishResult: result.publishResult,
          mediaAssets: result.mediaAssets,
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
