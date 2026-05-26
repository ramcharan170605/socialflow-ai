'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  CONNECTABLE_PLATFORMS,
  getPlatformDescription,
  getPlatformMeta,
} from '@/lib/platforms/catalog';

interface AccountInfo {
  id: string;
  platform: string;
  username?: string;
  displayName?: string;
  status: string;
  authMethod: string;
  lastError?: string;
  connectedAt?: string;
}

interface PlatformAvailability {
  platform: string;
  authMethod: string;
  connected: boolean;
  comingSoon?: boolean;
  account: AccountInfo | null;
}

function platformIcon(platform: string): string {
  return getPlatformMeta(platform)?.icon ?? '•';
}

function platformLabel(platform: string): string {
  return getPlatformMeta(platform)?.label ?? platform;
}

export function ConnectedAccounts() {
  const [available, setAvailable] = useState<PlatformAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKeyModal, setApiKeyModal] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/platforms/accounts');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setAvailable(data.available ?? []);
    } catch {
      toast.error('Could not load connected accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) toast.success(`${platformLabel(connected)} connected`);
    if (error) toast.error(`Connection failed: ${error}`);
  }, [load]);

  const handleConnect = (platform: string, authMethod: string, comingSoon?: boolean) => {
    if (comingSoon) {
      toast.message(`${platformLabel(platform)} connection is coming soon`);
      return;
    }
    if (authMethod === 'api_key') {
      setApiKeyModal(platform);
      return;
    }
    window.location.href = `/api/platforms/connect/${platform}?redirect=/dashboard?tab=connections`;
  };

  const handleApiKeySubmit = async () => {
    if (!apiKeyModal || !apiKeyInput.trim()) return;
    try {
      const res = await fetch(
        `/api/platforms/connect/${apiKeyModal}/api-key`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      toast.success(`${platformLabel(apiKeyModal)} connected`);
      setApiKeyModal(null);
      setApiKeyInput('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  const handleDisconnect = async (platform: string) => {
    try {
      const res = await fetch(`/api/platforms/disconnect/${platform}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Disconnect failed');
      toast.success(`${platformLabel(platform)} disconnected`);
      load();
    } catch {
      toast.error('Could not disconnect');
    }
  };

  if (loading) {
    return <div className="skeleton" style={{ height: 200 }} />;
  }

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
        Connected platforms
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
        Connect your creator accounts once. Tokens stay encrypted in MongoDB and
        are injected per run — never stored in n8n.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {CONNECTABLE_PLATFORMS.map((platform) => {
          const item =
            available.find((a) => a.platform === platform) ?? {
              platform,
              authMethod:
                getPlatformMeta(platform)?.authMethod === 'api_key'
                  ? 'api_key'
                  : 'oauth2',
              connected: false,
              comingSoon: getPlatformMeta(platform)?.comingSoon,
              account: null,
            };
          const label = platformLabel(platform);
          const icon = platformIcon(platform);
          const status = item.account?.status ?? 'not_connected';
          const comingSoon = item.comingSoon ?? false;

          return (
            <div
              key={platform}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <span
                  aria-hidden
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </span>
                <div>
                  <span style={{ fontWeight: 600 }}>{label}</span>
                  {comingSoon && (
                    <span
                      style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.7rem',
                        color: 'var(--accent)',
                        fontWeight: 600,
                      }}
                    >
                      Coming soon
                    </span>
                  )}
                  <span
                    style={{
                      marginLeft: comingSoon ? '0.35rem' : '0.5rem',
                      fontSize: '0.75rem',
                      color:
                        status === 'connected'
                          ? 'var(--success)'
                          : status === 'expired'
                            ? 'var(--error)'
                            : 'var(--text-muted)',
                    }}
                  >
                    {item.connected ? status : 'not connected'}
                  </span>
                  {getPlatformDescription(platform) && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {getPlatformDescription(platform)}
                    </p>
                  )}
                  {item.account?.displayName && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {item.account.displayName}
                      {item.account.username ? ` (@${item.account.username})` : ''}
                    </p>
                  )}
                  {item.account?.lastError && status !== 'connected' && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--error)' }}>
                      {item.account.lastError}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {item.connected ? (
                  <>
                    {status === 'expired' && !comingSoon && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        onClick={() =>
                          handleConnect(platform, item.authMethod, comingSoon)
                        }
                      >
                        Reconnect
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => handleDisconnect(platform)}
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    disabled={comingSoon}
                    onClick={() =>
                      handleConnect(platform, item.authMethod, comingSoon)
                    }
                  >
                    {comingSoon ? 'Coming soon' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {apiKeyModal && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            border: '1px solid var(--accent)',
            borderRadius: 8,
          }}
        >
          <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
            Enter {platformLabel(apiKeyModal)} API key
          </p>
          <input
            className="input"
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Paste API key..."
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button type="button" className="btn btn-primary" onClick={handleApiKeySubmit}>
              Save
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setApiKeyModal(null);
                setApiKeyInput('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
