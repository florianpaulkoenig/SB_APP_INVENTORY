import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { sanitizeFilterTerm } from '../lib/utils';
import type { SaleRow, SaleInsert, SaleUpdate } from '../types/database';

// ---------------------------------------------------------------------------
// Extended row type with joined data
// ---------------------------------------------------------------------------

export interface SaleWithJoins extends SaleRow {
  artworks?: { title: string; reference_code: string } | null;
  galleries?: { name: string } | null;
  contacts?: { first_name: string; last_name: string } | null;
}

// ---------------------------------------------------------------------------
// Filter / pagination types
// ---------------------------------------------------------------------------

export interface SaleFilters {
  artworkId?: string;
  galleryId?: string;
  contactId?: string;
  search?: string; // searches buyer_name
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseSalesOptions {
  filters?: SaleFilters;
  page?: number;
  pageSize?: number;
}

export interface UseSalesReturn {
  sales: SaleWithJoins[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
  createSale: (data: SaleInsert) => Promise<SaleRow | null>;
  updateSale: (id: string, data: SaleUpdate) => Promise<SaleRow | null>;
  deleteSale: (id: string) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Hook -- list all sales with optional filters
// ---------------------------------------------------------------------------

export function useSales(options: UseSalesOptions = {}): UseSalesReturn {
  const { filters = {}, page = 1, pageSize = 24 } = options;

  const [sales, setSales] = useState<SaleWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  // ---- Fetch sales --------------------------------------------------------

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('sales')
        .select(
          `*, artworks(title, reference_code), galleries(name), contacts(first_name, last_name)`,
          { count: 'exact' },
        );

      // Artwork filter
      if (filters.artworkId) {
        query = query.eq('artwork_id', filters.artworkId);
      }

      // Gallery filter
      if (filters.galleryId) {
        query = query.eq('gallery_id', filters.galleryId);
      }

      // Contact filter
      if (filters.contactId) {
        query = query.eq('contact_id', filters.contactId);
      }

      // Search filter: match buyer_name
      if (filters.search) {
        const term = `%${sanitizeFilterTerm(filters.search)}%`;
        query = query.ilike('buyer_name', term);
      }

      // Sorting
      const sortBy = filters.sortBy || 'sale_date';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination (offset-based via .range)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setSales((data as SaleWithJoins[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch sales';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters.artworkId, filters.galleryId, filters.contactId, filters.search, filters.sortBy, filters.sortOrder, page, pageSize, toast]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // ---- Create sale --------------------------------------------------------

  const createSale = useCallback(
    async (data: SaleInsert): Promise<SaleRow | null> => {
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
          .from('sales')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Sale created', description: 'Sale has been added.', variant: 'success' });
        await fetchSales();

        return created as SaleRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create sale';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchSales],
  );

  // ---- Update sale --------------------------------------------------------

  const updateSale = useCallback(
    async (id: string, data: SaleUpdate): Promise<SaleRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('sales')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Sale updated', description: 'Sale has been saved.', variant: 'success' });
        await fetchSales();

        return updated as SaleRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update sale';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchSales],
  );

  // ---- Delete sale --------------------------------------------------------

  const deleteSale = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('sales')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Sale deleted', variant: 'success' });
        await fetchSales();

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete sale';
        toast({ title: 'Error', description: message, variant: 'error' });
        return false;
      }
    },
    [toast, fetchSales],
  );

  return {
    sales,
    loading,
    error,
    totalCount,
    refetch: fetchSales,
    createSale,
    updateSale,
    deleteSale,
  };
}

// ---------------------------------------------------------------------------
// Hook -- single sale by ID
// ---------------------------------------------------------------------------

export interface UseSaleReturn {
  sale: SaleWithJoins | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSale(id: string): UseSaleReturn {
  const [sale, setSale] = useState<SaleWithJoins | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchSale = useCallback(async () => {
    if (!id) {
      setSale(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('sales')
        .select(
          `*, artworks(title, reference_code), galleries(name), contacts(first_name, last_name)`,
        )
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setSale((data as SaleWithJoins) ?? null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch sale';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchSale();
  }, [fetchSale]);

  return {
    sale,
    loading,
    error,
    refetch: fetchSale,
  };
}
