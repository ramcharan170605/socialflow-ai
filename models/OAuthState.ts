import mongoose, { Schema, models, model } from 'mongoose';

export interface IOAuthState {
  state: string;
  userId: string;
  platform: string;
  codeVerifier?: string;
  redirectAfter?: string;
  expiresAt: Date;
}

const OAuthStateSchema = new Schema<IOAuthState>({
  state: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  platform: { type: String, required: true },
  codeVerifier: String,
  redirectAfter: String,
  expiresAt: { type: Date, required: true },
});

OAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OAuthState =
  models.OAuthState ?? model<IOAuthState>('OAuthState', OAuthStateSchema);
