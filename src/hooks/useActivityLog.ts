import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ActivityLogRow, ActivityLogInsert } from '../types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActivityLogFilters {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  limit?: number;
}

export interface UseActivityLogReturn {
  entries: ActivityLogRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  logActivity: (data: ActivityLogInsert) => Promise<ActivityLogRow | null>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useActivityLog(filters: ActivityLogFilters = {}): UseActivityLogReturn {
  const { entityType, entityId, userId, action, limit = 100 } = filters;

  const [entries, setEntries] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // ---- Fetch activity log entries -----------------------------------------

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (entityId) {
        query = query.eq('entity_id', entityId);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (action) {
        query = query.eq('action', action);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setEntries((data as ActivityLogRow[]) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch activity log';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, userId, action, limit, toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // ---- Log a new activity entry -------------------------------------------

  const logActivity = useCallback(
    async (data: ActivityLogInsert): Promise<ActivityLogRow | null> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return null;
        }

        const { data: created, error: insertError } = await supabase
          .from('activity_log')
          .insert({ ...data, user_id: session.user.id } as never)
          .select()
          .single();

        if (insertError) throw insertError;

        await fetchEntries();
        return created as ActivityLogRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to log activity';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchEntries],
  );

  return {
    entries,
    loading,
    error,
    refetch: fetchEntries,
    logActivity,
  };
}
