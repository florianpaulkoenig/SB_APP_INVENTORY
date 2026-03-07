// ---------------------------------------------------------------------------
// NOA Inventory -- Artwork Templates (Predefined Artworks) Hook
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ArtworkTemplateRow, ArtworkTemplateInsert } from '../types/database';

export function useArtworkTemplates() {
  const [templates, setTemplates] = useState<ArtworkTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // ---- Fetch all templates --------------------------------------------------

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('artwork_templates')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setTemplates(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load templates';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ---- Create template ------------------------------------------------------

  const createTemplate = useCallback(
    async (data: ArtworkTemplateInsert): Promise<ArtworkTemplateRow | null> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return null;
        }

        const { data: created, error } = await supabase
          .from('artwork_templates')
          .insert({ ...data, user_id: session.user.id } as never)
          .select()
          .single();

        if (error) throw error;

        toast({ title: 'Template created', variant: 'success' });
        await fetchTemplates();
        return created as ArtworkTemplateRow;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create template';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast, fetchTemplates],
  );

  // ---- Update template ------------------------------------------------------

  const updateTemplate = useCallback(
    async (id: string, data: Partial<ArtworkTemplateInsert>): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('artwork_templates')
          .update(data as never)
          .eq('id', id);

        if (error) throw error;

        toast({ title: 'Template updated', variant: 'success' });
        await fetchTemplates();
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update template';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return false;
      }
    },
    [toast, fetchTemplates],
  );

  // ---- Delete template ------------------------------------------------------

  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from('artwork_templates')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast({ title: 'Template deleted', variant: 'success' });
        await fetchTemplates();
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete template';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return false;
      }
    },
    [toast, fetchTemplates],
  );

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: fetchTemplates,
  };
}
