// ---------------------------------------------------------------------------
// Re-export from AuthContext for backward compatibility.
// All auth state is now shared via React Context (single source of truth).
// ---------------------------------------------------------------------------

export { useAuthContext as useAuth } from '../contexts/AuthContext';
export type { AuthContextValue as UseAuthReturn } from '../contexts/AuthContext';
