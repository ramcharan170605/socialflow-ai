import { connectDB } from './db';
import { User } from '@/models/User';
import { UsageAnalytics } from '@/models/UsageAnalytics';

export async function ensureUser(params: {
  clerkId: string;
  email: string;
  name: string;
  imageUrl?: string;
}) {
  await connectDB();
  const existing = await User.findOne({ clerkId: params.clerkId });
  if (existing) return existing;

  return User.create({
    clerkId: params.clerkId,
    email: params.email,
    name: params.name,
    imageUrl: params.imageUrl,
    credits: Number(process.env.DEFAULT_USER_CREDITS ?? 50),
    plan: 'free',
  });
}

export async function deductCredit(clerkId: string, amount = 1): Promise<boolean> {
  await connectDB();
  const user = await User.findOne({ clerkId });
  if (!user || user.credits < amount) return false;
  user.credits -= amount;
  await user.save();
  return true;
}

export async function trackUsage(
  userId: string,
  platform: string,
  creditsUsed = 1
) {
  await connectDB();
  const date = new Date().toISOString().slice(0, 10);

  await UsageAnalytics.findOneAndUpdate(
    { userId, date },
    {
      $inc: {
        generations: 1,
        creditsUsed,
        [`platforms.${platform}`]: 1,
      },
    },
    { upsert: true, new: true }
  );
}
