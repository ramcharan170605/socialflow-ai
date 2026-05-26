const features = [
  {
    title: 'Smart crawling',
    desc: 'Firecrawl extracts clean, AI-ready content from any public webpage.',
  },
  {
    title: '10+ platforms',
    desc: 'LinkedIn, Instagram, Facebook Pages, Threads, and more.',
  },
  {
    title: 'n8n automation',
    desc: 'Production workflow powers summarization and generation at scale.',
  },
  {
    title: 'Preview & history',
    desc: 'Review content before publishing. Save prompts and past generations.',
  },
];

export function ProductFeatures() {
  return (
    <section style={{ padding: '2rem 0 3rem' }}>
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '1.5rem' }}>
          How it works
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {features.map((f, i) => (
            <div key={f.title} className="card">
              <span
                style={{
                  display: 'inline-block',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'var(--gradient)',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  lineHeight: '28px',
                  textAlign: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                {i + 1}
              </span>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
