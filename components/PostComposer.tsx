'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { SignInButton } from '@clerk/nextjs';
import { toast } from 'sonner';
import { listPlatformsForSelect } from '@/lib/platforms';
import {
  getPlatformDescription,
  supportsPublishConnect,
} from '@/lib/platforms/catalog';
import {
  getPlatformMediaCapabilities,
  platformRecommendsImages,
} from '@/lib/media/platform-media';
import { MAX_IMAGES_PER_POST } from '@/lib/media/constants';
import { useComposerMedia } from '@/hooks/useComposerMedia';
import { MediaDropzone } from './composer/MediaDropzone';
import { MediaThumbnailGrid } from './composer/MediaThumbnailGrid';
import { ContentPreview } from './ContentPreview';

interface GenerateResult {
  content?: string;
  summary?: string;
  qualityScore?: number;
  wordCount?: number;
  platformName?: string;
  executionId?: string;
  mediaAssets?: Array<{ id: string; url: string; filename: string }>;
}

export function PostComposer() {
  const { isSignedIn } = useAuth();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [platform, setPlatform] = useState('linkedin');
  const [publish, setPublish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { items, error: mediaError, addFiles, removeItem, clearAll } = useComposerMedia();
  const mediaCaps = getPlatformMediaCapabilities(platform);

  const canSubmit = useCallback(() => {
    const hasUrl = websiteUrl.trim().length > 0;
    const hasPrompt = userPrompt.trim().length >= 10;
    const hasImages = items.length > 0;
    return hasUrl || hasPrompt || hasImages;
  }, [websiteUrl, userPrompt, items.length]);

  const handleGenerate = useCallback(async () => {
    if (!isSignedIn) {
      toast.error('Please sign in to generate content');
      return;
    }
    if (!canSubmit()) {
      toast.error('Add a prompt, URL, or at least one image');
      return;
    }

    setShowPreview(false);
    setLoading(true);
    setResult(null);
    setLoadingStep('Uploading & preparing...');

    try {
      const form = new FormData();
      form.set('websiteUrl', websiteUrl.trim());
      form.set('userPrompt', userPrompt.trim());
      form.set('platform', platform);
      form.set('publish', String(publish));
      items.forEach((item) => form.append('images', item.file));

      const res = await fetch('/api/stream', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Request failed (${res.status})`);
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
              content?: string;
              summary?: string;
              qualityScore?: number;
              wordCount?: number;
              platform?: string;
              executionId?: string;
              mediaAssets?: GenerateResult['mediaAssets'];
            };

            if (data.type === 'status' && data.message) setLoadingStep(data.message);
            if (data.type === 'complete') {
              setResult({
                content: data.content,
                summary: data.summary,
                qualityScore: data.qualityScore,
                wordCount: data.wordCount,
                platformName: data.platform,
                executionId: data.executionId,
                mediaAssets: data.mediaAssets,
              });
              clearAll();
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  }, [
    isSignedIn,
    canSubmit,
    websiteUrl,
    userPrompt,
    platform,
    publish,
    items,
    clearAll,
  ]);

  const copyToClipboard = async () => {
    if (!result?.content) return;
    try {
      await navigator.clipboard.writeText(result.content);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const instagramHint =
    platformRecommendsImages(platform) && items.length === 0
      ? 'Instagram works best with at least one image attached.'
      : null;

  return (
    <section id="generate" style={{ padding: '0 0 4rem' }}>
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="composer-shell">
          <div className="composer-header">
            <h2 className="composer-title">Create your post</h2>
            <p className="composer-subtitle">
              Prompt, URL, and images — mix and match like a modern AI composer.
            </p>
          </div>

          <div className={`composer-box${loading ? ' composer-box--loading' : ''}`}>
            <MediaThumbnailGrid items={items} onRemove={removeItem} disabled={loading} />

            <textarea
              id="userPrompt"
              className="composer-textarea"
              placeholder="Describe the post you want — tone, angle, audience..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              disabled={loading}
              rows={4}
            />

            <div className="composer-url-row">
              <span className="composer-url-icon" aria-hidden>
                🔗
              </span>
              <input
                id="websiteUrl"
                className="composer-url-input"
                type="url"
                placeholder="Optional: paste a URL to crawl for context"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={loading}
              />
            </div>

            <MediaDropzone
              disabled={loading || items.length >= MAX_IMAGES_PER_POST}
              onFiles={addFiles}
              hasImages={items.length > 0}
            />

            {(mediaError || instagramHint) && (
              <p className="composer-hint composer-hint--warn">
                {mediaError ?? instagramHint}
              </p>
            )}

            {mediaCaps.supportsImages && items.length > 0 && (
              <p className="composer-hint">{mediaCaps.hint}</p>
            )}

            <div className="composer-toolbar">
              <select
                id="platform"
                className="composer-select"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={loading}
                aria-label="Target platform"
              >
                {listPlatformsForSelect().map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.label}
                  </option>
                ))}
              </select>

              {supportsPublishConnect(platform) && (
                <label className="composer-publish">
                  <input
                    type="checkbox"
                    checked={publish}
                    onChange={(e) => setPublish(e.target.checked)}
                    disabled={loading}
                  />
                  Auto-publish
                </label>
              )}

              <div className="composer-actions">
                {!loading && items.length + (userPrompt.trim() ? 1 : 0) + (websiteUrl.trim() ? 1 : 0) > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost composer-preview-btn"
                    onClick={() => setShowPreview((v) => !v)}
                  >
                    {showPreview ? 'Hide preview' : 'Preview'}
                  </button>
                )}

                {isSignedIn ? (
                  <button
                    type="button"
                    className="btn btn-primary composer-submit"
                    onClick={handleGenerate}
                    disabled={loading || !canSubmit()}
                  >
                    {loading ? 'Generating…' : 'Generate →'}
                  </button>
                ) : (
                  <SignInButton mode="modal">
                    <button type="button" className="btn btn-primary composer-submit">
                      Sign in to generate
                    </button>
                  </SignInButton>
                )}
              </div>
            </div>
          </div>

          {getPlatformDescription(platform) && (
            <p className="composer-footnote">{getPlatformDescription(platform)}</p>
          )}

          {showPreview && !loading && (
            <div className="composer-preview-panel">
              <h3 className="composer-preview-title">Before you submit</h3>
              {userPrompt.trim() && (
                <p>
                  <strong>Prompt:</strong> {userPrompt.trim()}
                </p>
              )}
              {websiteUrl.trim() && (
                <p>
                  <strong>URL:</strong> {websiteUrl.trim()}
                </p>
              )}
              {items.length > 0 && (
                <p>
                  <strong>Images:</strong> {items.length} attached
                </p>
              )}
              <p>
                <strong>Platform:</strong>{' '}
                {listPlatformsForSelect().find((p) => p.id === platform)?.label}
              </p>
            </div>
          )}

          {loading && (
            <div className="composer-status">
              <span className="spinner" />
              {loadingStep || 'Generating...'}
            </div>
          )}
        </div>

        {result?.content && (
          <ContentPreview
            content={result.content}
            summary={result.summary}
            qualityScore={result.qualityScore}
            wordCount={result.wordCount}
            platform={result.platformName}
            mediaUrls={result.mediaAssets?.map((m) => m.url)}
            onCopy={copyToClipboard}
          />
        )}
      </div>
    </section>
  );
}
