import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { UserProfileRow, UserProfileUpdate, UserRole } from '../types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserProfileWithEmail extends UserProfileRow {
  email: string;
}

// ---------------------------------------------------------------------------
// useUserProfiles -- Admin-only hook: list, update, delete, invite users
// ---------------------------------------------------------------------------

export function useUserProfiles() {
  const [profiles, setProfiles] = useState<UserProfileWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // ---- Fetch all user profiles ----------------------------------------------

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Since we cannot query auth.users from the client, we map profiles
      // and use display_name as a stand-in. The email field is left empty
      // unless we can resolve it from a separate source in the future.
      const profilesWithEmail: UserProfileWithEmail[] = ((data as UserProfileRow[]) ?? []).map(
        (profile) => ({
          ...profile,
          email: '', // Not available from client-side; display display_name instead
        }),
      );

      setProfiles(profilesWithEmail);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user profiles';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  // ---- Update a user profile ------------------------------------------------

  const updateProfile = useCallback(async (id: string, data: UserProfileUpdate): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(data)
        .eq('id', id);

      if (updateError) throw updateError;

      toast({ title: 'Profile updated', variant: 'success' });
      await fetchProfiles();

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      toast({ title: 'Error', description: message, variant: 'error' });
      return false;
    }
  }, [toast, fetchProfiles]);

  // ---- Delete a user profile ------------------------------------------------
  // NOTE: This only deletes the user_profile row. The actual auth user
  // deletion must happen server-side (e.g. via an Edge Function or the
  // Supabase dashboard) using the Admin API.

  const deleteProfile = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast({ title: 'Profile deleted', description: 'Note: the auth user must be removed server-side.', variant: 'success' });
      await fetchProfiles();

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete profile';
      toast({ title: 'Error', description: message, variant: 'error' });
      return false;
    }
  }, [toast, fetchProfiles]);

  // ---- Invite a new user (via Edge Function) --------------------------------

  const inviteUser = useCallback(async (
    email: string,
    role: UserRole,
    displayName: string,
    galleryId?: string,
    contactId?: string,
  ): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return false;
      }

      const { data, error: fnError } = await supabase.functions.invoke('invite-user', {
        body: {
          email,
          role,
          display_name: displayName,
          gallery_id: galleryId ?? null,
          contact_id: contactId ?? null,
        },
      });

      if (fnError) throw fnError;

      // Check if the edge function returned an error payload
      if (data?.error) {
        throw new Error(data.error);
      }

      toast({ title: 'User invited', description: `Invitation sent to ${email}`, variant: 'success' });
      await fetchProfiles();

      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to invite user';
      toast({ title: 'Error', description: message, variant: 'error' });
      return false;
    }
  }, [toast, fetchProfiles]);

  return { profiles, loading, error, refresh: fetchProfiles, updateProfile, deleteProfile, inviteUser };
}
