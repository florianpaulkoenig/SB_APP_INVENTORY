// ---------------------------------------------------------------------------
// Sales analytics calculations
// ---------------------------------------------------------------------------

import type { SaleRow } from '../../types/database';

export interface SalesKpis {
  totalRevenue: number;
  totalSold: number;
  avgPrice: number;
  sellThroughRate: number;
}

/** Compute core sales KPIs. toCHF converts a price to CHF. */
export function computeSalesKpis(
  sales: Pick<SaleRow, 'sale_price' | 'currency'>[],
  totalArtworks: number,
  toCHF: (amount: number, currency: string) => number,
): SalesKpis {
  const totalSold = sales.length;
  const totalRevenue = sales.reduce(
    (sum, s) => sum + toCHF(s.sale_price, s.currency),
    0,
  );
  const avgPrice = totalSold > 0 ? totalRevenue / totalSold : 0;
  const sellThroughRate = totalArtworks > 0 ? (totalSold / totalArtworks) * 100 : 0;

  return { totalRevenue, totalSold, avgPrice, sellThroughRate };
}

/** Group sales revenue by a string key (e.g. gallery_id, country). */
export function groupRevenueByKey<K extends string>(
  sales: (Pick<SaleRow, 'sale_price' | 'currency'> & Record<K, string | null>)[],
  key: K,
  toCHF: (amount: number, currency: string) => number,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const s of sales) {
    const k = (s[key] as string) || 'Unknown';
    result[k] = (result[k] || 0) + toCHF(s.sale_price, s.currency);
  }
  return result;
}

/** Group sales into monthly buckets. Returns sorted array. */
export function monthlySalesTimeline(
  sales: Pick<SaleRow, 'sale_date' | 'sale_price' | 'currency'>[],
  toCHF: (amount: number, currency: string) => number,
): { month: string; revenue: number; count: number }[] {
  const map = new Map<string, { revenue: number; count: number }>();

  for (const s of sales) {
    const month = s.sale_date.slice(0, 7); // YYYY-MM
    const existing = map.get(month) || { revenue: 0, count: 0 };
    existing.revenue += toCHF(s.sale_price, s.currency);
    existing.count += 1;
    map.set(month, existing);
  }

  return Array.from(map.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Compute trend percentage between two periods. */
export function computeTrend(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}
