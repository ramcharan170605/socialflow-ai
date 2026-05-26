import { z } from 'zod';
import { PLATFORMS } from './platforms';
import { CONNECTABLE_PLATFORMS } from './platforms/catalog';

const platformIds = PLATFORMS.map((p) => p.id) as [string, ...string[]];

export const generateRequestSchema = z.object({
  websiteUrl: z
    .string()
    .url('Please enter a valid URL')
    .max(2048)
    .refine((url) => /^https?:\/\//i.test(url), 'URL must use http or https'),
  userPrompt: z
    .string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(4000, 'Prompt must be under 4000 characters'),
  platform: z.enum(platformIds),
  publish: z.boolean().optional().default(false),
});

export const workflowTriggerSchema = generateRequestSchema;

export const apiKeyConnectSchema = z.object({
  apiKey: z.string().min(8, 'API key is too short').max(500),
});

export const crawlPreviewSchema = z.object({
  websiteUrl: z.string().url().max(2048),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
