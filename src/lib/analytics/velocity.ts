// ---------------------------------------------------------------------------
// Demand velocity calculations
// ---------------------------------------------------------------------------

export interface VelocityResult {
  artworkId: string;
  title: string;
  daysToSale: number;
}

/**
 * Compute days from release/consignment to sale for each artwork.
 */
export function computeVelocity(
  sales: {
    artwork_id: string;
    title: string;
    sale_date: string;
    released_at: string | null;
    consigned_since: string | null;
  }[],
): VelocityResult[] {
  const results: VelocityResult[] = [];

  for (const s of sales) {
    const startDate = s.released_at || s.consigned_since;
    if (!startDate) continue;

    const from = new Date(startDate).getTime();
    const to = new Date(s.sale_date).getTime();
    const days = Math.max(0, Math.round((to - from) / (1000 * 60 * 60 * 24)));

    results.push({
      artworkId: s.artwork_id,
      title: s.title,
      daysToSale: days,
    });
  }

  return results;
}

/** Average days to sale. */
export function avgVelocity(results: VelocityResult[]): number | null {
  if (results.length === 0) return null;
  return Math.round(results.reduce((s, r) => s + r.daysToSale, 0) / results.length);
}

/** Get N fastest-selling works. */
export function fastestSelling(results: VelocityResult[], n = 10): VelocityResult[] {
  return [...results].sort((a, b) => a.daysToSale - b.daysToSale).slice(0, n);
}

/** Get N slowest-selling works. */
export function slowestSelling(results: VelocityResult[], n = 10): VelocityResult[] {
  return [...results].sort((a, b) => b.daysToSale - a.daysToSale).slice(0, n);
}

/** Group velocity by key (series, gallery) and compute averages. */
export function velocityByKey(
  results: (VelocityResult & Record<string, unknown>)[],
  key: string,
): Record<string, { avgDays: number; count: number }> {
  const groups: Record<string, { totalDays: number; count: number }> = {};

  for (const r of results) {
    const k = String(r[key] || 'Unknown');
    if (!groups[k]) groups[k] = { totalDays: 0, count: 0 };
    groups[k].totalDays += r.daysToSale;
    groups[k].count += 1;
  }

  const result: Record<string, { avgDays: number; count: number }> = {};
  for (const [k, v] of Object.entries(groups)) {
    result[k] = { avgDays: Math.round(v.totalDays / v.count), count: v.count };
  }
  return result;
}
