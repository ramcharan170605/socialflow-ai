import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { PLATFORMS } from '@/lib/platforms';
import { validateImageBatch } from './validate';
import { validatePlatformMediaCount } from './platform-media';
import { saveUserMedia, toMediaAsset } from './storage';
import type { MediaAsset } from './types';

const platformIds = PLATFORMS.map((p) => p.id) as [string, ...string[]];

const composerFieldsSchema = z
  .object({
    websiteUrl: z.string().max(2048).optional().default(''),
    userPrompt: z.string().max(4000).optional().default(''),
    platform: z.enum(platformIds),
    publish: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((v) => v === true || v === 'true'),
  })
  .superRefine((data, ctx) => {
    const url = data.websiteUrl?.trim() ?? '';
    const prompt = data.userPrompt?.trim() ?? '';
    const hasUrl = url.length > 0;
    const hasPrompt = prompt.length >= 10;

    if (!hasUrl && !hasPrompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Enter a prompt (10+ characters), a URL, or attach at least one image.',
        path: ['userPrompt'],
      });
    }

    if (hasUrl) {
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

export interface ParsedComposerRequest {
  websiteUrl: string;
  userPrompt: string;
  platform: string;
  publish: boolean;
  mediaAssets: MediaAsset[];
}

function isMultipart(req: NextRequest): boolean {
  const ct = req.headers.get('content-type') ?? '';
  return ct.includes('multipart/form-data');
}

export async function parseComposerRequest(
  req: NextRequest,
  userId: string
): Promise<
  { ok: true; data: ParsedComposerRequest } | { ok: false; error: string; status: number }
> {
  if (isMultipart(req)) {
    const form = await req.formData();
    const imageFiles = form
      .getAll('images')
      .filter((v): v is File => v instanceof File && v.size > 0);

    const fields = composerFieldsSchema.safeParse({
      websiteUrl: String(form.get('websiteUrl') ?? ''),
      userPrompt: String(form.get('userPrompt') ?? ''),
      platform: String(form.get('platform') ?? 'linkedin'),
      publish: form.get('publish') ?? false,
    });

    if (!fields.success) {
      const msg =
        fields.error.flatten().fieldErrors.userPrompt?.[0] ??
        fields.error.flatten().fieldErrors.websiteUrl?.[0] ??
        'Validation failed';
      return { ok: false, error: msg, status: 400 };
    }

    const prompt = fields.data.userPrompt.trim();
    const url = fields.data.websiteUrl.trim();
    const hasImages = imageFiles.length > 0;

    if (!url && prompt.length < 10 && !hasImages) {
      return {
        ok: false,
        error: 'Enter a prompt, URL, or attach at least one image.',
        status: 400,
      };
    }

    const batchCheck = validateImageBatch(
      imageFiles.map((f) => ({ name: f.name, type: f.type, size: f.size }))
    );
    if (!batchCheck.ok) {
      return { ok: false, error: batchCheck.error ?? 'Invalid image', status: 400 };
    }

    const platformCheck = validatePlatformMediaCount(
      fields.data.platform,
      imageFiles.length
    );
    if (!platformCheck.ok) {
      return { ok: false, error: platformCheck.error, status: 400 };
    }

    const mediaAssets: MediaAsset[] = [];
    for (const file of imageFiles) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const stored = await saveUserMedia(userId, {
        buffer,
        mimeType: file.type,
        originalName: file.name,
        size: file.size,
      });
      mediaAssets.push(toMediaAsset(stored));
    }

    return {
      ok: true,
      data: {
        websiteUrl: url,
        userPrompt: prompt,
        platform: fields.data.platform,
        publish: fields.data.publish ?? false,
        mediaAssets,
      },
    };
  }

  const body = await req.json();
  const parsed = composerFieldsSchema.safeParse(body);

  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.userPrompt?.[0] ??
      parsed.error.flatten().fieldErrors.websiteUrl?.[0] ??
      'Validation failed';
    return { ok: false, error: msg, status: 400 };
  }

  return {
    ok: true,
    data: {
      websiteUrl: parsed.data.websiteUrl.trim(),
      userPrompt: parsed.data.userPrompt.trim(),
      platform: parsed.data.platform,
      publish: parsed.data.publish ?? false,
      mediaAssets: [],
    },
  };
}
