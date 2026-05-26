import mongoose, { Schema, models, model } from 'mongoose';

export interface IGeneratedPost {
  userId: string;
  executionId: string;
  websiteUrl: string;
  userPrompt: string;
  platform: string;
  summary?: string;
  content: string;
  qualityScore?: number;
  wordCount?: number;
  status: 'pending' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GeneratedPostSchema = new Schema<IGeneratedPost>(
  {
    userId: { type: String, required: true, index: true },
    executionId: { type: String, required: true, unique: true },
    websiteUrl: { type: String, required: true },
    userPrompt: { type: String, required: true },
    platform: { type: String, required: true, index: true },
    summary: String,
    content: { type: String, default: '' },
    qualityScore: Number,
    wordCount: Number,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    error: String,
  },
  { timestamps: true }
);

GeneratedPostSchema.index({ userId: 1, createdAt: -1 });

export const GeneratedPost =
  models.GeneratedPost ?? model<IGeneratedPost>('GeneratedPost', GeneratedPostSchema);
