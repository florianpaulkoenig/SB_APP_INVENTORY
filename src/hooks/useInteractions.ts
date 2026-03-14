import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { InteractionRow, InteractionInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseInteractionsReturn {
  interactions: InteractionRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createInteraction: (data: InteractionInsert) => Promise<InteractionRow | null>;
  deleteInteraction: (id: string) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useInteractions(contactId: string): UseInteractionsReturn {
  const [interactions, setInteractions] = useState<InteractionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // ---- Fetch interactions --------------------------------------------------

  const fetchInteractions = useCallback(async () => {
    if (!contactId) {
      setInteractions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('interactions')
        .select('*')
        .eq('contact_id', contactId)
        .order('interaction_date', { ascending: false });

      if (fetchError) throw fetchError;

      setInteractions((data as InteractionRow[]) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch interactions';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [contactId, toast]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  // ---- Create interaction --------------------------------------------------

  const createInteraction = useCallback(
    async (data: InteractionInsert): Promise<InteractionRow | null> => {
      try {
        // Auto-set user_id from current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return null;
        }

        const { data: created, error: insertError } = await supabase
          .from('interactions')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Interaction created', description: `${created.type} interaction has been added.`, variant: 'success' });

        await fetchInteractions();
        return created as InteractionRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create interaction';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast, fetchInteractions],
  );

  // ---- Delete interaction --------------------------------------------------

  const deleteInteraction = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('interactions')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Interaction deleted', variant: 'success' });

        await fetchInteractions();
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete interaction';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return false;
      }
    },
    [toast, fetchInteractions],
  );

  return {
    interactions,
    loading,
    error,
    refetch: fetchInteractions,
    createInteraction,
    deleteInteraction,
  };
}
