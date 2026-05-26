import mongoose, { Schema, models, model } from 'mongoose';

export interface IUsageAnalytics {
  userId: string;
  date: string;
  generations: number;
  platforms: Record<string, number>;
  creditsUsed: number;
}

const UsageAnalyticsSchema = new Schema<IUsageAnalytics>(
  {
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true },
    generations: { type: Number, default: 0 },
    platforms: { type: Map, of: Number, default: {} },
    creditsUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

UsageAnalyticsSchema.index({ userId: 1, date: 1 }, { unique: true });

export const UsageAnalytics =
  models.UsageAnalytics ??
  model<IUsageAnalytics>('UsageAnalytics', UsageAnalyticsSchema);
