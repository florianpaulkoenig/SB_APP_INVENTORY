import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type {
  ArtworkRow,
  ArtworkInsert,
  ArtworkUpdate,
  ArtworkStatus,
  ArtworkCategory,
  ArtworkMotif,
  ArtworkSeries,
} from '../types/database';

// ---------------------------------------------------------------------------
// Filter / pagination types
// ---------------------------------------------------------------------------

export interface ArtworkFilters {
  search?: string;
  status?: ArtworkStatus;
  category?: ArtworkCategory;
  motif?: ArtworkMotif;
  series?: ArtworkSeries;
  gallery_id?: string;
  year?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseArtworksOptions {
  filters?: ArtworkFilters;
  page?: number;
  pageSize?: number;
}

export interface UseArtworksReturn {
  artworks: ArtworkRow[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
  createArtwork: (data: ArtworkInsert) => Promise<ArtworkRow | null>;
  updateArtwork: (id: string, data: ArtworkUpdate) => Promise<ArtworkRow | null>;
  deleteArtwork: (id: string) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Hook – list of artworks
// ---------------------------------------------------------------------------

export function useArtworks(options: UseArtworksOptions = {}): UseArtworksReturn {
  const { filters = {}, page = 1, pageSize = 24 } = options;

  const [artworks, setArtworks] = useState<ArtworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  // ---- Fetch artworks ------------------------------------------------------

  const fetchArtworks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('artworks')
        .select('*', { count: 'exact' });

      // Search filter: match title, inventory_number, reference_code, or medium
      if (filters.search) {
        const term = `%${filters.search}%`;
        query = query.or(
          `title.ilike.${term},inventory_number.ilike.${term},reference_code.ilike.${term},medium.ilike.${term}`,
        );
      }

      // Status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Category filter
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      // Motif filter
      if (filters.motif) {
        query = query.eq('motif', filters.motif);
      }

      // Series filter
      if (filters.series) {
        query = query.eq('series', filters.series);
      }

      // Gallery filter
      if (filters.gallery_id) {
        query = query.eq('gallery_id', filters.gallery_id);
      }

      // Year filter
      if (filters.year) {
        query = query.eq('year', filters.year);
      }

      // Sorting
      const sortBy = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination (offset-based via .range)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setArtworks((data as ArtworkRow[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch artworks';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [
    filters.search,
    filters.status,
    filters.category,
    filters.motif,
    filters.series,
    filters.gallery_id,
    filters.year,
    filters.sortBy,
    filters.sortOrder,
    page,
    pageSize,
    toast,
  ]);

  useEffect(() => {
    fetchArtworks();
  }, [fetchArtworks]);

  // ---- Create artwork ------------------------------------------------------

  const createArtwork = useCallback(
    async (data: ArtworkInsert): Promise<ArtworkRow | null> => {
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
          .from('artworks')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Artwork created', description: `"${created.title}" has been added.`, variant: 'success' });

        return created as ArtworkRow;
      } catch (err: unknown) {
        console.error('[createArtwork] Full error:', err);
        const message =
          err instanceof Error ? err.message : 'Failed to create artwork';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast],
  );

  // ---- Update artwork ------------------------------------------------------

  const updateArtwork = useCallback(
    async (id: string, data: ArtworkUpdate): Promise<ArtworkRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('artworks')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Artwork updated', description: `"${updated.title}" has been saved.`, variant: 'success' });

        return updated as ArtworkRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update artwork';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast],
  );

  // ---- Delete artwork ------------------------------------------------------

  const deleteArtwork = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('artworks')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Artwork deleted', variant: 'success' });

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete artwork';
        toast({ title: 'Error', description: message, variant: 'error' });
        return false;
      }
    },
    [toast],
  );

  return {
    artworks,
    loading,
    error,
    totalCount,
    refetch: fetchArtworks,
    createArtwork,
    updateArtwork,
    deleteArtwork,
  };
}

// ---------------------------------------------------------------------------
// Hook – single artwork by ID
// ---------------------------------------------------------------------------

export interface UseArtworkReturn {
  artwork: ArtworkRow | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useArtwork(id: string): UseArtworkReturn {
  const [artwork, setArtwork] = useState<ArtworkRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchArtwork = useCallback(async () => {
    if (!id) {
      setArtwork(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('artworks')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setArtwork(data as ArtworkRow);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch artwork';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchArtwork();
  }, [fetchArtwork]);

  return {
    artwork,
    loading,
    error,
    refetch: fetchArtwork,
  };
}
