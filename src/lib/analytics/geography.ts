// ---------------------------------------------------------------------------
// Geography analytics calculations
// ---------------------------------------------------------------------------

export interface RegionStats {
  region: string;
  revenue: number;
  salesCount: number;
  collectorCount: number;
  avgPrice: number;
}

/**
 * Aggregate revenue and sales by country/region.
 */
export function computeRegionStats(
  sales: { sale_country: string | null; sale_price: number; currency: string; contact_id: string | null }[],
  toCHF: (amount: number, currency: string) => number,
): RegionStats[] {
  const map = new Map<string, { revenue: number; count: number; collectors: Set<string> }>();

  for (const s of sales) {
    const region = s.sale_country || 'Unknown';
    if (!map.has(region)) {
      map.set(region, { revenue: 0, count: 0, collectors: new Set() });
    }
    const data = map.get(region)!;
    data.revenue += toCHF(s.sale_price, s.currency);
    data.count += 1;
    if (s.contact_id) data.collectors.add(s.contact_id);
  }

  return Array.from(map.entries())
    .map(([region, d]) => ({
      region,
      revenue: d.revenue,
      salesCount: d.count,
      collectorCount: d.collectors.size,
      avgPrice: d.count > 0 ? d.revenue / d.count : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Compute growth rate by region: compare current vs previous period revenue.
 */
export function regionGrowthRate(
  current: RegionStats[],
  previous: RegionStats[],
): Record<string, number> {
  const prevMap = new Map(previous.map((r) => [r.region, r.revenue]));
  const result: Record<string, number> = {};

  for (const r of current) {
    const prev = prevMap.get(r.region) || 0;
    if (prev > 0) {
      result[r.region] = ((r.revenue - prev) / prev) * 100;
    } else if (r.revenue > 0) {
      result[r.region] = 100;
    }
  }

  return result;
}
