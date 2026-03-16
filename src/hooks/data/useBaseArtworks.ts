// ---------------------------------------------------------------------------
// Base artworks data hook — single source of truth for artwork inventory
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { getCached, setCache } from './cache';

const CACHE_KEY = 'base_artworks';

export interface BaseArtwork {
  id: string;
  title: string;
  series: string | null;
  category: string | null;
  status: string;
  price: number | null;
  currency: string;
  size_category: string | null;
  gallery_id: string | null;
  consigned_since: string | null;
  year: number | null;
  created_at: string;
  released_at: string | null;
}

export function useBaseArtworks() {
  const [data, setData] = useState<BaseArtwork[] | null>(getCached<BaseArtwork[]>(CACHE_KEY));
  const [loading, setLoading] = useState(!data);

  const fetch = useCallback(async () => {
    const cached = getCached<BaseArtwork[]>(CACHE_KEY);
    if (cached) { setData(cached); setLoading(false); return; }

    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) { setLoading(false); return; }

    const { data: artworks } = await supabase
      .from('artworks')
      .select('id, title, series, category, status, price, currency, size_category, gallery_id, consigned_since, year, created_at, released_at')
      .order('created_at', { ascending: false });

    const result = (artworks as BaseArtwork[]) ?? [];
    setCache(CACHE_KEY, result);
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { artworks: data, loading, refetch: () => { setCache(CACHE_KEY, null as never); fetch(); } };
}
