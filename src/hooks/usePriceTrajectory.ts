// ---------------------------------------------------------------------------
// usePriceTrajectory -- Five-Year Price Trajectory Planner
// Models pricing over 5 years with conservative / moderate / aggressive paths
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrajectoryYear {
  year: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  projectedRevenue: number;
  milestonesExpected: string[];
}

export interface PriceScenario {
  name: 'conservative' | 'moderate' | 'aggressive';
  label: string;
  description: string;
  annualIncreaseRate: number;
  years: TrajectoryYear[];
  totalProjectedRevenue: number;
  finalAvgPrice: number;
}

export interface PriceTrajectoryData {
  scenarios: PriceScenario[];
  currentAvgPrice: number;
  currentMedianPrice: number;
  historicalGrowthRate: number;
  auctionTrendRate: number | null;
  milestonesAchieved: number;
  upcomingMilestoneImpact: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function annualizeRate(startPrice: number, endPrice: number, years: number): number {
  if (startPrice <= 0 || years <= 0) return 0;
  return (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;
}

// ---------------------------------------------------------------------------
// Scenario definitions
// ---------------------------------------------------------------------------

const MODERATE_MILESTONES: Record<number, string> = {
  2: 'Museum show Y2',
  3: 'Major fair Y3',
  4: 'Institutional acquisition Y4',
};

const AGGRESSIVE_MILESTONES: Record<number, string> = {
  1: 'Auction record Y1',
  2: 'Major museum Y2',
  3: 'Retrospective Y3',
};

function buildScenario(
  name: PriceScenario['name'],
  label: string,
  description: string,
  rate: number,
  currentAvgPrice: number,
  estimatedAnnualSales: number,
  milestonesMap: Record<number, string>,
): PriceScenario {
  const currentYear = new Date().getFullYear();
  const years: TrajectoryYear[] = [];
  let totalProjectedRevenue = 0;

  for (let y = 1; y <= 5; y++) {
    const avgPrice = currentAvgPrice * Math.pow(1 + rate / 100, y);
    const minPrice = avgPrice * 0.7;
    const maxPrice = avgPrice * 2.5;
    const projectedRevenue = avgPrice * estimatedAnnualSales;
    const milestonesExpected: string[] = milestonesMap[y] ? [milestonesMap[y]] : [];

    totalProjectedRevenue += projectedRevenue;

    years.push({
      year: currentYear + y,
      avgPrice: Math.round(avgPrice),
      minPrice: Math.round(minPrice),
      maxPrice: Math.round(maxPrice),
      projectedRevenue: Math.round(projectedRevenue),
      milestonesExpected,
    });
  }

  return {
    name,
    label,
    description,
    annualIncreaseRate: rate,
    years,
    totalProjectedRevenue: Math.round(totalProjectedRevenue),
    finalAvgPrice: years[years.length - 1]?.avgPrice ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePriceTrajectory() {
  const [data, setData] = useState<PriceTrajectoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      // 1-5. Parallel data fetches
      const [priceHistoryRes, artworksRes, milestonesRes, auctionRes, salesRes] = await Promise.all([
        supabase
          .from('price_history')
          .select('id, artwork_id, price, effective_date')
          .order('effective_date', { ascending: true }),
        supabase
          .from('artworks')
          .select('id, price'),
        supabase
          .from('career_milestones')
          .select('id'),
        supabase
          .from('auction_alerts')
          .select('id, price_realized, currency'),
        supabase
          .from('sales')
          .select('id, sale_price, sale_date'),
      ]);

      if (artworksRes.error) throw artworksRes.error;
      if (salesRes.error) throw salesRes.error;
      // price_history / career_milestones / auction_alerts may not exist — handle gracefully

      const priceHistory = priceHistoryRes.data ?? [];
      const artworks = artworksRes.data ?? [];
      const milestones = milestonesRes.data ?? [];
      const auctions = auctionRes.data ?? [];
      const sales = salesRes.data ?? [];

      // 6. Current avg / median price from artworks where price > 0
      const activePrices = artworks
        .map((a) => Number(a.price) || 0)
        .filter((p) => p > 0);

      const currentAvgPrice =
        activePrices.length > 0
          ? Math.round(activePrices.reduce((s, p) => s + p, 0) / activePrices.length)
          : 0;
      const currentMedianPrice = Math.round(median(activePrices));

      // 7. Historical growth rate — earliest avg vs latest avg, annualised
      let historicalGrowthRate = 0;
      if (priceHistory.length >= 2) {
        const earliest = priceHistory[0];
        const latest = priceHistory[priceHistory.length - 1];
        const startDate = new Date(earliest.effective_date);
        const endDate = new Date(latest.effective_date);
        const diffYears = Math.max(
          (endDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
          0.25,
        );
        const startPrice = Number(earliest.price) || 0;
        const endPrice = Number(latest.price) || 0;
        if (startPrice > 0 && endPrice > 0) {
          historicalGrowthRate = annualizeRate(startPrice, endPrice, diffYears);
        }
      }

      // Auction trend rate (from auction_alerts if data exists)
      let auctionTrendRate: number | null = null;
      if (auctions.length >= 2) {
        const auctionPrices = auctions
          .map((a) => Number(a.price_realized) || 0)
          .filter((p) => p > 0);
        if (auctionPrices.length >= 2) {
          const aStart = auctionPrices[0];
          const aEnd = auctionPrices[auctionPrices.length - 1];
          // rough annualisation assuming spread over available data
          const spanYears = Math.max(auctionPrices.length / 4, 1);
          auctionTrendRate = annualizeRate(aStart, aEnd, spanYears);
        }
      }

      // Estimated annual sales pace (monthly avg -> annual)
      let estimatedAnnualSales = 0;
      if (sales.length > 0) {
        const saleDates = sales
          .map((s) => s.sale_date ? new Date(s.sale_date).getTime() : 0)
          .filter((t) => t > 0)
          .sort((a, b) => a - b);

        if (saleDates.length >= 2) {
          const spanMs = saleDates[saleDates.length - 1] - saleDates[0];
          const spanMonths = Math.max(spanMs / (30.44 * 24 * 60 * 60 * 1000), 1);
          const monthlyAvg = saleDates.length / spanMonths;
          estimatedAnnualSales = Math.round(monthlyAvg * 12);
        } else {
          estimatedAnnualSales = sales.length;
        }
      }
      // Fallback: at least 1 sale/year if we have any artworks
      if (estimatedAnnualSales === 0 && artworks.length > 0) {
        estimatedAnnualSales = 1;
      }

      // Milestones info
      const milestonesAchieved = milestones.length;
      const upcomingMilestoneImpact =
        milestonesAchieved === 0
          ? 'First milestone will establish baseline trajectory'
          : milestonesAchieved < 5
            ? 'Next milestone could accelerate moderate scenario'
            : 'Strong milestone base supports aggressive scenario';

      // 8. Three scenarios
      const conservativeRate = Math.max(3, historicalGrowthRate * 0.5);
      const moderateRate = Math.max(8, historicalGrowthRate);
      const aggressiveRate = Math.max(15, auctionTrendRate ?? historicalGrowthRate * 2);

      const basePrice = currentAvgPrice > 0 ? currentAvgPrice : 1000; // fallback

      const scenarios: PriceScenario[] = [
        buildScenario(
          'conservative',
          'Conservative',
          'Gradual increases, no major milestones assumed',
          conservativeRate,
          basePrice,
          estimatedAnnualSales,
          {},
        ),
        buildScenario(
          'moderate',
          'Moderate',
          'Milestone-triggered increases with steady career growth',
          moderateRate,
          basePrice,
          estimatedAnnualSales,
          MODERATE_MILESTONES,
        ),
        buildScenario(
          'aggressive',
          'Aggressive',
          'Matching auction records with major institutional support',
          aggressiveRate,
          basePrice,
          estimatedAnnualSales,
          AGGRESSIVE_MILESTONES,
        ),
      ];

      setData({
        scenarios,
        currentAvgPrice,
        currentMedianPrice,
        historicalGrowthRate: Math.round(historicalGrowthRate * 100) / 100,
        auctionTrendRate: auctionTrendRate !== null ? Math.round(auctionTrendRate * 100) / 100 : null,
        milestonesAchieved,
        upcomingMilestoneImpact,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to compute price trajectory';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
