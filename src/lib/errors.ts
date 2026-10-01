// ---------------------------------------------------------------------------
// NOA Inventory -- Human-readable error descriptions for toasts
// Hooks used to swallow every failure behind "An error occurred" — which hid
// the actual cause (expired session, timeout, duplicate code …) and left the
// user guessing whether a save went through.
// ---------------------------------------------------------------------------

/** Thrown by the Supabase fetch wrapper when a request would go out without
 *  a valid user token (session lost / refresh failed). */
export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please reload the page and try again.');
    this.name = 'SessionExpiredError';
  }
}

interface ErrorLike {
  name?: string;
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
}

export function describeError(err: unknown, fallback = 'An error occurred. Please try again.'): string {
  if (err == null) return fallback;
  const e = (typeof err === 'object' ? err : { message: String(err) }) as ErrorLike;

  if (e.name === 'SessionExpiredError') return e.message ?? fallback;

  // AbortSignal.timeout / aborted fetch
  if (e.name === 'TimeoutError' || e.name === 'AbortError') {
    return 'The server did not respond in time. Check your connection and try again.';
  }
  if (e.message === 'Failed to fetch' || e.message === 'Load failed' || e.message === 'NetworkError when attempting to fetch resource.') {
    return 'No connection to the server. Check your network and try again.';
  }

  switch (e.code) {
    case 'PGRST116': // .single() got 0 rows — typically RLS hid the row (bad/expired token)
      return 'Record not found or not permitted — your session may have expired. Please reload the page.';
    case '42501': // RLS / insufficient privilege
    case 'PGRST301': // JWT expired
      return 'Not permitted — your session may have expired. Please reload the page.';
    case '23505':
      return `Duplicate value: ${e.details ?? e.message ?? 'this entry already exists.'}`;
    case '23503':
      return 'This record is still referenced by other data and cannot be changed this way.';
    case '23502':
      return `A required field is missing: ${e.message ?? ''}`.trim();
    case '22P02':
      return `Invalid value: ${e.message ?? ''}`.trim();
  }
  if (e.status === 401) return 'Not authenticated — your session has expired. Please reload the page.';

  const msg = e.message?.trim();
  if (msg) return msg.length > 220 ? `${msg.slice(0, 217)}…` : msg;
  return fallback;
}
