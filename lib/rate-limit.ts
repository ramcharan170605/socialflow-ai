import { connectDB } from './db';
import mongoose from 'mongoose';

interface RateLimitDoc {
  key: string;
  count: number;
  windowStart: Date;
}

const RateLimitSchema = new mongoose.Schema<RateLimitDoc>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  windowStart: { type: Date, default: Date.now },
});

const RateLimitModel =
  mongoose.models.RateLimit ??
  mongoose.model<RateLimitDoc>('RateLimit', RateLimitSchema);

export async function checkRateLimit(
  key: string
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  await connectDB();

  const points = Number(process.env.RATE_LIMIT_POINTS ?? 10);
  const durationSec = Number(process.env.RATE_LIMIT_DURATION_SEC ?? 3600);
  const windowMs = durationSec * 1000;
  const now = new Date();

  let doc = await RateLimitModel.findOne({ key });

  if (!doc || now.getTime() - doc.windowStart.getTime() > windowMs) {
    doc = await RateLimitModel.findOneAndUpdate(
      { key },
      { count: 1, windowStart: now },
      { upsert: true, new: true }
    );
    return { allowed: true, remaining: points - 1, resetMs: windowMs };
  }

  if (doc.count >= points) {
    const resetMs =
      windowMs - (now.getTime() - doc.windowStart.getTime());
    return { allowed: false, remaining: 0, resetMs: Math.max(resetMs, 0) };
  }

  doc = await RateLimitModel.findOneAndUpdate(
    { key },
    { $inc: { count: 1 } },
    { new: true }
  );

  return {
    allowed: true,
    remaining: points - (doc?.count ?? 1),
    resetMs: windowMs - (now.getTime() - (doc?.windowStart.getTime() ?? 0)),
  };
}
