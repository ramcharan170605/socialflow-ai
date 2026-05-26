import mongoose, { Schema, models, model } from 'mongoose';

export interface IWorkflowHistory {
  userId: string;
  executionId: string;
  workflowName: string;
  platform: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  publishRequested: boolean;
  publishStatus?: 'skipped' | 'success' | 'failed' | 'not_connected';
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  durationMs?: number;
  error?: string;
  tokensInjected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowHistorySchema = new Schema<IWorkflowHistory>(
  {
    userId: { type: String, required: true, index: true },
    executionId: { type: String, required: true, unique: true },
    workflowName: { type: String, default: 'socialflow-generate' },
    platform: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
    },
    publishRequested: { type: Boolean, default: false },
    publishStatus: {
      type: String,
      enum: ['skipped', 'success', 'failed', 'not_connected'],
    },
    input: { type: Schema.Types.Mixed, default: {} },
    output: Schema.Types.Mixed,
    durationMs: Number,
    error: String,
    tokensInjected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

WorkflowHistorySchema.index({ userId: 1, createdAt: -1 });

export const WorkflowHistory =
  models.WorkflowHistory ??
  model<IWorkflowHistory>('WorkflowHistory', WorkflowHistorySchema);

/** @deprecated Use WorkflowHistory — kept for backward compatibility */
export const WorkflowExecution = WorkflowHistory;
