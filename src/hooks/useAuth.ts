import { useEffect, useState, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole, UserProfileRow } from '../types/database';

export interface UseAuthReturn {
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

async function fetchProfile(userId: string): Promise<UserProfileRow | null> {
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data;
  } catch {
    // Profile may not exist yet — not an error
    return null;
  }
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const loadingResolved = useRef(false);

  // Derive role -- require a valid profile row.  If no profile exists,
  // role remains null and the user is treated as unauthenticated / no-access.
  // The admin account MUST have a user_profiles row with role = 'admin'.
  const role: UserRole | null = user ? (profile?.role ?? null) : null;

  useEffect(() => {
    let mounted = true;

    // Safety timeout: if auth never resolves within 5 seconds, stop loading
    // so the user can at least see the login page instead of an infinite spinner.
    const timeout = setTimeout(() => {
      if (mounted && !loadingResolved.current) {
        // Session check timed out after 5s — force loading=false
        loadingResolved.current = true;
        setLoading(false);
      }
    }, 5000);

    // Fetch the current session on mount
    supabase.auth
      .getSession()
      .then(async ({ data: { session: currentSession } }) => {
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const profileData = await fetchProfile(currentSession.user.id);
          if (mounted) setProfile(profileData);
        }

        if (mounted && !loadingResolved.current) {
          loadingResolved.current = true;
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted && !loadingResolved.current) {
          loadingResolved.current = true;
          setLoading(false);
        }
      });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const profileData = await fetchProfile(newSession.user.id);
        if (mounted) setProfile(profileData);
      } else {
        setProfile(null);
      }

      if (!loadingResolved.current) {
        loadingResolved.current = true;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // Session inactivity timeout (30 minutes)
  useEffect(() => {
    if (!user) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

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

  async function signIn(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  return {
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
}
