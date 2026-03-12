// ---------------------------------------------------------------------------
// useExhibitionImpact -- Exhibition Impact Dashboard data (Dashboard 9)
// Sell-through, ROI proxy, collector acquisition per exhibition
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExhibitionImpactRow {
  id: string;
  title: string;
  type: string;
  venue: string | null;
  city: string | null;
  country: string | null;
  startDate: string | null;
  endDate: string | null;
  artworksShown: number;
  directSales: number;
  attributedSales: number;
  totalRevenue: number;
  budget: number;
  roi: number | null;
  newCollectors: number;
  sellThrough: number;
}

export interface ExhibitionImpactData {
  exhibitions: ExhibitionImpactRow[];
  totalExhibitions: number;
  avgROI: number | null;
  totalRevenue: number;
  totalNewCollectors: number;
  bestPerformer: string | null;
  byType: { type: string; count: number; revenue: number }[];
  byYear: { year: number; count: number; revenue: number }[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useExhibitionImpact() {
  const [data, setData] = useState<ExhibitionImpactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const [exhRes, eaRes, salesRes, contactsRes] = await Promise.all([
        supabase.from('exhibitions').select('id, title, type, venue, city, country, start_date, end_date, budget, budget_currency'),
        supabase.from('exhibition_artworks').select('exhibition_id, artwork_id'),
        supabase.from('sales').select('id, artwork_id, sale_price, currency, sale_date, source_exhibition_id, contact_id, buyer_name'),
        supabase.from('contacts').select('id, created_at'),
      ]);

      if (exhRes.error) throw exhRes.error;
      if (eaRes.error) throw eaRes.error;
      if (salesRes.error) throw salesRes.error;

      const exhibitions = exhRes.data ?? [];
      const exhArtworks = eaRes.data ?? [];
      const sales = salesRes.data ?? [];
      const contacts = contactsRes.data ?? [];

      // Artwork IDs by exhibition
      const artworksByExh = new Map<string, string[]>();
      for (const ea of exhArtworks) {
        const arr = artworksByExh.get(ea.exhibition_id) ?? [];
        arr.push(ea.artwork_id);
        artworksByExh.set(ea.exhibition_id, arr);
      }

      // Track known collectors before each exhibition to find "new"
      const allCollectorIds = new Set<string>();
      // Sort sales by date for chronological collector tracking
      const sortedSales = [...sales].sort((a, b) => (a.sale_date ?? '').localeCompare(b.sale_date ?? ''));

      const rows: ExhibitionImpactRow[] = [];

      for (const exh of exhibitions) {
        const artworkIds = new Set(artworksByExh.get(exh.id) ?? []);
        const endDate = exh.end_date ?? exh.start_date ?? '';
        const startDate = exh.start_date ?? '';

        let directSales = 0;
        let directRevenue = 0;
        let attributedSales = 0;
        let attributedRevenue = 0;
        const exhibitionCollectors = new Set<string>();

        // Direct sales: sold within 90 days of exhibition end
        for (const s of sortedSales) {
          if (!artworkIds.has(s.artwork_id)) continue;
          if (endDate && s.sale_date) {
            const diff = (new Date(s.sale_date).getTime() - new Date(endDate).getTime()) / 86400000;
            if (diff >= 0 && diff <= 90) {
              directSales++;
              directRevenue += Number(s.sale_price) || 0;
              if (s.contact_id) exhibitionCollectors.add(s.contact_id);
            }
          }
        }

        // Attributed sales: source_exhibition_id matches
        for (const s of sales) {
          if (s.source_exhibition_id === exh.id) {
            attributedSales++;
            attributedRevenue += Number(s.sale_price) || 0;
            if (s.contact_id) exhibitionCollectors.add(s.contact_id);
          }
        }

        // New collectors: contacts created around the exhibition period
        let newCollectors = 0;
        if (startDate) {
          const exhStart = new Date(startDate).getTime();
          const exhEnd = endDate ? new Date(endDate).getTime() + 90 * 86400000 : exhStart + 180 * 86400000;
          for (const c of contacts) {
            const created = new Date(c.created_at).getTime();
            if (created >= exhStart && created <= exhEnd && exhibitionCollectors.has(c.id)) {
              newCollectors++;
            }
          }
        }

        const totalRevenue = directRevenue + attributedRevenue;
        const budget = Number(exh.budget) || 0;
        const roi = budget > 0 ? ((totalRevenue - budget) / budget) * 100 : null;
        const sellThrough = artworkIds.size > 0 ? (directSales / artworkIds.size) * 100 : 0;

        rows.push({
          id: exh.id,
          title: exh.title,
          type: exh.type ?? 'exhibition',
          venue: exh.venue,
          city: exh.city,
          country: exh.country,
          startDate: exh.start_date,
          endDate: exh.end_date,
          artworksShown: artworkIds.size,
          directSales,
          attributedSales,
          totalRevenue,
          budget,
          roi,
          newCollectors,
          sellThrough: Math.round(sellThrough * 10) / 10,
        });
      }

      // Sort by total revenue descending
      rows.sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Aggregate by type
      const typeMap = new Map<string, { count: number; revenue: number }>();
      for (const r of rows) {
        const t = typeMap.get(r.type) ?? { count: 0, revenue: 0 };
        t.count++;
        t.revenue += r.totalRevenue;
        typeMap.set(r.type, t);
      }
      const byType = Array.from(typeMap.entries()).map(([type, v]) => ({ type, ...v }));

      // Aggregate by year
      const yearMap = new Map<number, { count: number; revenue: number }>();
      for (const r of rows) {
        const year = r.startDate ? new Date(r.startDate).getFullYear() : 0;
        if (year === 0) continue;
        const y = yearMap.get(year) ?? { count: 0, revenue: 0 };
        y.count++;
        y.revenue += r.totalRevenue;
        yearMap.set(year, y);
      }
      const byYear = Array.from(yearMap.entries())
        .map(([year, v]) => ({ year, ...v }))
        .sort((a, b) => a.year - b.year);

      // Totals
      const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
      const roisWithValue = rows.filter((r) => r.roi != null);
      const avgROI = roisWithValue.length > 0
        ? Math.round(roisWithValue.reduce((s, r) => s + (r.roi ?? 0), 0) / roisWithValue.length)
        : null;

      setData({
        exhibitions: rows,
        totalExhibitions: rows.length,
        avgROI,
        totalRevenue,
        totalNewCollectors: rows.reduce((s, r) => s + r.newCollectors, 0),
        bestPerformer: rows[0]?.title ?? null,
        byType,
        byYear,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch exhibition impact';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
