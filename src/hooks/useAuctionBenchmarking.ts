// ---------------------------------------------------------------------------
// Auction price benchmarking analytics
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import type { AuctionAlertRow } from '../types/database';

export interface AuctionHouseStats {
  auctionHouse: string;
  totalLots: number;
  soldCount: number;
  boughtInCount: number;
  sellThroughRate: number;
  avgHammerEstimateRatio: number;
  totalHammerCHF: number;
  auctionStrengthIndex: number;
}

export interface EstimateAccuracyBucket {
  label: string;
  count: number;
  percentage: number;
}

export interface YearlyPriceTrend {
  year: number;
  avgHammerCHF: number;
  lotCount: number;
  avgEstimateAccuracy: number;
}

export interface AuctionBenchmarkingData {
  houseStats: AuctionHouseStats[];
  estimateAccuracy: EstimateAccuracyBucket[];
  priceTrends: YearlyPriceTrend[];
  overallSellThroughRate: number;
  overallStrengthIndex: number;
}

export function useAuctionBenchmarking(
  alerts: AuctionAlertRow[],
  toCHF: (amount: number, currency: string) => number,
): AuctionBenchmarkingData {
  return useMemo(() => {
    // Only completed auctions (sold or bought_in)
    const completed = alerts.filter(
      (a) => a.result === 'sold' || a.result === 'bought_in',
    );
    const sold = completed.filter((a) => a.result === 'sold');
    const boughtIn = completed.filter((a) => a.result === 'bought_in');

    // ---- Per-auction-house stats ------------------------------------------
    const houseMap = new Map<
      string,
      { sold: AuctionAlertRow[]; boughtIn: AuctionAlertRow[] }
    >();

    for (const a of completed) {
      const house = a.auction_house || 'Unknown';
      if (!houseMap.has(house)) houseMap.set(house, { sold: [], boughtIn: [] });
      const entry = houseMap.get(house)!;
      if (a.result === 'sold') entry.sold.push(a);
      else entry.boughtIn.push(a);
    }

    const houseStats: AuctionHouseStats[] = Array.from(houseMap.entries())
      .map(([house, data]) => {
        const total = data.sold.length + data.boughtIn.length;
        const sellThrough = total > 0 ? (data.sold.length / total) * 100 : 0;

        // Avg hammer/estimate ratio for sold lots
        const withEstimate = data.sold.filter(
          (a) => a.hammer_price && a.estimate_low && a.estimate_high,
        );
        const avgRatio =
          withEstimate.length > 0
            ? withEstimate.reduce((sum, a) => {
                const mid = ((a.estimate_low || 0) + (a.estimate_high || 0)) / 2;
                return sum + (mid > 0 ? (a.hammer_price || 0) / mid : 0);
              }, 0) / withEstimate.length
            : 0;

        // Strength index: hammer / estimate_high
        const withHigh = data.sold.filter(
          (a) => a.hammer_price && a.estimate_high,
        );
        const strengthIndex =
          withHigh.length > 0
            ? withHigh.reduce(
                (sum, a) => sum + (a.hammer_price || 0) / (a.estimate_high || 1),
                0,
              ) / withHigh.length
            : 0;

        const totalHammer = data.sold.reduce(
          (sum, a) => sum + toCHF(a.hammer_price || 0, a.currency ?? 'CHF'),
          0,
        );

        return {
          auctionHouse: house,
          totalLots: total,
          soldCount: data.sold.length,
          boughtInCount: data.boughtIn.length,
          sellThroughRate: Math.round(sellThrough * 10) / 10,
          avgHammerEstimateRatio: Math.round(avgRatio * 100) / 100,
          totalHammerCHF: totalHammer,
          auctionStrengthIndex: Math.round(strengthIndex * 100) / 100,
        };
      })
      .sort((a, b) => b.totalHammerCHF - a.totalHammerCHF);

    // ---- Estimate accuracy buckets ----------------------------------------
    const withBoth = sold.filter(
      (a) => a.hammer_price && a.estimate_low && a.estimate_high,
    );
    const belowCount = withBoth.filter(
      (a) => (a.hammer_price || 0) < (a.estimate_low || 0),
    ).length;
    const aboveCount = withBoth.filter(
      (a) => (a.hammer_price || 0) > (a.estimate_high || 0),
    ).length;
    const withinCount = withBoth.length - belowCount - aboveCount;
    const total = withBoth.length || 1;

    const estimateAccuracy: EstimateAccuracyBucket[] = [
      {
        label: 'Below Estimate',
        count: belowCount,
        percentage: Math.round((belowCount / total) * 100),
      },
      {
        label: 'Within Estimate',
        count: withinCount,
        percentage: Math.round((withinCount / total) * 100),
      },
      {
        label: 'Above Estimate',
        count: aboveCount,
        percentage: Math.round((aboveCount / total) * 100),
      },
    ];

    // ---- Yearly price trends ----------------------------------------------
    const yearMap = new Map<
      number,
      { totalHammer: number; count: number; accuracySum: number; accuracyCount: number }
    >();

    for (const a of sold) {
      if (!a.sale_date) continue;
      const year = new Date(a.sale_date).getFullYear();
      if (!yearMap.has(year)) {
        yearMap.set(year, { totalHammer: 0, count: 0, accuracySum: 0, accuracyCount: 0 });
      }
      const entry = yearMap.get(year)!;
      entry.totalHammer += toCHF(a.hammer_price || 0, a.currency ?? 'CHF');
      entry.count += 1;

      if (a.hammer_price && a.estimate_low && a.estimate_high) {
        const mid = ((a.estimate_low || 0) + (a.estimate_high || 0)) / 2;
        if (mid > 0) {
          entry.accuracySum += ((a.hammer_price || 0) / mid) * 100;
          entry.accuracyCount += 1;
        }
      }
    }

    const priceTrends: YearlyPriceTrend[] = Array.from(yearMap.entries())
      .map(([year, data]) => ({
        year,
        avgHammerCHF: data.count > 0 ? Math.round(data.totalHammer / data.count) : 0,
        lotCount: data.count,
        avgEstimateAccuracy:
          data.accuracyCount > 0
            ? Math.round(data.accuracySum / data.accuracyCount)
            : 0,
      }))
      .sort((a, b) => a.year - b.year);

    // ---- Overall metrics --------------------------------------------------
    const overallSellThroughRate =
      completed.length > 0
        ? Math.round((sold.length / completed.length) * 1000) / 10
        : 0;

    const allWithHigh = sold.filter(
      (a) => a.hammer_price && a.estimate_high,
    );
    const overallStrengthIndex =
      allWithHigh.length > 0
        ? Math.round(
            (allWithHigh.reduce(
              (sum, a) => sum + (a.hammer_price || 0) / (a.estimate_high || 1),
              0,
            ) /
              allWithHigh.length) *
              100,
          ) / 100
        : 0;

    return {
      houseStats,
      estimateAccuracy,
      priceTrends,
      overallSellThroughRate,
      overallStrengthIndex,
    };
  }, [alerts, toCHF]);
}
