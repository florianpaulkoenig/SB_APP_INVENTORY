import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { DealRow, DealInsert, DealUpdate } from '../types/database';

// ---------------------------------------------------------------------------
// Filter / pagination types
// ---------------------------------------------------------------------------

export interface DealFilters {
  stage?: string;
  contact_id?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseDealsOptions {
  filters?: DealFilters;
  page?: number;
  pageSize?: number;
}

export interface UseDealsReturn {
  deals: DealRow[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
  createDeal: (data: DealInsert) => Promise<DealRow | null>;
  updateDeal: (id: string, data: DealUpdate) => Promise<DealRow | null>;
  deleteDeal: (id: string) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Hook – list all deals with optional filters
// ---------------------------------------------------------------------------

export function useDeals(options: UseDealsOptions = {}): UseDealsReturn {
  const { filters = {}, page = 1, pageSize = 24 } = options;

  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  // ---- Fetch deals --------------------------------------------------------

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('deals')
        .select('id, stage, value, currency, notes, contact_id, artwork_id, created_at', { count: 'exact' });

      // Stage filter
      if (filters.stage) {
        query = query.eq('stage', filters.stage);
      }

      // Contact filter
      if (filters.contact_id) {
        query = query.eq('contact_id', filters.contact_id);
      }

      // Sorting (whitelist to prevent injection)
      const ALLOWED_SORT_COLUMNS = ['created_at', 'updated_at', 'stage', 'value', 'title', 'expected_close_date'];
      const sortBy = filters.sortBy && ALLOWED_SORT_COLUMNS.includes(filters.sortBy)
        ? filters.sortBy
        : 'created_at';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination (offset-based via .range)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setDeals((data as DealRow[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch deals';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters.stage, filters.contact_id, filters.sortBy, filters.sortOrder, page, pageSize, toast]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // ---- Create deal --------------------------------------------------------

  const createDeal = useCallback(
    async (data: DealInsert): Promise<DealRow | null> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return null;
        }

        const { data: created, error: insertError } = await supabase
          .from('deals')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        // Optimistic: prepend to list and bump count
        setDeals((prev) => [created as DealRow, ...prev]);
        setTotalCount((prev) => prev + 1);
        toast({ title: 'Deal created', description: `Deal has been added.`, variant: 'success' });

        return created as DealRow;
      } catch (err: unknown) {
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast],
  );

  // ---- Update deal --------------------------------------------------------

  const updateDeal = useCallback(
    async (id: string, data: DealUpdate): Promise<DealRow | null> => {
      // Optimistic: apply update immediately
      const previous = deals;
      setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } as DealRow : d)));

      try {
        const { data: updated, error: updateError } = await supabase
          .from('deals')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Replace with server-confirmed data
        setDeals((prev) => prev.map((d) => (d.id === id ? (updated as DealRow) : d)));
        toast({ title: 'Deal updated', description: `Deal has been saved.`, variant: 'success' });

        return updated as DealRow;
      } catch (err: unknown) {
        // Rollback on error
        setDeals(previous);
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [deals, toast],
  );

  // ---- Delete deal --------------------------------------------------------

  const deleteDeal = useCallback(
    async (id: string): Promise<boolean> => {
      // Optimistic: remove from list immediately
      const previous = deals;
      setDeals((prev) => prev.filter((d) => d.id !== id));
      setTotalCount((prev) => prev - 1);

      try {
        const { error: deleteError } = await supabase
          .from('deals')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Deal deleted', variant: 'success' });
        return true;
      } catch (err: unknown) {
        // Rollback on error
        setDeals(previous);
        setTotalCount((prev) => prev + 1);
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return false;
      }
    },
    [deals, toast],
  );

  return {
    deals,
    loading,
    error,
    totalCount,
    refetch: fetchDeals,
    createDeal,
    updateDeal,
    deleteDeal,
  };
}

// ---------------------------------------------------------------------------
// Hook – deals for a specific contact
// ---------------------------------------------------------------------------

export interface UseContactDealsReturn {
  deals: DealRow[];
  loading: boolean;
  refetch: () => Promise<void>;
  createDeal: (data: DealInsert) => Promise<DealRow | null>;
  updateDeal: (id: string, data: DealUpdate) => Promise<DealRow | null>;
  deleteDeal: (id: string) => Promise<boolean>;
}

export function useContactDeals(contactId: string): UseContactDealsReturn {
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

  // ---- Fetch deals for contact --------------------------------------------

  const fetchDeals = useCallback(async () => {
    if (!contactId) {
      setDeals([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('deals')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setDeals((data as DealRow[]) ?? []);
    } catch (err: unknown) {
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [contactId, toast]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // ---- Create deal --------------------------------------------------------

  const createDeal = useCallback(
    async (data: DealInsert): Promise<DealRow | null> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return null;
        }

        const { data: created, error: insertError } = await supabase
          .from('deals')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        // Optimistic: prepend to list
        setDeals((prev) => [created as DealRow, ...prev]);
        toast({ title: 'Deal created', description: `Deal has been added.`, variant: 'success' });

        return created as DealRow;
      } catch (err: unknown) {
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast],
  );

  // ---- Update deal --------------------------------------------------------

  const updateDeal = useCallback(
    async (id: string, data: DealUpdate): Promise<DealRow | null> => {
      // Optimistic: apply update immediately
      const previous = deals;
      setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } as DealRow : d)));

      try {
        const { data: updated, error: updateError } = await supabase
          .from('deals')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        setDeals((prev) => prev.map((d) => (d.id === id ? (updated as DealRow) : d)));
        toast({ title: 'Deal updated', description: `Deal has been saved.`, variant: 'success' });

        return updated as DealRow;
      } catch (err: unknown) {
        setDeals(previous);
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [deals, toast],
  );

  // ---- Delete deal --------------------------------------------------------

  const deleteDeal = useCallback(
    async (id: string): Promise<boolean> => {
      // Optimistic: remove from list immediately
      const previous = deals;
      setDeals((prev) => prev.filter((d) => d.id !== id));

      try {
        const { error: deleteError } = await supabase
          .from('deals')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Deal deleted', variant: 'success' });
        return true;
      } catch (err: unknown) {
        setDeals(previous);
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return false;
      }
    },
    [deals, toast],
  );

  return {
    deals,
    loading,
    refetch: fetchDeals,
    createDeal,
    updateDeal,
    deleteDeal,
  };
}
