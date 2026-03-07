import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { GalleryTeamMemberRow, GalleryTeamMemberInsert, GalleryTeamMemberUpdate } from '../types/database';

export function useGalleryTeamMembers(galleryId: string) {
  const [members, setMembers] = useState<GalleryTeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    if (!galleryId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('gallery_team_members')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('sort_order');
      if (fetchError) throw fetchError;
      setMembers((data as GalleryTeamMemberRow[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch team members';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [galleryId, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const createMember = useCallback(async (data: GalleryTeamMemberInsert): Promise<GalleryTeamMemberRow | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return null;
      }
      const { data: created, error: insertError } = await supabase
        .from('gallery_team_members')
        .insert({ ...data, user_id: session.user.id } as never)
        .select()
        .single();
      if (insertError) throw insertError;
      toast({ title: 'Team member added', variant: 'success' });
      await fetch();
      return created as GalleryTeamMemberRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add team member';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const updateMember = useCallback(async (id: string, data: GalleryTeamMemberUpdate): Promise<GalleryTeamMemberRow | null> => {
    try {
      const { data: updated, error: updateError } = await supabase
        .from('gallery_team_members')
        .update(data as never)
        .eq('id', id)
        .select()
        .single();
      if (updateError) throw updateError;
      toast({ title: 'Team member updated', variant: 'success' });
      await fetch();
      return updated as GalleryTeamMemberRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update team member';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const deleteMember = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.from('gallery_team_members').delete().eq('id', id);
      if (deleteError) throw deleteError;
      toast({ title: 'Team member removed', variant: 'success' });
      await fetch();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove team member';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return false;
    }
  }, [toast, fetch]);

  return { members, loading, error, refetch: fetch, createMember, updateMember, deleteMember };
}
