import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { User, type IUser } from '@/models/User';
import { UsageAnalytics } from '@/models/UsageAnalytics';
import { GeneratedPost } from '@/models/GeneratedPost';
import { WorkflowHistory } from '@/models/WorkflowHistory';

export async function GET() {
  try {
    const userId = await requireAuth();
    await connectDB();

    const user = await User.findOne({ clerkId: userId }).lean<IUser>();
    const analytics = await UsageAnalytics.find({ userId })
      .sort({ date: -1 })
      .limit(30)
      .lean();

    const totalPosts = await GeneratedPost.countDocuments({ userId });
    const completedExecutions = await WorkflowHistory.countDocuments({
      userId,
      status: 'completed',
    });
    const failedExecutions = await WorkflowHistory.countDocuments({
      userId,
      status: 'failed',
    });

    const platformBreakdown = await GeneratedPost.aggregate([
      { $match: { userId } },
      { $group: { _id: '$platform', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return NextResponse.json({
      user: {
        credits: user?.credits ?? 0,
        plan: user?.plan ?? 'free',
        name: user?.name,
      },
      stats: {
        totalPosts,
        completedExecutions,
        failedExecutions,
      },
      analytics,
      platformBreakdown: platformBreakdown.map((p) => ({
        platform: p._id,
        count: p.count,
      })),
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 });
  }
}
