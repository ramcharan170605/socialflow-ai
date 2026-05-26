export const dynamic = 'force-dynamic';

import { Hero } from '@/components/Hero';
import { ProductFeatures } from '@/components/ProductFeatures';
import { GenerateForm } from '@/components/GenerateForm';

export default function HomePage() {
  return (
    <>
      <Hero />
      <GenerateForm />
      <ProductFeatures />
      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '2rem 0',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
        }}
      >
        <div className="container">
          SocialFlow AI — Powered by Firecrawl, n8n, and Next.js
        </div>
      </footer>
    </>
  );
}
