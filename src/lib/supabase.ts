import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { deepClean } from './sanitizeText';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
  );
}

// No-op lock: bypasses navigator.locks entirely.
//
// The default Supabase auth client uses navigator.locks for cross-tab token
// synchronisation. However, in practice this causes sign-in to hang
// indefinitely when the lock callback never resolves (stale token refresh,
// MFA handshake issues, etc.). Since this is a single-user app, the
// cross-tab lock provides no real benefit — disabling it ensures auth
// always works.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function noopLock(_name: string, _acquireTimeout: number, fn: () => Promise<any>): Promise<any> {
  return await fn();
}

// Fail fast instead of hanging forever: without a timeout, a request sent
// over a dead connection (laptop wake, network switch) blocks the UI's
// loading state indefinitely and the app appears frozen until a manual
// page refresh. Storage requests are exempt — large image uploads can
// legitimately take longer.
const REQUEST_TIMEOUT_MS = 30_000;

const guardedFetch: typeof fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const opts: RequestInit = { ...init };

  // Sanitize JSON write bodies to the REST API so text pasted from
  // websites/PDFs (control chars, lone surrogates, zero-width chars)
  // can't make Postgres reject the save.
  const method = (opts.method ?? 'GET').toUpperCase();
  if (
    url.includes('/rest/v1/') &&
    (method === 'POST' || method === 'PATCH' || method === 'PUT') &&
    typeof opts.body === 'string' &&
    opts.body.length > 0
  ) {
    try {
      opts.body = JSON.stringify(deepClean(JSON.parse(opts.body)));
    } catch {
      // Body is not JSON — leave it untouched.
    }
  }

  if (!opts.signal && !url.includes('/storage/v1/')) {
    opts.signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  }

  return fetch(input, opts);
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: noopLock,
  },
  global: {
    fetch: guardedFetch,
  },
});
