import mongoose, { Schema, models, model } from 'mongoose';

export interface IOAuthToken {
  userId: string;
  connectedAccountId: mongoose.Types.ObjectId;
  platform: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string;
  tokenType: string;
  scope?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OAuthTokenSchema = new Schema<IOAuthToken>(
  {
    userId: { type: String, required: true, index: true },
    connectedAccountId: {
      type: Schema.Types.ObjectId,
      ref: 'ConnectedAccount',
      required: true,
      index: true,
    },
    platform: { type: String, required: true, index: true },
    accessTokenEncrypted: { type: String, required: true },
    refreshTokenEncrypted: String,
    tokenType: { type: String, default: 'Bearer' },
    scope: String,
    expiresAt: { type: Date, index: true },
  },
  { timestamps: true }
);

OAuthTokenSchema.index({ userId: 1, platform: 1 }, { unique: true });

export const OAuthToken =
  models.OAuthToken ?? model<IOAuthToken>('OAuthToken', OAuthTokenSchema);
