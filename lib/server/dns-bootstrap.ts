import 'server-only';

/** Public DNS resolvers — avoids VPS/Docker hosts with broken or slow local resolvers (MongoDB Atlas SRV). */
const FALLBACK_DNS_SERVERS = ['1.1.1.1', '8.8.8.8'] as const;

let configured = false;

/**
 * Configure Node DNS before Mongoose connects.
 * Uses dynamic import so Next.js/webpack does not bundle the `dns` built-in.
 */
export async function configureDnsResolverFallback(): Promise<void> {
  if (configured) return;

  const dns = await import('node:dns');
  dns.setServers([...FALLBACK_DNS_SERVERS]);
  configured = true;
}
