// ---------------------------------------------------------------------------
// usePricingStrategy — Dynamic Pricing Intelligence
// Analyzes per-series price elasticity, gallery-specific pricing power,
// size/medium premiums, and seasonal demand patterns to generate optimal
// pricing recommendations.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useExchangeRates } from './useExchangeRates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeriesElasticity {
  series: string;
  elasticity: number;
  avgPrice: number;
  salesCount: number;
  priceRange: { min: number; max: number };
  optimalPriceRange: { min: number; max: number };
  revenueMaximizingPrice: number;
}

export interface GalleryPricingPower {
  galleryId: string;
  galleryName: string;
  avgDiscountPercent: number;
  atListPriceRate: number;
  avgSalePriceCHF: number;
  pricePremium: number;
  salesCount: number;
}

export interface SizePremium {
  sizeCategory: string;
  avgPriceCHF: number;
  salesCount: number;
  premiumVsSmallest: number;
}

export interface SeasonalPattern {
  month: number;
  monthName: string;
  salesCount: number;
  avgPriceCHF: number;
  revenueShare: number;
}

export interface PricingRecommendation {
  series: string;
  currentAvgPrice: number;
  recommendedPrice: number;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  projectedRevenueChange: number;
}

export interface PricingStrategyData {
  seriesElasticity: SeriesElasticity[];
  galleryPricing: GalleryPricingPower[];
  sizePremiums: SizePremium[];
  seasonalPatterns: SeasonalPattern[];
  recommendations: PricingRecommendation[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface SaleRow {
  id: string;
  sale_price: number;
  currency: string;
  sale_date: string;
  gallery_id: string | null;
  discount_percent: number | null;
  artworks: {
    series: string | null;
    size_category: string | null;
    price: number | null;
    currency: string | null;
  } | null;
  galleries: { name: string } | null;
}

interface ArtworkRow {
  id: string;
  series: string | null;
  size_category: string | null;
  price: number | null;
  currency: string | null;
  status: string | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePricingStrategy() {
  const [data, setData] = useState<PricingStrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { toCHF, ready: ratesReady } = useExchangeRates();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      // ------ Fetch sales + artworks in parallel ------
      const [salesRes, artworksRes] = await Promise.all([
        supabase
          .from('sales')
          .select(
            'id, sale_price, currency, sale_date, gallery_id, discount_percent, artworks(series, size_category, price, currency), galleries(name)',
          ),
        supabase
          .from('artworks')
          .select('id, series, size_category, price, currency, status')
          .gt('price', 0),
      ]);

      if (salesRes.error) throw salesRes.error;
      if (artworksRes.error) throw artworksRes.error;

      const sales = (salesRes.data ?? []) as unknown as SaleRow[];
      const artworks = (artworksRes.data ?? []) as unknown as ArtworkRow[];

      // Convert every sale price to CHF once
      const salesCHF = sales
        .filter((s) => s.sale_price > 0 && s.sale_date)
        .map((s) => ({
          ...s,
          priceCHF: toCHF(s.sale_price, s.currency),
          series: (s.artworks?.series as string) || 'Unknown',
          sizeCategory: (s.artworks?.size_category as string) || 'unspecified',
          month: new Date(s.sale_date).getMonth(), // 0-11
        }));

      // Global average sale price
      const globalAvg =
        salesCHF.length > 0
          ? salesCHF.reduce((sum, s) => sum + s.priceCHF, 0) / salesCHF.length
          : 0;

      // ------ 1. Series Elasticity ------
      const seriesElasticity = computeSeriesElasticity(salesCHF);

      // ------ 2. Gallery Pricing Power ------
      const galleryPricing = computeGalleryPricing(salesCHF, globalAvg);

      // ------ 3. Size Premiums ------
      const sizePremiums = computeSizePremiums(salesCHF);

      // ------ 4. Seasonal Patterns ------
      const seasonalPatterns = computeSeasonalPatterns(salesCHF);

      // ------ 5. Recommendations ------
      const recommendations = generateRecommendations(
        seriesElasticity,
        seasonalPatterns,
        artworks,
        toCHF,
      );

      setData({
        seriesElasticity,
        galleryPricing,
        sizePremiums,
        seasonalPatterns,
        recommendations,
      });
    } catch (err: unknown) {
      console.error('usePricingStrategy error', err);
      toast({ title: 'Error', description: 'Failed to load pricing strategy data', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toCHF, toast]);

  useEffect(() => {
    if (ratesReady) fetchData();
  }, [ratesReady, fetchData]);

  return { data, loading, refresh: fetchData };
}

// ---------------------------------------------------------------------------
// Series Elasticity
// ---------------------------------------------------------------------------

interface SaleCHF {
  priceCHF: number;
  series: string;
  sizeCategory: string;
  month: number;
  gallery_id: string | null;
  discount_percent: number | null;
  galleries: { name: string } | null;
}

function computeSeriesElasticity(sales: SaleCHF[]): SeriesElasticity[] {
  // Group by series
  const bySeries = new Map<string, number[]>();
  for (const s of sales) {
    const prices = bySeries.get(s.series) ?? [];
    prices.push(s.priceCHF);
    bySeries.set(s.series, prices);
  }

  const results: SeriesElasticity[] = [];

  for (const [series, prices] of bySeries) {
    if (prices.length < 3) continue;

    const sorted = [...prices].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const avgPrice = sorted.reduce((a, b) => a + b, 0) / sorted.length;

    // Divide into price buckets (3 equal-sized buckets by volume)
    const bucketSize = Math.ceil(sorted.length / 3);
    const buckets: { avgPrice: number; volume: number; revenue: number }[] = [];

    for (let i = 0; i < 3; i++) {
      const slice = sorted.slice(i * bucketSize, (i + 1) * bucketSize);
      if (slice.length === 0) continue;
      const bAvg = slice.reduce((a, b) => a + b, 0) / slice.length;
      buckets.push({
        avgPrice: bAvg,
        volume: slice.length,
        revenue: slice.reduce((a, b) => a + b, 0),
      });
    }

    // Compute elasticity between first and last bucket
    let elasticity = 0;
    if (buckets.length >= 2) {
      const low = buckets[0];
      const high = buckets[buckets.length - 1];
      const pctChangeVolume = (high.volume - low.volume) / low.volume;
      const pctChangePrice = (high.avgPrice - low.avgPrice) / low.avgPrice;
      elasticity = pctChangePrice !== 0 ? pctChangeVolume / pctChangePrice : 0;
    }

    // Revenue-maximizing price = price of the bucket with highest total revenue
    const peakBucket = buckets.reduce(
      (best, b) => (b.revenue > best.revenue ? b : best),
      buckets[0],
    );
    const revenueMaximizingPrice = peakBucket.avgPrice;

    // Optimal range = +/- 10% of revenue-maximizing price
    const optimalMin = Math.round(revenueMaximizingPrice * 0.9);
    const optimalMax = Math.round(revenueMaximizingPrice * 1.1);

    results.push({
      series,
      elasticity: Math.round(elasticity * 100) / 100,
      avgPrice: Math.round(avgPrice),
      salesCount: prices.length,
      priceRange: { min: Math.round(min), max: Math.round(max) },
      optimalPriceRange: { min: optimalMin, max: optimalMax },
      revenueMaximizingPrice: Math.round(revenueMaximizingPrice),
    });
  }

  return results.sort((a, b) => b.salesCount - a.salesCount);
}

// ---------------------------------------------------------------------------
// Gallery Pricing Power
// ---------------------------------------------------------------------------

function computeGalleryPricing(sales: SaleCHF[], globalAvg: number): GalleryPricingPower[] {
  const byGallery = new Map<
    string,
    { name: string; prices: number[]; discounts: (number | null)[] }
  >();

  for (const s of sales) {
    const gId = s.gallery_id || 'direct';
    const gName = s.galleries?.name || (gId === 'direct' ? 'Direct Sales' : gId);
    const entry = byGallery.get(gId) ?? { name: gName, prices: [], discounts: [] };
    entry.prices.push(s.priceCHF);
    entry.discounts.push(s.discount_percent);
    byGallery.set(gId, entry);
  }

  const results: GalleryPricingPower[] = [];

  for (const [galleryId, { name, prices, discounts }] of byGallery) {
    const avgSale = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Average discount (treat null as 0)
    const discountValues = discounts.map((d) => d ?? 0);
    const avgDiscount = discountValues.reduce((a, b) => a + b, 0) / discountValues.length;

    // At-list-price rate: % where discount is 0 or null
    const atList = discounts.filter((d) => d == null || d === 0).length;
    const atListRate = (atList / discounts.length) * 100;

    // Price premium vs global average
    const premium = globalAvg > 0 ? ((avgSale - globalAvg) / globalAvg) * 100 : 0;

    results.push({
      galleryId,
      galleryName: name,
      avgDiscountPercent: Math.round(avgDiscount * 100) / 100,
      atListPriceRate: Math.round(atListRate * 10) / 10,
      avgSalePriceCHF: Math.round(avgSale),
      pricePremium: Math.round(premium * 10) / 10,
      salesCount: prices.length,
    });
  }

  return results.sort((a, b) => b.salesCount - a.salesCount);
}

// ---------------------------------------------------------------------------
// Size Premiums
// ---------------------------------------------------------------------------

function computeSizePremiums(sales: SaleCHF[]): SizePremium[] {
  const bySize = new Map<string, number[]>();

  for (const s of sales) {
    const prices = bySize.get(s.sizeCategory) ?? [];
    prices.push(s.priceCHF);
    bySize.set(s.sizeCategory, prices);
  }

  const entries: { sizeCategory: string; avgPriceCHF: number; salesCount: number }[] = [];

  for (const [sizeCategory, prices] of bySize) {
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    entries.push({ sizeCategory, avgPriceCHF: Math.round(avg), salesCount: prices.length });
  }

  // Sort ascending by avgPrice to identify smallest
  entries.sort((a, b) => a.avgPriceCHF - b.avgPriceCHF);

  const smallestAvg = entries.length > 0 ? entries[0].avgPriceCHF : 1;

  return entries.map((e) => ({
    ...e,
    premiumVsSmallest:
      smallestAvg > 0
        ? Math.round(((e.avgPriceCHF - smallestAvg) / smallestAvg) * 1000) / 10
        : 0,
  }));
}

// ---------------------------------------------------------------------------
// Seasonal Patterns
// ---------------------------------------------------------------------------

function computeSeasonalPatterns(sales: SaleCHF[]): SeasonalPattern[] {
  const byMonth = new Map<number, number[]>();

  for (const s of sales) {
    const prices = byMonth.get(s.month) ?? [];
    prices.push(s.priceCHF);
    byMonth.set(s.month, prices);
  }

  const totalRevenue = sales.reduce((sum, s) => sum + s.priceCHF, 0);

  const patterns: SeasonalPattern[] = [];

  for (let m = 0; m < 12; m++) {
    const prices = byMonth.get(m) ?? [];
    const monthRevenue = prices.reduce((a, b) => a + b, 0);
    patterns.push({
      month: m + 1,
      monthName: MONTH_NAMES[m],
      salesCount: prices.length,
      avgPriceCHF: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      revenueShare: totalRevenue > 0 ? Math.round((monthRevenue / totalRevenue) * 1000) / 10 : 0,
    });
  }

  return patterns;
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

function generateRecommendations(
  elasticities: SeriesElasticity[],
  seasonal: SeasonalPattern[],
  artworks: ArtworkRow[],
  toCHF: (amount: number, currency: string) => number,
): PricingRecommendation[] {
  // Find peak months (above-average revenue share)
  const avgShare = 100 / 12; // ~8.33%
  const peakMonths = seasonal
    .filter((s) => s.revenueShare > avgShare)
    .map((s) => s.monthName);

  // Current avg price per series from live artwork inventory
  const seriesCurrentPrices = new Map<string, number[]>();
  for (const a of artworks) {
    if (a.price == null || a.price <= 0) continue;
    const s = a.series || 'Unknown';
    const prices = seriesCurrentPrices.get(s) ?? [];
    prices.push(toCHF(a.price, a.currency || 'CHF'));
    seriesCurrentPrices.set(s, prices);
  }

  const recommendations: PricingRecommendation[] = [];

  for (const el of elasticities) {
    const currentPrices = seriesCurrentPrices.get(el.series);
    const currentAvgPrice = currentPrices && currentPrices.length > 0
      ? Math.round(currentPrices.reduce((a, b) => a + b, 0) / currentPrices.length)
      : el.avgPrice;

    let recommendedPrice: number;
    let reasoning: string;
    let projectedRevenueChange: number;

    if (el.elasticity > -0.5) {
      // Inelastic: demand barely drops with price increases
      const increase = el.elasticity > -0.2 ? 0.15 : 0.10;
      recommendedPrice = Math.round(currentAvgPrice * (1 + increase));
      const pctIncrease = Math.round(increase * 100);
      reasoning = `Demand is inelastic (elasticity ${el.elasticity}). A ${pctIncrease}% price increase should have minimal volume impact.`;
      if (peakMonths.length > 0) {
        reasoning += ` Consider timing the increase around peak months: ${peakMonths.slice(0, 3).join(', ')}.`;
      }
      // Revenue projection: price goes up by X%, volume drops by elasticity * X%
      const volumeChange = el.elasticity * increase;
      projectedRevenueChange = Math.round(((1 + increase) * (1 + volumeChange) - 1) * 1000) / 10;
    } else if (el.elasticity < -1.0) {
      // Very elastic: small price changes cause large volume swings
      const decrease = el.elasticity < -1.5 ? 0.05 : 0;
      recommendedPrice = Math.round(currentAvgPrice * (1 - decrease));
      if (decrease > 0) {
        reasoning = `Demand is highly elastic (elasticity ${el.elasticity}). A small 5% price reduction could significantly boost volume.`;
        const volumeChange = el.elasticity * (-decrease);
        projectedRevenueChange = Math.round(((1 - decrease) * (1 + volumeChange) - 1) * 1000) / 10;
      } else {
        reasoning = `Demand is elastic (elasticity ${el.elasticity}). Recommend holding current price to avoid volume loss.`;
        projectedRevenueChange = 0;
      }
    } else {
      // Moderate elasticity (-1.0 to -0.5): hold or small increase
      const increase = 0.05;
      recommendedPrice = Math.round(currentAvgPrice * (1 + increase));
      reasoning = `Moderate elasticity (${el.elasticity}). A cautious 5% increase is feasible.`;
      if (peakMonths.length > 0) {
        reasoning += ` Best timed with peak demand months: ${peakMonths.slice(0, 3).join(', ')}.`;
      }
      const volumeChange = el.elasticity * increase;
      projectedRevenueChange = Math.round(((1 + increase) * (1 + volumeChange) - 1) * 1000) / 10;
    }

    // Confidence based on sample size
    let confidence: 'high' | 'medium' | 'low';
    if (el.salesCount >= 10) {
      confidence = 'high';
    } else if (el.salesCount >= 5) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    recommendations.push({
      series: el.series,
      currentAvgPrice,
      recommendedPrice,
      reasoning,
      confidence,
      projectedRevenueChange,
    });
  }

  return recommendations.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });
}
