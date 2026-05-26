import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { scrapeWebsite } from '@/lib/firecrawl';
import { crawlPreviewSchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limit';
import { cacheGet, cacheSet } from '@/lib/redis';
import { sanitizeUrl } from '@/lib/sanitize';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();
    const parsed = crawlPreviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const rate = await checkRateLimit(`crawl:${userId}`);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.resetMs / 1000)) } }
      );
    }

    const url = sanitizeUrl(parsed.data.websiteUrl);
    const cacheKey = `crawl:${crypto.createHash('sha256').update(url).digest('hex')}`;

    const cached = await cacheGet<{ markdown: string; title?: string; description?: string }>(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached, sourceUrl: url, cached: true });
    }

    const scraped = await scrapeWebsite(url);
    await cacheSet(cacheKey, scraped, 1800);

    return NextResponse.json({
      markdown: scraped.markdown.slice(0, 2000),
      fullLength: scraped.markdown.length,
      title: scraped.title,
      description: scraped.description,
      sourceUrl: scraped.sourceUrl,
      cached: false,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Crawl failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
