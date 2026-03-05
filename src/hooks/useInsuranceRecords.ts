import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { InsuranceRecordRow, InsuranceRecordInsert, InsuranceRecordUpdate } from '../types/database';

export function useInsuranceRecords(artworkId: string) {
  const [records, setRecords] = useState<InsuranceRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    if (!artworkId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('insurance_records')
        .select('*')
        .eq('artwork_id', artworkId)
        .order('valid_from', { ascending: false, nullsFirst: false });
      if (fetchError) throw fetchError;
      setRecords((data as InsuranceRecordRow[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch insurance records';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [artworkId, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const createRecord = useCallback(async (data: InsuranceRecordInsert): Promise<InsuranceRecordRow | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
        return null;
      }
      const { data: created, error: insertError } = await supabase
        .from('insurance_records')
        .insert({ ...data, user_id: session.user.id })
        .select()
        .single();
      if (insertError) throw insertError;
      toast({ title: 'Insurance record added', variant: 'success' });
      await fetch();
      return created as InsuranceRecordRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create insurance record';
      toast({ title: 'Error', description: message, variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const updateRecord = useCallback(async (id: string, data: InsuranceRecordUpdate): Promise<InsuranceRecordRow | null> => {
    try {
      const { data: updated, error: updateError } = await supabase
        .from('insurance_records')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (updateError) throw updateError;
      toast({ title: 'Insurance record updated', variant: 'success' });
      await fetch();
      return updated as InsuranceRecordRow;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update insurance record';
      toast({ title: 'Error', description: message, variant: 'error' });
      return null;
    }
  }, [toast, fetch]);

  const deleteRecord = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.from('insurance_records').delete().eq('id', id);
      if (deleteError) throw deleteError;
      toast({ title: 'Insurance record deleted', variant: 'success' });
      await fetch();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete insurance record';
      toast({ title: 'Error', description: message, variant: 'error' });
      return false;
    }
  }, [toast, fetch]);

  return { records, loading, error, refetch: fetch, createRecord, updateRecord, deleteRecord };
}
