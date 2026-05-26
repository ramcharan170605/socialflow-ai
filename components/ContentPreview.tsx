'use client';

interface ContentPreviewProps {
  content: string;
  summary?: string;
  qualityScore?: number;
  wordCount?: number;
  platform?: string;
  onCopy: () => void;
}

export function ContentPreview({
  content,
  summary,
  qualityScore,
  wordCount,
  platform,
  onCopy,
}: ContentPreviewProps) {
  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ fontSize: '1rem' }}>Generated preview</h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {platform && (
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.6rem',
                borderRadius: 999,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
              }}
            >
              {platform}
            </span>
          )}
          {qualityScore != null && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Quality: {qualityScore}/100
            </span>
          )}
          {wordCount != null && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {wordCount} words
            </span>
          )}
        </div>
      </div>

      {summary && (
        <details style={{ marginBottom: '1rem' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Article summary
          </summary>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {summary}
          </p>
        </details>
      )}

      <pre
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'inherit',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          padding: '1rem',
          background: 'var(--bg)',
          borderRadius: 8,
          border: '1px solid var(--border)',
          maxHeight: 400,
          overflow: 'auto',
        }}
      >
        {content}
      </pre>

      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: '1rem' }}
        onClick={onCopy}
      >
        Copy to clipboard
      </button>
    </div>
  );
}
