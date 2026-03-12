// ---------------------------------------------------------------------------
// Inventory analytics calculations
// ---------------------------------------------------------------------------

import type { ArtworkStatus } from '../../types/database';

export interface StatusCounts {
  available: number;
  sold: number;
  reserved: number;
  in_production: number;
  in_transit: number;
  on_consignment: number;
  paid: number;
  pending_sale: number;
  archived: number;
  destroyed: number;
}

export interface InventoryKpis {
  total: number;
  statusCounts: StatusCounts;
  pressureRatio: number;
  agingBuckets: AgingBucket[];
}

export interface AgingBucket {
  label: string;
  count: number;
  minDays: number;
  maxDays: number | null;
}

const AGING_BUCKETS_DEF = [
  { label: '< 30 days', minDays: 0, maxDays: 30 },
  { label: '30-90 days', minDays: 30, maxDays: 90 },
  { label: '90-180 days', minDays: 90, maxDays: 180 },
  { label: '180-365 days', minDays: 180, maxDays: 365 },
  { label: '> 1 year', minDays: 365, maxDays: null },
] as const;

/** Count artworks by status. */
export function countByStatus(
  artworks: { status: ArtworkStatus }[],
): StatusCounts {
  const counts: StatusCounts = {
    available: 0,
    sold: 0,
    reserved: 0,
    in_production: 0,
    in_transit: 0,
    on_consignment: 0,
    paid: 0,
    pending_sale: 0,
    archived: 0,
    destroyed: 0,
  };

  for (const a of artworks) {
    if (a.status in counts) {
      counts[a.status as keyof StatusCounts] += 1;
    }
  }
  return counts;
}

/**
 * Inventory pressure ratio = available works / average monthly sales.
 * Lower = more scarcity (good). Higher = excess supply.
 */
export function pressureRatio(availableCount: number, monthlySalesAvg: number): number {
  if (monthlySalesAvg <= 0) return availableCount > 0 ? Infinity : 0;
  return availableCount / monthlySalesAvg;
}

/**
 * Compute aging buckets for unsold artworks.
 * `createdAt` is the artwork creation date (or consigned_since).
 */
export function computeAgingBuckets(
  artworks: { created_at: string; status: ArtworkStatus }[],
  referenceDate: Date = new Date(),
): AgingBucket[] {
  const buckets: AgingBucket[] = AGING_BUCKETS_DEF.map((b) => ({
    label: b.label,
    count: 0,
    minDays: b.minDays,
    maxDays: b.maxDays,
  }));

  const unsold = artworks.filter(
    (a) => a.status !== 'sold' && a.status !== 'archived' && a.status !== 'destroyed',
  );

  for (const a of unsold) {
    const days = Math.floor(
      (referenceDate.getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    for (const bucket of buckets) {
      if (days >= bucket.minDays && (bucket.maxDays === null || days < bucket.maxDays)) {
        bucket.count += 1;
        break;
      }
    }
  }

  return buckets;
}
