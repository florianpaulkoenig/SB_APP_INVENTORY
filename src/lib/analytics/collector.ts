// ---------------------------------------------------------------------------
// Collector intelligence calculations
// ---------------------------------------------------------------------------

export interface CollectorProfile {
  id: string;
  name: string | null;
  isAnonymous: boolean;
  country: string | null;
  city: string | null;
  totalSpent: number;
  purchaseCount: number;
  firstPurchase: string;
  lastPurchase: string;
  preferredSeries: string[];
}

export interface SpendTier {
  label: string;
  min: number;
  max: number | null;
  count: number;
}

const SPEND_TIERS_DEF = [
  { label: 'Entry (<10K)', min: 0, max: 10_000 },
  { label: 'Mid (10K-50K)', min: 10_000, max: 50_000 },
  { label: 'High (50K-200K)', min: 50_000, max: 200_000 },
  { label: 'Top (200K+)', min: 200_000, max: null },
] as const;

/** Identify repeat buyers (2+ purchases). */
export function repeatBuyerCount(profiles: CollectorProfile[]): number {
  return profiles.filter((p) => p.purchaseCount >= 2).length;
}

/** Estimate collector lifetime value (average spend * frequency factor). */
export function estimateLTV(profile: CollectorProfile): number {
  if (profile.purchaseCount <= 1) return profile.totalSpent;
  const avgPurchase = profile.totalSpent / profile.purchaseCount;
  // Simple projection: 1.5x for returning collectors
  return avgPurchase * profile.purchaseCount * 1.5;
}

/** Classify collectors into spend tiers. */
export function classifySpendTiers(profiles: CollectorProfile[]): SpendTier[] {
  const tiers: SpendTier[] = SPEND_TIERS_DEF.map((t) => ({
    label: t.label,
    min: t.min,
    max: t.max,
    count: 0,
  }));

  for (const p of profiles) {
    for (const tier of tiers) {
      if (p.totalSpent >= tier.min && (tier.max === null || p.totalSpent < tier.max)) {
        tier.count += 1;
        break;
      }
    }
  }

  return tiers;
}

/** Group collectors by country. */
export function collectorsByCountry(
  profiles: CollectorProfile[],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const p of profiles) {
    const country = p.country || 'Unknown';
    result[country] = (result[country] || 0) + 1;
  }
  return result;
}
