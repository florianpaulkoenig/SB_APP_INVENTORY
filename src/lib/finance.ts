// ---------------------------------------------------------------------------
// Pure commission math — extracted from useRevenueOverview so the revenue
// split logic is unit-testable and reusable.
// ---------------------------------------------------------------------------

export interface CommissionRates {
  gallery: number;
  noa: number;
  artist: number;
}

export interface CommissionSplitAmounts {
  gallery: number;
  noa: number;
  artist: number;
  total: number;
}

/** Default split when a gallery has no commission data: 50/25/25. */
export const DEFAULT_COMMISSION: CommissionRates = { gallery: 50, noa: 25, artist: 25 };

/**
 * Derive the commission split for a gallery row.
 *
 * - explicit 3-way split (commission_gallery/noa/artist) wins
 * - legacy commission_rate: gallery gets rate%, remainder 50/50 NOA/artist
 * - otherwise null → caller falls back to DEFAULT_COMMISSION
 */
export function deriveCommissionRates(gallery: {
  commission_gallery?: number | null;
  commission_noa?: number | null;
  commission_artist?: number | null;
  commission_rate?: number | null;
}): CommissionRates | null {
  const { commission_gallery: cg, commission_noa: cn, commission_artist: ca, commission_rate: cr } = gallery;
  if (cg != null && cn != null && ca != null) {
    return { gallery: cg, noa: cn, artist: ca };
  }
  if (cr != null) {
    return { gallery: cr, noa: (100 - cr) / 2, artist: (100 - cr) / 2 };
  }
  return null;
}

/**
 * Split an amount by commission rates (normalised, so rates that don't sum
 * to exactly 100 still distribute the full amount).
 */
export function splitByCommission(
  amount: number,
  rates: CommissionRates | null | undefined,
): CommissionSplitAmounts {
  const r = rates ?? DEFAULT_COMMISSION;
  const total = r.gallery + r.noa + r.artist;
  return {
    gallery: amount * (r.gallery / total),
    noa: amount * (r.noa / total),
    artist: amount * (r.artist / total),
    total: amount,
  };
}
