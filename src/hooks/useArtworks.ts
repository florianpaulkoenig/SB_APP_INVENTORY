import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { sanitizeFilterTerm } from '../lib/utils';
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
  excludeStatus?: ArtworkStatus;
  category?: ArtworkCategory;
  motif?: ArtworkMotif;
  series?: ArtworkSeries;
  gallery_id?: string;
  year?: number;
  color?: string;
  medium?: string;
  minHeight?: number;
  maxHeight?: number;
  minWidth?: number;
  maxWidth?: number;
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
  bulkDeleteArtworks: (ids: string[]) => Promise<boolean>;
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
        .select(
          'id, title, inventory_number, reference_code, medium, year, height, width, depth, dimension_unit, price, currency, status, category, motif, series, edition_type, edition_number, edition_total, gallery_id, current_location, created_at, galleries:gallery_id(name)',
          { count: 'exact' },
        );

      // Search filter: match across all text fields + year
      if (filters.search) {
        const term = `%${sanitizeFilterTerm(filters.search)}%`;
        const yearCondition = /^\d{4}$/.test(filters.search.trim()) ? `,year.eq.${Number(filters.search.trim())}` : '';
        query = query.or(
          `title.ilike.${term},inventory_number.ilike.${term},reference_code.ilike.${term},medium.ilike.${term},notes.ilike.${term},current_location.ilike.${term},category.ilike.${term},motif.ilike.${term},series.ilike.${term},color.ilike.${term},edition_type.ilike.${term}${yearCondition}`,
        );
      }

      // Status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      } else if (filters.excludeStatus) {
        query = query.neq('status', filters.excludeStatus);
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

      // Color filter
      if (filters.color) {
        query = query.eq('color', filters.color);
      }

      // Medium filter (partial match)
      if (filters.medium) {
        query = query.ilike('medium', `%${sanitizeFilterTerm(filters.medium)}%`);
      }

      // Height range filter
      if (filters.minHeight != null) {
        query = query.gte('height', filters.minHeight);
      }
      if (filters.maxHeight != null) {
        query = query.lte('height', filters.maxHeight);
      }

      // Width range filter
      if (filters.minWidth != null) {
        query = query.gte('width', filters.minWidth);
      }
      if (filters.maxWidth != null) {
        query = query.lte('width', filters.maxWidth);
      }

      // Sorting (whitelist to prevent SQL injection via arbitrary column names)
      const VALID_SORT_COLUMNS: readonly string[] = ['created_at', 'title', 'inventory_number', 'reference_code', 'medium', 'year', 'status', 'price', 'current_location', 'category', 'color', 'edition_type', 'motif', 'series'];
      const rawSortBy = filters.sortBy || 'created_at';
      const safeSortBy = VALID_SORT_COLUMNS.includes(rawSortBy) ? rawSortBy : 'created_at';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.order(safeSortBy, { ascending: sortOrder === 'asc' });

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
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [
    filters.search,
    filters.status,
    filters.excludeStatus,
    filters.category,
    filters.motif,
    filters.series,
    filters.gallery_id,
    filters.year,
    filters.color,
    filters.medium,
    filters.minHeight,
    filters.maxHeight,
    filters.minWidth,
    filters.maxWidth,
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

        // ---- Auto-create certificate of authenticity -------------------------
        try {
          const { data: certNumber } = await supabase.rpc('generate_document_number', {
            p_user_id: session.user.id,
            p_prefix: 'COA',
          });

          if (certNumber) {
            await supabase
              .from('certificates')
              .insert({
                user_id: session.user.id,
                artwork_id: created.id,
                certificate_number: certNumber,
                issue_date: new Date().toISOString().split('T')[0],
              } as never);
          }
        } catch {
          // Certificate auto-creation is best-effort; don't block artwork creation
        }

        toast({ title: 'Artwork created', description: `"${created.title}" has been added with certificate.`, variant: 'success' });

        await fetchArtworks();
        return created as ArtworkRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create artwork';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast, fetchArtworks],
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

        await fetchArtworks();
        return updated as ArtworkRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update artwork';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast, fetchArtworks],
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

        await fetchArtworks();
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete artwork';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return false;
      }
    },
    [toast, fetchArtworks],
  );

  // ---- Bulk delete artworks --------------------------------------------------

  const bulkDeleteArtworks = useCallback(
    async (ids: string[]): Promise<boolean> => {
      if (ids.length === 0) return true;
      try {
        const { error: deleteError } = await supabase
          .from('artworks')
          .delete()
          .in('id', ids);

        if (deleteError) throw deleteError;

        toast({
          title: 'Artworks deleted',
          description: `${ids.length} artwork${ids.length > 1 ? 's' : ''} deleted.`,
          variant: 'success',
        });

        await fetchArtworks();
        return true;
      } catch (err: unknown) {
        toast({ title: 'Error', description: 'Failed to delete artworks. Please try again.', variant: 'error' });
        return false;
      }
    },
    [toast, fetchArtworks],
  );

  // ---- Bulk update artworks --------------------------------------------------

  const bulkUpdateArtworks = useCallback(
    async (ids: string[], data: ArtworkUpdate): Promise<boolean> => {
      if (ids.length === 0) return true;
      try {
        const { error: updateError } = await supabase
          .from('artworks')
          .update(data as never)
          .in('id', ids);

        if (updateError) throw updateError;

        toast({
          title: 'Artworks updated',
          description: `${ids.length} artwork${ids.length > 1 ? 's' : ''} updated.`,
          variant: 'success',
        });

        await fetchArtworks();
        return true;
      } catch (err: unknown) {
        toast({ title: 'Error', description: 'Failed to update artworks. Please try again.', variant: 'error' });
        return false;
      }
    },
    [toast, fetchArtworks],
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
    bulkDeleteArtworks,
    bulkUpdateArtworks,
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
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
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
