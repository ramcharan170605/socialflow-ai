export function Hero() {
  return (
    <section style={{ padding: '4rem 0 2rem', textAlign: 'center' }}>
      <div className="container">
        <p
          style={{
            display: 'inline-block',
            padding: '0.35rem 0.85rem',
            borderRadius: 999,
            border: '1px solid var(--border)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginBottom: '1.25rem',
          }}
        >
          AI-powered social content from any URL
        </p>
        <h1
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.25rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: '1rem',
            letterSpacing: '-0.02em',
          }}
        >
          Turn websites into{' '}
          <span
            style={{
              background: 'var(--gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            platform-ready posts
          </span>
        </h1>
        <p
          style={{
            maxWidth: 560,
            margin: '0 auto',
            color: 'var(--text-muted)',
            fontSize: '1.1rem',
          }}
        >
          Paste a URL, describe what you want, pick a platform — we crawl, summarize,
          and generate copy optimized for LinkedIn, Instagram, Facebook Pages, Threads, and more.
        </p>
      </div>
    </section>
  );
}
