import mongoose, { Schema, models, model } from 'mongoose';
import type { ConnectionStatus } from '@/lib/oauth/types';

export interface IConnectedAccount {
  userId: string;
  platform: string;
  platformUserId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  status: ConnectionStatus;
  authMethod: 'oauth2' | 'api_key';
  scopes?: string[];
  metadata?: Record<string, string>;
  lastUsedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectedAccountSchema = new Schema<IConnectedAccount>(
  {
    userId: { type: String, required: true, index: true },
    platform: { type: String, required: true, index: true },
    platformUserId: { type: String, required: true },
    username: String,
    displayName: String,
    avatarUrl: String,
    status: {
      type: String,
      enum: ['connected', 'expired', 'revoked', 'error'],
      default: 'connected',
    },
    authMethod: {
      type: String,
      enum: ['oauth2', 'api_key'],
      default: 'oauth2',
    },
    scopes: [String],
    metadata: { type: Map, of: String },
    lastUsedAt: Date,
    lastError: String,
  },
  { timestamps: true }
);

ConnectedAccountSchema.index({ userId: 1, platform: 1 }, { unique: true });

export const ConnectedAccount =
  models.ConnectedAccount ??
  model<IConnectedAccount>('ConnectedAccount', ConnectedAccountSchema);
