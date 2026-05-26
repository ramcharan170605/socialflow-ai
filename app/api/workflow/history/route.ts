import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getWorkflowHistory } from '@/lib/workflow-service';
import { GeneratedPost } from '@/models/GeneratedPost';
import { connectDB } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit') ?? 20);
    const page = Number(searchParams.get('page') ?? 1);
    const includePosts = searchParams.get('includePosts') === 'true';

    const { history, total, page: p, limit: l } = await getWorkflowHistory(
      userId,
      { limit, page }
    );

    let posts: unknown[] = [];
    if (includePosts) {
      await connectDB();
      posts = await GeneratedPost.find({ userId })
        .sort({ createdAt: -1 })
        .limit(l)
        .skip((p - 1) * l)
        .lean();
    }

    return NextResponse.json({
      history,
      posts: includePosts ? posts : undefined,
      total,
      page: p,
      limit: l,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch workflow history' },
      { status: 500 }
    );
  }
}
