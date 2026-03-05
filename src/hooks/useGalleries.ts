import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { GalleryRow, GalleryInsert, GalleryUpdate } from '../types/database';

// ---------------------------------------------------------------------------
// Filter / pagination types
// ---------------------------------------------------------------------------

export interface GalleryFilters {
  search?: string;
  country?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseGalleriesOptions {
  filters?: GalleryFilters;
  page?: number;
  pageSize?: number;
}

export interface UseGalleriesReturn {
  galleries: GalleryRow[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
  createGallery: (data: GalleryInsert) => Promise<GalleryRow | null>;
  updateGallery: (id: string, data: GalleryUpdate) => Promise<GalleryRow | null>;
  deleteGallery: (id: string) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGalleries(options: UseGalleriesOptions = {}): UseGalleriesReturn {
  const { filters = {}, page = 1, pageSize = 24 } = options;

  const [galleries, setGalleries] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  // ---- Fetch galleries ----------------------------------------------------

  const fetchGalleries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('galleries')
        .select('*', { count: 'exact' });

      // Search filter: match name, city, or country
      if (filters.search) {
        const term = `%${filters.search}%`;
        query = query.or(
          `name.ilike.${term},city.ilike.${term},country.ilike.${term}`,
        );
      }

      // Country filter
      if (filters.country) {
        query = query.eq('country', filters.country);
      }

      // Sorting
      const sortBy = filters.sortBy || 'name';
      const sortOrder = filters.sortOrder || 'asc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination (offset-based via .range)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setGalleries((data as GalleryRow[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch galleries';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.country, filters.sortBy, filters.sortOrder, page, pageSize, toast]);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  // ---- Create gallery -----------------------------------------------------

  const createGallery = useCallback(
    async (data: GalleryInsert): Promise<GalleryRow | null> => {
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
          .from('galleries')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Gallery created', description: `"${created.name}" has been added.`, variant: 'success' });

        return created as GalleryRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create gallery';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast],
  );

  // ---- Update gallery -----------------------------------------------------

  const updateGallery = useCallback(
    async (id: string, data: GalleryUpdate): Promise<GalleryRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('galleries')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Gallery updated', description: `"${updated.name}" has been saved.`, variant: 'success' });

        return updated as GalleryRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update gallery';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast],
  );

  // ---- Delete gallery -----------------------------------------------------

  const deleteGallery = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('galleries')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Gallery deleted', variant: 'success' });

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete gallery';
        toast({ title: 'Error', description: message, variant: 'error' });
        return false;
      }
    },
    [toast],
  );

  return {
    galleries,
    loading,
    error,
    totalCount,
    refetch: fetchGalleries,
    createGallery,
    updateGallery,
    deleteGallery,
  };
}
