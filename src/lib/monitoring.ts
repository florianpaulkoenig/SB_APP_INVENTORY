import * as Sentry from '@sentry/react';

// ---------------------------------------------------------------------------
// Error monitoring — active only when VITE_SENTRY_DSN is configured.
//
// Without the env var this module is a no-op, so local dev and forks work
// unchanged. To enable in production: create a (free-tier) Sentry project,
// add VITE_SENTRY_DSN as a GitHub Actions secret and pass it to the build
// step in .github/workflows/deploy.yml.
// ---------------------------------------------------------------------------

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initMonitoring(): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    // No performance tracing / replay — errors only, keeps the free tier far
    // below quota and the bundle impact minimal.
    tracesSampleRate: 0,
    // The app handles auth data; scrub request bodies defensively.
    sendDefaultPii: false,
    beforeSend(event) {
      // Drop noisy, non-actionable browser errors
      const message = event.exception?.values?.[0]?.value ?? '';
      if (message.includes('ResizeObserver loop')) return null;
      return event;
    },
  });
}

/** Report a handled error with optional context. Safe to call when disabled. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
