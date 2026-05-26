import Firecrawl from '@mendable/firecrawl-js';
import { sanitizeText, sanitizeUrl } from './sanitize';

let client: Firecrawl | null = null;

function getClient(): Firecrawl {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not configured');
  }
  if (!client) {
    client = new Firecrawl({ apiKey });
  }
  return client;
}

export interface ScrapeResult {
  markdown: string;
  title?: string;
  description?: string;
  sourceUrl: string;
}

export async function scrapeWebsite(url: string): Promise<ScrapeResult> {
  const safeUrl = sanitizeUrl(url);
  const fc = getClient();

  const result = await fc.scrapeUrl(safeUrl, {
    formats: ['markdown'],
    onlyMainContent: true,
  });

  if (!result.success) {
    throw new Error(
      typeof result.error === 'string' ? result.error : 'Firecrawl scrape failed'
    );
  }

  const markdown = sanitizeText(result.markdown ?? '', 30000);

  if (!markdown || markdown.length < 50) {
    throw new Error(
      'Could not extract enough content from this URL. Try a different page.'
    );
  }

  return {
    markdown,
    title: result.metadata?.title,
    description: result.metadata?.description,
    sourceUrl: safeUrl,
  };
}
