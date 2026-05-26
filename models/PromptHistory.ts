import mongoose, { Schema, models, model } from 'mongoose';

export interface IPromptHistory {
  userId: string;
  websiteUrl: string;
  userPrompt: string;
  platform: string;
  optimizedPrompt: string;
  createdAt: Date;
}

const PromptHistorySchema = new Schema<IPromptHistory>(
  {
    userId: { type: String, required: true, index: true },
    websiteUrl: { type: String, required: true },
    userPrompt: { type: String, required: true },
    platform: { type: String, required: true },
    optimizedPrompt: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PromptHistorySchema.index({ userId: 1, createdAt: -1 });

export const PromptHistory =
  models.PromptHistory ?? model<IPromptHistory>('PromptHistory', PromptHistorySchema);
