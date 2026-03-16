// ---------------------------------------------------------------------------
// Base galleries data hook — single source of truth for gallery data
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { getCached, setCache } from './cache';

const CACHE_KEY = 'base_galleries';

export interface BaseGallery {
  id: string;
  name: string;
  type: string | null;
  country: string | null;
  city: string | null;
  email: string | null;
  commission_rate: number | null;
  commission_gallery: number | null;
  commission_noa: number | null;
  commission_artist: number | null;
}

export function useBaseGalleries() {
  const [data, setData] = useState<BaseGallery[] | null>(getCached<BaseGallery[]>(CACHE_KEY));
  const [loading, setLoading] = useState(!data);

  const fetch = useCallback(async () => {
    const cached = getCached<BaseGallery[]>(CACHE_KEY);
    if (cached) { setData(cached); setLoading(false); return; }

    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) { setLoading(false); return; }

    const { data: galleries } = await supabase
      .from('galleries')
      .select('id, name, type, country, city, email, commission_rate, commission_gallery, commission_noa, commission_artist')
      .order('name');

    const result = (galleries as BaseGallery[]) ?? [];
    setCache(CACHE_KEY, result);
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { galleries: data, loading, refetch: () => { setCache(CACHE_KEY, null as never); fetch(); } };
}
