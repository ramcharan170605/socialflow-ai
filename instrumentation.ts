/**
 * Next.js instrumentation hook (reserved for future server telemetry).
 * MongoDB DNS fallback runs in lib/db.ts before Mongoose connects,
 * and in scripts/docker-entrypoint.sh before the Node process starts.
 */
export async function register(): Promise<void> {
  // Intentionally empty — avoid bundling Node built-ins into edge instrumentation
}
