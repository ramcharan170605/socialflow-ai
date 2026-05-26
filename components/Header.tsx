'use client';

import Link from 'next/link';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs';
import { useTheme } from './ThemeProvider';

export function Header() {
  const { theme, toggle } = useTheme();

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-elevated)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
        }}
      >
        <Link href="/" style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text)' }}>
          <span style={{ background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SocialFlow AI
          </span>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <SignedIn>
            <Link href="/dashboard" className="hide-mobile" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Dashboard
            </Link>
          </SignedIn>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={toggle}
            aria-label="Toggle theme"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <SignedOut>
            <SignInButton mode="modal">
              <button type="button" className="btn btn-ghost">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button type="button" className="btn btn-primary">Get started</button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>
      </div>
    </header>
  );
}
