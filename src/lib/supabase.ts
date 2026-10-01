import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import { deepClean } from './sanitizeText';
import { SessionExpiredError } from './errors';

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

// Token refresh must fail fast: auth-js only retries a refresh while the
// attempts fit into its 30s auto-refresh tick. With the general 30s timeout a
// single hung attempt (dead socket after laptop wake) ate the whole window and
// the refresh gave up without ever retrying.
const AUTH_TIMEOUT_MS = 8_000;

// Local-storage key under which auth-js persists the session
// ("sb-<project-ref>-auth-token").
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const SESSION_STORAGE_KEY = `sb-${projectRef}-auth-token`;

function hasStoredSession(): boolean {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY) != null;
  } catch {
    return false;
  }
}

function readHeader(headers: HeadersInit | undefined, name: string): string | null {
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get(name);
  if (Array.isArray(headers)) {
    const hit = headers.find(([k]) => k.toLowerCase() === name.toLowerCase());
    return hit ? hit[1] : null;
  }
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? (headers as Record<string, string>)[key] : null;
}

function withHeader(headers: HeadersInit | undefined, name: string, value: string): HeadersInit {
  if (headers instanceof Headers) {
    const h = new Headers(headers);
    h.set(name, value);
    return h;
  }
  if (Array.isArray(headers)) {
    return [...headers.filter(([k]) => k.toLowerCase() !== name.toLowerCase()), [name, value]];
  }
  const out: Record<string, string> = { ...(headers as Record<string, string> | undefined) };
  for (const k of Object.keys(out)) if (k.toLowerCase() === name.toLowerCase()) delete out[k];
  out[name] = value;
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// supabase-js silently falls back to the anon key when auth.getSession()
// yields no session — which happens whenever a token refresh failed
// (network not yet up after sleep, hung socket …) even though the session
// is still in storage. A write sent with the anon key is blocked by RLS:
// PostgREST answers "0 rows" without an error, so the save looked like it
// did nothing until the user reloaded the page. Recover the session here
// and, if that is impossible, fail loudly instead of silently.
async function ensureUserToken(): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(500 * attempt);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (data.session?.access_token) return data.session.access_token;
      lastError = error;
      // Non-retryable auth error: auth-js already removed the session.
      if (error && !hasStoredSession()) break;
    } catch (err) {
      lastError = err;
    }
  }
  console.warn('[supabase] could not recover user session', lastError);
  throw new SessionExpiredError();
}

const guardedFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const opts: RequestInit = { ...init };

  const isAuthRequest = url.includes('/auth/v1/');
  if (!isAuthRequest) {
    const auth = readHeader(opts.headers, 'Authorization');
    if (auth === `Bearer ${supabaseAnonKey}` && hasStoredSession()) {
      const token = await ensureUserToken();
      opts.headers = withHeader(opts.headers, 'Authorization', `Bearer ${token}`);
    }
  }

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
    opts.signal = AbortSignal.timeout(isAuthRequest ? AUTH_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
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
