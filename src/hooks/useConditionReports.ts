import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ConditionReportRow, ConditionReportInsert, ConditionReportUpdate } from '../types/database';

export function useConditionReports(artworkId: string) {
  const [reports, setReports] = useState<ConditionReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    if (!artworkId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('condition_reports')
        .select('*')
        .eq('artwork_id', artworkId)
        .order('report_date', { ascending: false });
      if (fetchError) throw fetchError;
      setReports((data as ConditionReportRow[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch condition reports';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [artworkId, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const createReport = useCallback(async (data: ConditionReportInsert): Promise<ConditionReportRow | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return null;
      }
      const { data: created, error: insertError } = await supabase
        .from('condition_reports')
        .insert({ ...data, user_id: session.user.id })
        .select()
        .single();
      if (insertError) throw insertError;
      toast({ title: 'Condition report added', variant: 'success' });
      await fetch();
      return created as ConditionReportRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create condition report';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const updateReport = useCallback(async (id: string, data: ConditionReportUpdate): Promise<ConditionReportRow | null> => {
    try {
      const { data: updated, error: updateError } = await supabase
        .from('condition_reports')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (updateError) throw updateError;
      toast({ title: 'Condition report updated', variant: 'success' });
      await fetch();
      return updated as ConditionReportRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update condition report';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const deleteReport = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.from('condition_reports').delete().eq('id', id);
      if (deleteError) throw deleteError;
      toast({ title: 'Condition report deleted', variant: 'success' });
      await fetch();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete condition report';
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return false;
    }
  }, [toast, fetch]);

  return { reports, loading, error, refetch: fetch, createReport, updateReport, deleteReport };
}
