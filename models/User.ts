import mongoose, { Schema, models, model } from 'mongoose';

export interface IUser {
  clerkId: string;
  email: string;
  name: string;
  imageUrl?: string;
  credits: number;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true },
    name: { type: String, default: 'User' },
    imageUrl: String,
    credits: { type: Number, default: 50 },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
  },
  { timestamps: true }
);

export const User = models.User ?? model<IUser>('User', UserSchema);
