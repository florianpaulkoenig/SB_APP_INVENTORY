import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.',
  );
}

// Custom lock implementation: uses navigator.locks when available (proper
// cross-tab synchronisation), falls back to a no-op lock in environments
// where navigator.locks hangs (e.g. some WebViews).
//
// Two-layer timeout:
//   1. Abort lock ACQUISITION if it takes longer than `acquireTimeout`.
//   2. Race the callback with a hard deadline so a hanging `fn()` never
//      holds the lock forever (prevents sign-in from being blocked).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeLock(name: string, acquireTimeout: number, fn: () => Promise<any>): Promise<any> {
  // Hard ceiling: callback must finish within 2× acquireTimeout (min 10 s).
  const callbackTimeout = Math.max(acquireTimeout * 2, 10_000);

  // Wraps fn() with a timeout race so it can never hold the lock forever.
  const withTimeout = () =>
    Promise.race([
      fn(),
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error('Lock callback timed out')), callbackTimeout),
      ),
    ]);

  if (typeof navigator !== 'undefined' && navigator.locks) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), acquireTimeout);
    try {
      return await navigator.locks.request(
        name,
        { signal: controller.signal },
        () => withTimeout(),
      );
    } catch {
      // If lock request was aborted or callback timed out, execute without lock
      return await fn();
    } finally {
      clearTimeout(timeoutId);
    }
  }
  // No navigator.locks available — execute directly
  return await fn();
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: safeLock,
  },
});
