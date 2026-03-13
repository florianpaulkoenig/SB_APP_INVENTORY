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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function safeLock(name: string, acquireTimeout: number, fn: () => Promise<any>): Promise<any> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), acquireTimeout);
    try {
      return await navigator.locks.request(
        name,
        { signal: controller.signal },
        async () => fn(),
      );
    } catch {
      // If lock request was aborted or failed, execute without lock
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
