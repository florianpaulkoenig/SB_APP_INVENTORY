import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: noopLock,
  },
});
