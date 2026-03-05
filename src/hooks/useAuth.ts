import { useEffect, useState } from 'react';
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
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileRow | null>(null);

  // Derive role -- default to 'admin' for backward compatibility when no
  // profile row exists yet (e.g. florian.koenig@noacontemporary.com).
  const role: UserRole | null = user ? (profile?.role ?? 'admin') : null;

  useEffect(() => {
    // Fetch the current session on mount
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const profileData = await fetchProfile(currentSession.user.id);
        setProfile(profileData);
      }

      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        const profileData = await fetchProfile(newSession.user.id);
        setProfile(profileData);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
