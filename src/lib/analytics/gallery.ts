// ---------------------------------------------------------------------------
// Gallery partner analytics calculations
// ---------------------------------------------------------------------------

export interface PartnerScoreFactors {
  salesVelocity: number;       // 0-100: how quickly allocated works sell
  reportingCompleteness: number; // 0-100: % of sales fully reported
  consistency: number;          // 0-100: regularity of sales
  conversionRate: number;       // 0-100: allocated → sold ratio
  timeliness: number;           // 0-100: reporting on time
}

/**
 * Compute a composite partner allocation score (0-100).
 * Weights: velocity 25%, reporting 25%, consistency 15%, conversion 25%, timeliness 10%.
 */
export function computePartnerScore(factors: PartnerScoreFactors): number {
  return (
    factors.salesVelocity * 0.25 +
    factors.reportingCompleteness * 0.25 +
    factors.consistency * 0.15 +
    factors.conversionRate * 0.25 +
    factors.timeliness * 0.10
  );
}

/**
 * Compute sell-through rate for a gallery.
 * = sold / (sold + allocated still unsold) * 100
 */
export function gallerySellThrough(sold: number, totalAllocated: number): number {
  if (totalAllocated <= 0) return 0;
  return (sold / totalAllocated) * 100;
}

/**
 * Compute reporting completeness percentage.
 * A sale is "complete" if reporting_status = 'sold_reported' or 'verified'.
 */
export function reportingCompleteness(
  sales: { reporting_status: string }[],
): number {
  if (sales.length === 0) return 100;
  const complete = sales.filter(
    (s) => s.reporting_status === 'sold_reported' || s.reporting_status === 'verified',
  ).length;
  return (complete / sales.length) * 100;
}

/**
 * Compute average days to sale for a gallery.
 */
export function avgDaysToSale(
  sales: { sale_date: string; consigned_since: string | null }[],
): number | null {
  const valid = sales.filter((s) => s.consigned_since);
  if (valid.length === 0) return null;

  const totalDays = valid.reduce((sum, s) => {
    const from = new Date(s.consigned_since!).getTime();
    const to = new Date(s.sale_date).getTime();
    return sum + Math.max(0, (to - from) / (1000 * 60 * 60 * 24));
  }, 0);

  return Math.round(totalDays / valid.length);
}
