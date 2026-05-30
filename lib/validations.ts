import { z } from 'zod';
import { PLATFORMS } from './platforms';

const platformIds = PLATFORMS.map((p) => p.id) as [string, ...string[]];

/** JSON composer payload (backward compatible — images use multipart). */
export const generateRequestSchema = z
  .object({
    websiteUrl: z.string().max(2048).optional().default(''),
    userPrompt: z.string().max(4000).optional().default(''),
    platform: z.enum(platformIds),
    publish: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    const url = data.websiteUrl?.trim() ?? '';
    const prompt = data.userPrompt?.trim() ?? '';
    if (!url && prompt.length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a prompt (10+ characters) or a website URL.',
        path: ['userPrompt'],
      });
    }
    if (url) {
      try {
        const parsed = new URL(url);
        if (!/^https?:$/i.test(parsed.protocol)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'URL must use http or https',
            path: ['websiteUrl'],
          });
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please enter a valid URL',
          path: ['websiteUrl'],
        });
      }
    }
  });

export const workflowTriggerSchema = generateRequestSchema;

export const apiKeyConnectSchema = z.object({
  apiKey: z.string().min(8, 'API key is too short').max(500),
});

export const crawlPreviewSchema = z.object({
  websiteUrl: z.string().url().max(2048),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
