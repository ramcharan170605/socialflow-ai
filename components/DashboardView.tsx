'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ConnectedAccounts } from './ConnectedAccounts';

interface Post {
  _id: string;
  websiteUrl: string;
  platform: string;
  content: string;
  qualityScore?: number;
  status: string;
  createdAt: string;
}

interface WorkflowRun {
  _id: string;
  executionId: string;
  platform: string;
  status: string;
  publishRequested: boolean;
  publishStatus?: string;
  tokensInjected: boolean;
  durationMs?: number;
  error?: string;
  createdAt: string;
}

interface UsageData {
  user: { credits: number; plan: string };
  stats: { totalPosts: number; completedExecutions: number };
  platformBreakdown: { platform: string; count: number }[];
}

type Tab = 'overview' | 'connections' | 'history';

export function DashboardView() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'overview';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [posts, setPosts] = useState<Post[]>([]);
  const [history, setHistory] = useState<WorkflowRun[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [historyRes, usageRes, workflowRes] = await Promise.all([
          fetch('/api/history?limit=10'),
          fetch('/api/usage'),
          fetch('/api/workflow/history?limit=15'),
        ]);

        if (historyRes.ok) {
          const data = await historyRes.json();
          setPosts(data.posts ?? []);
        }
        if (usageRes.ok) setUsage(await usageRes.json());
        if (workflowRes.ok) {
          const data = await workflowRes.json();
          setHistory(data.history ?? []);
        }
      } catch {
        toast.error('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'connections', label: 'Connections' },
    { id: 'history', label: 'Workflow logs' },
  ];

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem 0' }}>
        <div className="skeleton" style={{ height: 120, marginBottom: '1rem' }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 0 4rem' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>Dashboard</h1>

      <nav
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ fontSize: '0.85rem' }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'connections' && <ConnectedAccounts />}

      {tab === 'overview' && (
        <>
          {usage && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              <div className="card">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Credits</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>{usage.user.credits}</p>
              </div>
              <div className="card">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total posts</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  {usage.stats.totalPosts}
                </p>
              </div>
              <div className="card">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Executions</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                  {usage.stats.completedExecutions}
                </p>
              </div>
            </div>
          )}

          <ConnectedAccounts />

          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Recent generations</h2>
          {posts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No generations yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {posts.map((post) => (
                <div key={post._id} className="card">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {post.platform}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {post.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {post.websiteUrl}
                  </p>
                  {post.content && (
                    <p
                      style={{
                        fontSize: '0.9rem',
                        marginTop: '0.5rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {post.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <div className="card">
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Workflow execution logs</h2>
          {history.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No workflow runs yet.</p>
          ) : (
            <ul style={{ listStyle: 'none' }}>
              {history.map((run) => (
                <li
                  key={run._id}
                  style={{
                    padding: '0.75rem 0',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.9rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {run.platform}
                    </span>
                    <span
                      style={{
                        color: run.status === 'completed' ? 'var(--success)' : 'var(--error)',
                      }}
                    >
                      {run.status}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {run.executionId.slice(0, 8)}… ·{' '}
                    {new Date(run.createdAt).toLocaleString()}
                    {run.durationMs != null && ` · ${run.durationMs}ms`}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Tokens injected: {run.tokensInjected ? 'yes' : 'no'}
                    {run.publishRequested &&
                      ` · Publish: ${run.publishStatus ?? 'pending'}`}
                  </p>
                  {run.error && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--error)' }}>{run.error}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
