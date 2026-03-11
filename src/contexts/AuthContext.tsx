// ---------------------------------------------------------------------------
// Shared Auth Context — single source of truth for authentication state.
// All components that call useAuth() share the same session/user/profile.
// ---------------------------------------------------------------------------

import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole, UserProfileRow } from '../types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: UserRole | null;
  profile: UserProfileRow | null;
  isAdmin: boolean;
  isGallery: boolean;
  isCollector: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchProfile(userId: string): Promise<UserProfileRow | null> {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data;
  } catch {
    return null;
  }
}

async function isMfaPending(): Promise<boolean> {
  try {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const loadingResolved = useRef(false);
  const mounted = useRef(true);

  const role: UserRole | null = user ? (profile?.role ?? null) : null;

  useEffect(() => {
    mounted.current = true;

    // Safety timeout: if auth never resolves within 5 seconds, stop loading
    const timeout = setTimeout(() => {
      if (mounted.current && !loadingResolved.current) {
        loadingResolved.current = true;
        setLoading(false);
      }
    }, 5000);

    // Fetch the current session on mount
    supabase.auth
      .getSession()
      .then(async ({ data: { session: currentSession } }) => {
        if (!mounted.current) return;

        if (currentSession?.user) {
          const mfaNeeded = await isMfaPending();
          if (mfaNeeded) {
            setSession(null);
            setUser(null);
            setProfile(null);
            if (mounted.current && !loadingResolved.current) {
              loadingResolved.current = true;
              setLoading(false);
            }
            return;
          }

          setSession(currentSession);
          setUser(currentSession.user);
          const profileData = await fetchProfile(currentSession.user.id);
          if (mounted.current) setProfile(profileData);
        } else {
          setSession(null);
          setUser(null);
        }

        if (mounted.current && !loadingResolved.current) {
          loadingResolved.current = true;
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted.current && !loadingResolved.current) {
          loadingResolved.current = true;
          setLoading(false);
        }
      });

    // Listen for auth state changes (shared across ALL consumers).
    // IMPORTANT: The INITIAL_SESSION event fires immediately on registration
    // with the cached session — which may hold an EXPIRED access token.
    // We must NOT resolve loading from INITIAL_SESSION because getSession()
    // (above) properly refreshes expired tokens before resolving. Letting
    // INITIAL_SESSION set loading=false would allow pages to query Supabase
    // with a stale token, causing 400 errors on first load.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted.current) return;

      // Skip INITIAL_SESSION — getSession() handles the initial load
      // and ensures the token is refreshed before we resolve loading.
      if (event === 'INITIAL_SESSION') return;

      if (newSession?.user) {
        const mfaNeeded = await isMfaPending();
        if (mfaNeeded) {
          setSession(null);
          setUser(null);
          setProfile(null);
          return;
        }

        setSession(newSession);
        setUser(newSession.user);
        const profileData = await fetchProfile(newSession.user.id);
        if (mounted.current) setProfile(profileData);
      } else {
        setSession(newSession);
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      mounted.current = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // Session inactivity timeout (30 minutes)
  useEffect(() => {
    if (!user) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const INACTIVITY_LIMIT = 30 * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        supabase.auth.signOut();
      }, INACTIVITY_LIMIT);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => document.removeEventListener(event, resetTimer));
    };
  }, [user]);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Session update happens via onAuthStateChange listener above
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    loading,
    role,
    profile,
    isAdmin: role === 'admin',
    isGallery: role === 'gallery',
    isCollector: role === 'collector',
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
