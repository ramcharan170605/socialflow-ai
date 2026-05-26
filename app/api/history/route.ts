import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { GeneratedPost } from '@/models/GeneratedPost';
import { PromptHistory } from '@/models/PromptHistory';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') ?? 'posts';
    const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);
    const page = Math.max(Number(searchParams.get('page') ?? 1), 1);
    const skip = (page - 1) * limit;

    if (type === 'prompts') {
      const prompts = await PromptHistory.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await PromptHistory.countDocuments({ userId });
      return NextResponse.json({ prompts, total, page, limit });
    }

    const posts = await GeneratedPost.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await GeneratedPost.countDocuments({ userId });

    return NextResponse.json({ posts, total, page, limit });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
