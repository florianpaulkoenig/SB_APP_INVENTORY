// ---------------------------------------------------------------------------
// Base sales data hook — single source of truth for sales + joins
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { getCached, setCache } from './cache';

const CACHE_KEY = 'base_sales';

export interface BaseSale {
  id: string;
  artwork_id: string;
  gallery_id: string | null;
  contact_id: string | null;
  buyer_name: string | null;
  sale_price: number;
  currency: string;
  sale_date: string;
  sale_type: string | null;
  sale_country: string | null;
  commission_percent: number | null;
  reporting_status: string | null;
  payment_status: string | null;
  discount_percent: number | null;
  collector_anonymity_mode: string | null;
  source_exhibition_id: string | null;
  artworks: { title: string; series: string | null; size_category: string | null; consigned_since: string | null; price: number | null; currency: string } | null;
  contacts: { first_name: string; last_name: string; country: string | null; city: string | null } | null;
}

export function useBaseSales() {
  const [data, setData] = useState<BaseSale[] | null>(getCached<BaseSale[]>(CACHE_KEY));
  const [loading, setLoading] = useState(!data);

  const fetch = useCallback(async () => {
    const cached = getCached<BaseSale[]>(CACHE_KEY);
    if (cached) { setData(cached); setLoading(false); return; }

    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) { setLoading(false); return; }

    const { data: sales } = await supabase
      .from('sales')
      .select('id, artwork_id, gallery_id, contact_id, buyer_name, sale_price, currency, sale_date, sale_type, sale_country, commission_percent, reporting_status, payment_status, discount_percent, collector_anonymity_mode, source_exhibition_id, artworks(title, series, size_category, consigned_since, price, currency), contacts(first_name, last_name, country, city)')
      .order('sale_date', { ascending: false });

    const result = (sales as BaseSale[]) ?? [];
    setCache(CACHE_KEY, result);
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { sales: data, loading, refetch: () => { setCache(CACHE_KEY, null as never); fetch(); } };
}
