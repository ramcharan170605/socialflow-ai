'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { SignInButton } from '@clerk/nextjs';
import { toast } from 'sonner';
import { listPlatformsForSelect } from '@/lib/platforms';
import {
  getPlatformDescription,
  supportsPublishConnect,
} from '@/lib/platforms/catalog';
import { ContentPreview } from './ContentPreview';

interface GenerateResult {
  content?: string;
  summary?: string;
  qualityScore?: number;
  wordCount?: number;
  platformName?: string;
  executionId?: string;
}

export function GenerateForm() {
  const { isSignedIn } = useAuth();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [platform, setPlatform] = useState('linkedin');
  const [publish, setPublish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [crawlPreview, setCrawlPreview] = useState<{
    title?: string;
    description?: string;
  } | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!isSignedIn) {
      toast.error('Please sign in to generate content');
      return;
    }

    if (!websiteUrl.trim() || !userPrompt.trim()) {
      toast.error('Please fill in the URL and prompt');
      return;
    }

    setLoading(true);
    setResult(null);
    setCrawlPreview(null);
    setLoadingStep('Validating & crawling...');

    try {
      const useStream = true;

      if (useStream) {
        const res = await fetch('/api/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ websiteUrl, userPrompt, platform, publish }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `Request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        if (!reader) throw new Error('No response stream');

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6)) as {
                type: string;
                message?: string;
                title?: string;
                description?: string;
                content?: string;
                summary?: string;
                qualityScore?: number;
                wordCount?: number;
                platform?: string;
                executionId?: string;
              };

              if (data.type === 'status' && data.message) {
                setLoadingStep(data.message);
              }
              if (data.type === 'preview') {
                setCrawlPreview({
                  title: data.title,
                  description: data.description,
                });
              }
              if (data.type === 'complete') {
                setResult({
                  content: data.content,
                  summary: data.summary,
                  qualityScore: data.qualityScore,
                  wordCount: data.wordCount,
                  platformName: data.platform,
                  executionId: data.executionId,
                });
                toast.success('Content generated successfully!');
              }
              if (data.type === 'error') {
                throw new Error(data.message ?? 'Generation failed');
              }
            } catch (parseErr) {
              if (parseErr instanceof SyntaxError) continue;
              throw parseErr;
            }
          }
        }
      } else {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ websiteUrl, userPrompt, platform }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Generation failed');

        setResult({
          content: data.content,
          summary: data.summary,
          qualityScore: data.qualityScore,
          wordCount: data.wordCount,
          platformName: data.platformName,
          executionId: data.executionId,
        });
        if (data.preview) setCrawlPreview(data.preview);
        toast.success('Content generated!');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, [isSignedIn, websiteUrl, userPrompt, platform, publish]);

  const copyToClipboard = async () => {
    if (!result?.content) return;
    try {
      await navigator.clipboard.writeText(result.content);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <section id="generate" style={{ padding: '0 0 4rem' }}>
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>
            Generate social content
          </h2>

          <div className="field">
            <label className="label" htmlFor="websiteUrl">
              Website URL
            </label>
            <input
              id="websiteUrl"
              className="input"
              type="url"
              placeholder="Enter website URL to generate content from..."
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="userPrompt">
              Your prompt
            </label>
            <textarea
              id="userPrompt"
              className="textarea"
              placeholder="Create a LinkedIn post about this website..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              disabled={loading}
              rows={4}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="platform">
              Platform
            </label>
            <select
              id="platform"
              className="select"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              disabled={loading}
            >
              {listPlatformsForSelect().map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.label}
                </option>
              ))}
            </select>
            {getPlatformDescription(platform) && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {getPlatformDescription(platform)}
              </p>
            )}
          </div>

          {supportsPublishConnect(platform) && (
            <div className="field">
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                <input
                  type="checkbox"
                  checked={publish}
                  onChange={(e) => setPublish(e.target.checked)}
                  disabled={loading}
                />
                Auto-publish to connected {platform} account after generation
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Connect the platform in{' '}
                <a href="/dashboard?tab=connections">Dashboard → Connections</a> first.
              </p>
            </div>
          )}

          {crawlPreview && (
            <div
              style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                background: 'var(--bg)',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
              }}
            >
              {crawlPreview.title && (
                <strong style={{ display: 'block' }}>{crawlPreview.title}</strong>
              )}
              {crawlPreview.description && (
                <span style={{ color: 'var(--text-muted)' }}>
                  {crawlPreview.description}
                </span>
              )}
            </div>
          )}

          {loading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '1rem',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
              }}
            >
              <span className="spinner" />
              {loadingStep || 'Generating...'}
            </div>
          )}

          {isSignedIn ? (
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate content'}
            </button>
          ) : (
            <SignInButton mode="modal">
              <button type="button" className="btn btn-primary" style={{ width: '100%' }}>
                Sign in to generate
              </button>
            </SignInButton>
          )}
        </div>

        {result?.content && (
          <ContentPreview
            content={result.content}
            summary={result.summary}
            qualityScore={result.qualityScore}
            wordCount={result.wordCount}
            platform={result.platformName}
            onCopy={copyToClipboard}
          />
        )}
      </div>
    </section>
  );
}
