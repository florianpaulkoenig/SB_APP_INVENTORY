import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ProjectRow, ProjectInsert, ProjectUpdate } from '../types/database';

export function useProjects() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', session.user.id)
        .order('start_date', { ascending: true, nullsFirst: false });
      if (fetchError) throw fetchError;
      setProjects((data as ProjectRow[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const createProject = useCallback(async (data: ProjectInsert): Promise<ProjectRow | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return null;
      }
      const { data: created, error: insertError } = await supabase
        .from('projects')
        .insert({ ...data, user_id: session.user.id } as never)
        .select()
        .single();
      if (insertError) throw insertError;
      toast({ title: 'Project created', variant: 'success' });
      await fetch();
      return created as ProjectRow;
    } catch (err: unknown) {
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const updateProject = useCallback(async (id: string, data: ProjectUpdate): Promise<ProjectRow | null> => {
    try {
      const { data: updated, error: updateError } = await supabase
        .from('projects')
        .update(data as never)
        .eq('id', id)
        .select()
        .single();
      if (updateError) throw updateError;
      toast({ title: 'Project updated', variant: 'success' });
      await fetch();
      return updated as ProjectRow;
    } catch (err: unknown) {
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.from('projects').delete().eq('id', id);
      if (deleteError) throw deleteError;
      toast({ title: 'Project deleted', variant: 'success' });
      await fetch();
      return true;
    } catch (err: unknown) {
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return false;
    }
  }, [toast, fetch]);

  return { projects, loading, error, refetch: fetch, createProject, updateProject, deleteProject };
}
