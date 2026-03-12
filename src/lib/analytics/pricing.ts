// ---------------------------------------------------------------------------
// Pricing intelligence calculations
// ---------------------------------------------------------------------------

export interface PriceBand {
  label: string;
  min: number;
  max: number | null;
  count: number;
  avgPrice: number;
}

export interface PriceLadderTier {
  tier: 'entry' | 'mid' | 'top';
  label: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  count: number;
}

/** Compute average price grouped by a string key (series, medium, size, etc.). */
export function avgPriceByKey<T extends { price: number | null; currency: string }>(
  items: (T & Record<string, unknown>)[],
  key: string,
  toCHF: (amount: number, currency: string) => number,
): Record<string, { avgPrice: number; count: number; totalRevenue: number }> {
  const groups: Record<string, { total: number; count: number }> = {};

  for (const item of items) {
    if (item.price == null || item.price <= 0) continue;
    const k = String(item[key] || 'Unknown');
    if (!groups[k]) groups[k] = { total: 0, count: 0 };
    groups[k].total += toCHF(item.price, item.currency);
    groups[k].count += 1;
  }

  const result: Record<string, { avgPrice: number; count: number; totalRevenue: number }> = {};
  for (const [k, v] of Object.entries(groups)) {
    result[k] = {
      avgPrice: v.count > 0 ? v.total / v.count : 0,
      count: v.count,
      totalRevenue: v.total,
    };
  }
  return result;
}

/**
 * Compute price ladder tiers based on percentiles.
 * Entry: bottom 33%, Mid: 33-66%, Top: top 33%.
 */
export function computePriceLadder(
  prices: number[],
): PriceLadderTier[] {
  if (prices.length === 0) return [];

  const sorted = [...prices].sort((a, b) => a - b);
  const p33 = sorted[Math.floor(sorted.length * 0.33)] ?? 0;
  const p66 = sorted[Math.floor(sorted.length * 0.66)] ?? 0;

  const entry = sorted.filter((p) => p <= p33);
  const mid = sorted.filter((p) => p > p33 && p <= p66);
  const top = sorted.filter((p) => p > p66);

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  return [
    {
      tier: 'entry',
      label: 'Entry Level',
      minPrice: entry[0] ?? 0,
      maxPrice: entry[entry.length - 1] ?? 0,
      avgPrice: avg(entry),
      count: entry.length,
    },
    {
      tier: 'mid',
      label: 'Mid Range',
      minPrice: mid[0] ?? 0,
      maxPrice: mid[mid.length - 1] ?? 0,
      avgPrice: avg(mid),
      count: mid.length,
    },
    {
      tier: 'top',
      label: 'Top Tier',
      minPrice: top[0] ?? 0,
      maxPrice: top[top.length - 1] ?? 0,
      avgPrice: avg(top),
      count: top.length,
    },
  ];
}

/** Compute gallery price variance (how much gallery prices deviate from average). */
export function galleryPriceVariance(
  sales: { gallery_id: string | null; sale_price: number; currency: string }[],
  toCHF: (amount: number, currency: string) => number,
): Record<string, { avgPrice: number; variance: number; count: number }> {
  const byGallery: Record<string, number[]> = {};
  const allPrices: number[] = [];

  for (const s of sales) {
    const gId = s.gallery_id || 'direct';
    const price = toCHF(s.sale_price, s.currency);
    if (!byGallery[gId]) byGallery[gId] = [];
    byGallery[gId].push(price);
    allPrices.push(price);
  }

  const globalAvg = allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;

  const result: Record<string, { avgPrice: number; variance: number; count: number }> = {};
  for (const [gId, prices] of Object.entries(byGallery)) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    result[gId] = {
      avgPrice: avg,
      variance: globalAvg > 0 ? ((avg - globalAvg) / globalAvg) * 100 : 0,
      count: prices.length,
    };
  }

  return result;
}
