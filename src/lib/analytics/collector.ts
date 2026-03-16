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

// ---------------------------------------------------------------------------
// RFM Scoring & Predictive Collector Churn / LTV
// ---------------------------------------------------------------------------

export interface RFMScore {
  recency: number;     // 1-5 (5 = most recent)
  frequency: number;   // 1-5 (5 = most frequent)
  monetary: number;    // 1-5 (5 = highest spend)
  rfmScore: number;    // composite 3-15
  segment: 'champion' | 'loyal' | 'potential' | 'at_risk' | 'dormant' | 'lost';
}

export interface CollectorHealth extends CollectorProfile {
  rfm: RFMScore;
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  predictedLTV: number;
  daysSinceLastPurchase: number;
  purchaseFrequencyDays: number | null; // avg days between purchases
}

/** Compute RFM score for a single collector profile. */
export function computeRFMScore(
  profile: CollectorProfile,
  referenceDate: Date = new Date(),
): RFMScore {
  // Recency: days since last purchase
  const lastDate = profile.lastPurchase ? new Date(profile.lastPurchase) : new Date(0);
  const daysSince = Math.floor(
    (referenceDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  let recency: number;
  if (daysSince < 90) recency = 5;
  else if (daysSince < 180) recency = 4;
  else if (daysSince < 365) recency = 3;
  else if (daysSince < 730) recency = 2;
  else recency = 1;

  // Frequency: purchase count
  let frequency: number;
  if (profile.purchaseCount >= 5) frequency = 5;
  else if (profile.purchaseCount === 4) frequency = 4;
  else if (profile.purchaseCount === 3) frequency = 3;
  else if (profile.purchaseCount === 2) frequency = 2;
  else frequency = 1;

  // Monetary: total spent
  let monetary: number;
  if (profile.totalSpent > 200_000) monetary = 5;
  else if (profile.totalSpent >= 50_000) monetary = 4;
  else if (profile.totalSpent >= 10_000) monetary = 3;
  else if (profile.totalSpent >= 2_000) monetary = 2;
  else monetary = 1;

  const rfmScore = recency + frequency + monetary;

  let segment: RFMScore['segment'];
  if (rfmScore >= 13) segment = 'champion';
  else if (rfmScore >= 10) segment = 'loyal';
  else if (rfmScore >= 7) segment = 'potential';
  else if (rfmScore >= 5) segment = 'at_risk';
  else if (rfmScore >= 3) segment = 'dormant';
  else segment = 'lost';

  return { recency, frequency, monetary, rfmScore, segment };
}

/** Assess churn risk from RFM scores and recency. */
export function assessChurnRisk(
  rfm: RFMScore,
  daysSinceLastPurchase: number,
): 'low' | 'medium' | 'high' | 'critical' {
  if (rfm.recency <= 1) return 'critical';
  if (rfm.recency === 2 || (rfm.recency === 3 && rfm.frequency <= 2)) return 'high';
  if (rfm.recency === 3) return 'medium';
  return 'low';
}

/** Predict lifetime value using RFM-weighted projection. */
export function predictLTV(profile: CollectorProfile, rfm: RFMScore): number {
  const base = profile.totalSpent;

  if (profile.purchaseCount <= 1) {
    // Single-purchase collectors: project based on segment
    const multiplier =
      rfm.segment === 'champion' ? 3 :
      rfm.segment === 'loyal' ? 2 :
      rfm.segment === 'potential' ? 1.5 :
      rfm.segment === 'at_risk' ? 0.5 : 0;
    return base + base * multiplier;
  }

  const avgPurchase = base / profile.purchaseCount;

  let additionalPurchases: number;
  switch (rfm.segment) {
    case 'champion': additionalPurchases = 3; break;
    case 'loyal': additionalPurchases = 2; break;
    case 'potential': additionalPurchases = 1.5; break;
    case 'at_risk': additionalPurchases = 0.5; break;
    case 'dormant':
    case 'lost':
    default: additionalPurchases = 0; break;
  }

  return base + avgPurchase * additionalPurchases;
}

/** Build full health assessments for a list of collector profiles. */
export function buildCollectorHealth(
  profiles: CollectorProfile[],
  referenceDate: Date = new Date(),
): CollectorHealth[] {
  return profiles.map((profile) => {
    const rfm = computeRFMScore(profile, referenceDate);

    const lastDate = profile.lastPurchase ? new Date(profile.lastPurchase) : new Date(0);
    const daysSinceLastPurchase = Math.floor(
      (referenceDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const churnRisk = assessChurnRisk(rfm, daysSinceLastPurchase);
    const predictedLTV = predictLTV(profile, rfm);

    // Average days between purchases (null if only one purchase)
    let purchaseFrequencyDays: number | null = null;
    if (profile.purchaseCount > 1 && profile.firstPurchase && profile.lastPurchase) {
      const firstDate = new Date(profile.firstPurchase);
      const totalDays = Math.floor(
        (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      purchaseFrequencyDays = Math.round(totalDays / (profile.purchaseCount - 1));
    }

    return {
      ...profile,
      rfm,
      churnRisk,
      predictedLTV,
      daysSinceLastPurchase,
      purchaseFrequencyDays,
    };
  });
}
