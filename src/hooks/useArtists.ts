import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { sanitizeFilterTerm } from '../lib/utils';
import { usePortfolio } from '../contexts/PortfolioContext';
import type { ArtistRow, ArtistInsert, ArtistUpdate } from '../types/database';

export interface ArtistFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseArtistsOptions {
  filters?: ArtistFilters;
  page?: number;
  pageSize?: number;
}

export interface ArtistWithStats extends ArtistRow {
  artwork_count: number;
  total_purchase: number;
  total_estimated: number;
}

export function useArtists(options: UseArtistsOptions = {}) {
  const { filters = {}, page = 1, pageSize = 50 } = options;

  const [artists, setArtists] = useState<ArtistWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();
  const { portfolio } = usePortfolio();
  const fetchGenRef = useRef(0);

  const fetchArtists = useCallback(async () => {
    const gen = ++fetchGenRef.current;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      let query = supabase
        .from('artists')
        .select('*', { count: 'exact' })
        .eq('portfolio', portfolio)
        .eq('user_id', session.user.id);

      if (filters.search) {
        const term = `%${sanitizeFilterTerm(filters.search)}%`;
        query = query.or(`name.ilike.${term},nationality.ilike.${term}`);
      }

      const VALID_SORT = ['name', 'nationality', 'birth_year', 'created_at'] as const;
      const sortBy = (VALID_SORT as readonly string[]).includes(filters.sortBy ?? '') ? filters.sortBy! : 'name';
      query = query.order(sortBy, { ascending: (filters.sortOrder ?? 'asc') === 'asc' });

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, error: fetchError, count } = await query;
      if (gen !== fetchGenRef.current) return;
      if (fetchError) throw fetchError;

      const rows = (data ?? []) as ArtistRow[];

      // Fetch artwork stats per artist in one query
      const ids = rows.map((a) => a.id);
      let statsMap = new Map<string, { count: number; purchase: number; estimated: number }>();

      if (ids.length > 0) {
        const { data: artworks } = await supabase
          .from('artworks')
          .select('artist_id, purchase_price, estimated_value')
          .in('artist_id', ids);

        for (const aw of artworks ?? []) {
          if (!aw.artist_id) continue;
          const s = statsMap.get(aw.artist_id) ?? { count: 0, purchase: 0, estimated: 0 };
          s.count += 1;
          s.purchase += aw.purchase_price ?? 0;
          s.estimated += aw.estimated_value ?? 0;
          statsMap.set(aw.artist_id, s);
        }
      }

      setArtists(rows.map((a) => {
        const s = statsMap.get(a.id) ?? { count: 0, purchase: 0, estimated: 0 };
        return { ...a, artwork_count: s.count, total_purchase: s.purchase, total_estimated: s.estimated };
      }));
      setTotalCount(count ?? 0);
    } catch (err) {
      if (gen !== fetchGenRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to fetch artists');
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      if (gen === fetchGenRef.current) setLoading(false);
    }
  }, [filters.search, filters.sortBy, filters.sortOrder, page, pageSize, portfolio, toast]);

  useEffect(() => { fetchArtists(); }, [fetchArtists]);

  const createArtist = useCallback(async (data: ArtistInsert): Promise<ArtistRow | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { toast({ title: 'Error', description: 'Not logged in', variant: 'error' }); return null; }
      const { data: created, error } = await supabase
        .from('artists').insert({ ...data, user_id: session.user.id, portfolio } as never)
        .select().single();
      if (error) throw error;
      toast({ title: 'Artist created', variant: 'success' });
      await fetchArtists();
      return created as ArtistRow;
    } catch (err) {
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return null;
    }
  }, [toast, fetchArtists, portfolio]);

  const updateArtist = useCallback(async (id: string, data: ArtistUpdate): Promise<ArtistRow | null> => {
    try {
      const { data: updated, error } = await supabase
        .from('artists').update(data).eq('id', id).select().single();
      if (error) throw error;
      toast({ title: 'Artist updated', variant: 'success' });
      await fetchArtists();
      return updated as ArtistRow;
    } catch (err) {
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return null;
    }
  }, [toast, fetchArtists]);

  const deleteArtist = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('artists').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Artist deleted', variant: 'success' });
      await fetchArtists();
      return true;
    } catch (err) {
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
      return false;
    }
  }, [toast, fetchArtists]);

  return { artists, loading, error, totalCount, refetch: fetchArtists, createArtist, updateArtist, deleteArtist };
}

// ---------------------------------------------------------------------------
// useArtist — single artist by id with full artwork list
// ---------------------------------------------------------------------------

export function useArtist(id: string) {
  const [artist, setArtist] = useState<ArtistRow | null>(null);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: artistData, error: e1 }, { data: awData }] = await Promise.all([
        supabase.from('artists').select('*').eq('id', id).single(),
        supabase.from('artworks')
          .select('id, title, year, category, medium, purchase_price, purchase_currency, purchase_date, estimated_value, estimated_value_date, status, inventory_number')
          .eq('artist_id', id)
          .order('purchase_date', { ascending: true }),
      ]);
      if (e1) throw e1;
      setArtist(artistData as ArtistRow);
      setArtworks(awData ?? []);
    } catch (err) {
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  return { artist, artworks, loading, refetch: fetch };
}
