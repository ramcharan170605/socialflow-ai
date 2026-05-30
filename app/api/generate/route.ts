import { NextRequest, NextResponse } from 'next/server';
import { runGeneration, generationJsonResponse } from '@/lib/api/run-generation';

export const maxDuration = 120;

/** @deprecated Prefer POST /api/workflow/trigger — kept for backward compatibility */
export async function POST(req: NextRequest) {
  try {
    const outcome = await runGeneration(req);
    if (!outcome.ok) return outcome.response;
    return generationJsonResponse(outcome.result);
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
