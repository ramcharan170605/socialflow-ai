import { NextRequest, NextResponse } from 'next/server';
import { runGeneration, generationJsonResponse } from '@/lib/api/run-generation';

export const maxDuration = 120;

/**
 * Multi-tenant workflow trigger.
 * Fetches user tokens from MongoDB, injects into n8n — no static credentials.
 */
export async function POST(req: NextRequest) {
  try {
    const outcome = await runGeneration(req, { rateLimitPrefix: 'workflow' });
    if (!outcome.ok) return outcome.response;
    return generationJsonResponse(outcome.result);
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Workflow trigger failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
