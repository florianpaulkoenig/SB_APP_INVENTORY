import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ReminderRow, ReminderInsert, ReminderUpdate, ReminderType } from '../types/database';

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface ReminderFilters {
  type?: ReminderType;
  sent?: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useReminders(filters: ReminderFilters = {}) {
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // ---- Fetch reminders ----------------------------------------------------

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('reminders')
        .select('*')
        .eq('user_id', session.user.id);

      // Type filter
      if (filters.type !== undefined) {
        query = query.eq('type', filters.type);
      }

      // Sent filter
      if (filters.sent !== undefined) {
        query = query.eq('sent', filters.sent);
      }

      // Order by trigger_date ascending
      query = query.order('trigger_date', { ascending: true });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setReminders((data as ReminderRow[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch reminders';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters.type, filters.sent, toast]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // ---- Create reminder ----------------------------------------------------

  const createReminder = useCallback(
    async (data: ReminderInsert): Promise<ReminderRow | null> => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return null;
        }

        const { data: created, error: insertError } = await supabase
          .from('reminders')
          .insert({ ...data, user_id: session.user.id } as never)
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Reminder created', variant: 'success' });
        await fetchReminders();

        return created as ReminderRow;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create reminder';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast, fetchReminders],
  );

  // ---- Update reminder ----------------------------------------------------

  const updateReminder = useCallback(
    async (id: string, data: ReminderUpdate): Promise<ReminderRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('reminders')
          .update(data as never)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Reminder updated', variant: 'success' });
        await fetchReminders();

        return updated as ReminderRow;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update reminder';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast, fetchReminders],
  );

  // ---- Delete reminder ----------------------------------------------------

  const deleteReminder = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('reminders')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Reminder deleted', variant: 'success' });
        await fetchReminders();

        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete reminder';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return false;
      }
    },
    [toast, fetchReminders],
  );

  // ---- Mark sent (convenience) --------------------------------------------

  const markSent = useCallback(
    async (id: string): Promise<ReminderRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('reminders')
          .update({ sent: true } as never)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Reminder marked as sent', variant: 'success' });
        await fetchReminders();

        return updated as ReminderRow;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to mark reminder as sent';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast, fetchReminders],
  );

  return {
    reminders,
    loading,
    error,
    refetch: fetchReminders,
    createReminder,
    updateReminder,
    deleteReminder,
    markSent,
  };
}
