// ---------------------------------------------------------------------------
// useArtFairOptimizer -- Scores potential art fairs by predicted ROI
// Analyses past fair performance and recommends optimal country/region targets
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useExchangeRates } from './useExchangeRates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FairPerformance {
  exhibitionId: string;
  fairName: string;
  city: string | null;
  country: string | null;
  year: number;
  budget: number;
  budgetCurrency: string;
  revenue: number;
  revenueCHF: number;
  salesCount: number;
  roi: number;            // (revenue - budget) / budget * 100
  enquiriesGenerated: number;
  newContactsMade: number;
}

export interface FairRecommendation {
  country: string;
  city: string | null;
  score: number;          // 0-100 composite
  historicalROI: number | null;
  collectorDensity: number;
  galleryCoverage: number;
  marketGrowth: string;   // 'growing' | 'stable' | 'declining'
  recommendation: string;
}

export interface ArtFairOptimizerData {
  pastPerformance: FairPerformance[];
  avgROI: number;
  bestFair: string | null;
  worstFair: string | null;
  totalFairRevenue: number;
  totalFairBudget: number;
  recommendations: FairRecommendation[];
  countryScores: { country: string; score: number }[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useArtFairOptimizer() {
  const [data, setData] = useState<ArtFairOptimizerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toCHF, ready: ratesReady } = useExchangeRates();

  const fetchData = useCallback(async () => {
    if (!ratesReady) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch art fairs
      const [fairsRes, salesRes, enquiriesRes, contactsRes, galleriesRes] =
        await Promise.all([
          supabase
            .from('exhibitions')
            .select('id, title, city, country, start_date, end_date, budget, budget_currency, type')
            .eq('type', 'art_fair'),
          supabase
            .from('sales')
            .select('id, source_exhibition_id, sale_price, currency, sale_date'),
          supabase
            .from('enquiries')
            .select('id, location_country, created_at'),
          supabase
            .from('contacts')
            .select('id, country, type, created_at'),
          supabase
            .from('galleries')
            .select('id, country'),
        ]);

      const exhibitions = fairsRes.data || [];
      const sales = salesRes.data || [];
      const enquiries = enquiriesRes.data || [];
      const contacts = contactsRes.data || [];
      const galleries = galleriesRes.data || [];

      const fairIds = new Set(exhibitions.map((e) => e.id));

      // 2. Revenue & sales count per fair
      const revenueMap = new Map<string, number>();
      const salesCountMap = new Map<string, number>();
      for (const s of sales) {
        if (s.source_exhibition_id && fairIds.has(s.source_exhibition_id)) {
          const chf = toCHF(s.sale_price || 0, s.currency || 'CHF');
          revenueMap.set(
            s.source_exhibition_id,
            (revenueMap.get(s.source_exhibition_id) || 0) + chf,
          );
          salesCountMap.set(
            s.source_exhibition_id,
            (salesCountMap.get(s.source_exhibition_id) || 0) + 1,
          );
        }
      }

      // 3. Enquiries per fair (by date overlap)
      const enquiriesByFair = new Map<string, number>();
      for (const ex of exhibitions) {
        if (!ex.start_date || !ex.end_date) continue;
        const start = new Date(ex.start_date);
        const end = new Date(ex.end_date);
        let count = 0;
        for (const enq of enquiries) {
          if (!enq.created_at) continue;
          const d = new Date(enq.created_at);
          if (d >= start && d <= end) count++;
        }
        enquiriesByFair.set(ex.id, count);
      }

      // 4. Contacts created during fair period
      const contactsByFair = new Map<string, number>();
      for (const ex of exhibitions) {
        if (!ex.start_date || !ex.end_date) continue;
        const start = new Date(ex.start_date);
        const end = new Date(ex.end_date);
        let count = 0;
        for (const c of contacts) {
          if (!c.created_at) continue;
          const d = new Date(c.created_at);
          if (d >= start && d <= end) count++;
        }
        contactsByFair.set(ex.id, count);
      }

      // 5. Build past performance
      const pastPerformance: FairPerformance[] = exhibitions.map((ex) => {
        const budgetCHF = toCHF(ex.budget || 0, ex.budget_currency || 'CHF');
        const revenueCHF = revenueMap.get(ex.id) || 0;
        const roi = budgetCHF > 0 ? ((revenueCHF - budgetCHF) / budgetCHF) * 100 : 0;
        const year = ex.start_date
          ? new Date(ex.start_date).getFullYear()
          : new Date().getFullYear();

        return {
          exhibitionId: ex.id,
          fairName: ex.title || 'Untitled Fair',
          city: ex.city,
          country: ex.country,
          year,
          budget: budgetCHF,
          budgetCurrency: 'CHF',
          revenue: revenueCHF,
          revenueCHF,
          salesCount: salesCountMap.get(ex.id) || 0,
          roi,
          enquiriesGenerated: enquiriesByFair.get(ex.id) || 0,
          newContactsMade: contactsByFair.get(ex.id) || 0,
        };
      });

      // Aggregates
      const fairsWithBudget = pastPerformance.filter((f) => f.budget > 0);
      const avgROI =
        fairsWithBudget.length > 0
          ? fairsWithBudget.reduce((s, f) => s + f.roi, 0) / fairsWithBudget.length
          : 0;
      const totalFairRevenue = pastPerformance.reduce((s, f) => s + f.revenueCHF, 0);
      const totalFairBudget = pastPerformance.reduce((s, f) => s + f.budget, 0);

      const sorted = [...pastPerformance].sort((a, b) => b.roi - a.roi);
      const bestFair = sorted.length > 0 ? sorted[0].fairName : null;
      const worstFair =
        fairsWithBudget.length > 0
          ? [...fairsWithBudget].sort((a, b) => a.roi - b.roi)[0].fairName
          : null;

      // 6. Country-level analysis for recommendations
      // Collector density by country
      const collectorsByCountry = new Map<string, number>();
      for (const c of contacts) {
        if (c.country) {
          collectorsByCountry.set(c.country, (collectorsByCountry.get(c.country) || 0) + 1);
        }
      }

      // Gallery coverage by country
      const galleriesByCountry = new Map<string, number>();
      for (const g of galleries) {
        if (g.country) {
          galleriesByCountry.set(g.country, (galleriesByCountry.get(g.country) || 0) + 1);
        }
      }

      // Historical ROI by country
      const roiByCountry = new Map<string, number[]>();
      for (const f of pastPerformance) {
        if (f.country && f.budget > 0) {
          const arr = roiByCountry.get(f.country) || [];
          arr.push(f.roi);
          roiByCountry.set(f.country, arr);
        }
      }

      // Market growth from enquiry trend (current year vs prior year)
      const currentYear = new Date().getFullYear();
      const enquiriesByCountryYear = new Map<string, { current: number; prior: number }>();
      for (const enq of enquiries) {
        const country = enq.location_country;
        if (!country || !enq.created_at) continue;
        const y = new Date(enq.created_at).getFullYear();
        const entry = enquiriesByCountryYear.get(country) || { current: 0, prior: 0 };
        if (y === currentYear || y === currentYear - 1) {
          if (y === currentYear) entry.current++;
          else entry.prior++;
        }
        enquiriesByCountryYear.set(country, entry);
      }

      // Collect all countries
      const allCountries = new Set<string>();
      collectorsByCountry.forEach((_, k) => allCountries.add(k));
      galleriesByCountry.forEach((_, k) => allCountries.add(k));
      roiByCountry.forEach((_, k) => allCountries.add(k));

      // Normalization helpers
      const maxCollectors = Math.max(1, ...Array.from(collectorsByCountry.values()));
      const maxGalleries = Math.max(1, ...Array.from(galleriesByCountry.values()));

      // Build recommendations
      const recommendations: FairRecommendation[] = [];
      const countryScores: { country: string; score: number }[] = [];

      for (const country of allCountries) {
        const collectorCount = collectorsByCountry.get(country) || 0;
        const galleryCount = galleriesByCountry.get(country) || 0;
        const rois = roiByCountry.get(country);
        const historicalROI =
          rois && rois.length > 0 ? rois.reduce((a, b) => a + b, 0) / rois.length : null;

        const trend = enquiriesByCountryYear.get(country);
        let marketGrowth: 'growing' | 'stable' | 'declining' = 'stable';
        let growthScore = 50; // neutral
        if (trend) {
          if (trend.prior === 0 && trend.current > 0) {
            marketGrowth = 'growing';
            growthScore = 100;
          } else if (trend.prior > 0) {
            const change = ((trend.current - trend.prior) / trend.prior) * 100;
            if (change > 10) {
              marketGrowth = 'growing';
              growthScore = Math.min(100, 50 + change);
            } else if (change < -10) {
              marketGrowth = 'declining';
              growthScore = Math.max(0, 50 + change);
            }
          }
        }

        // Normalize values to 0-100
        const collectorDensityNorm = (collectorCount / maxCollectors) * 100;
        const galleryCoverageNorm = (galleryCount / maxGalleries) * 100;

        // ROI normalization: clamp between -100..500 then scale to 0-100
        let roiNorm = 50; // default when no historical data
        if (historicalROI !== null) {
          const clamped = Math.max(-100, Math.min(500, historicalROI));
          roiNorm = ((clamped + 100) / 600) * 100;
        }

        // Composite score
        const score =
          collectorDensityNorm * 0.3 +
          roiNorm * 0.4 +
          galleryCoverageNorm * 0.1 +
          growthScore * 0.2;

        // Find most common city in that country from past fairs
        const fairsInCountry = pastPerformance.filter((f) => f.country === country);
        const cityCount = new Map<string, number>();
        fairsInCountry.forEach((f) => {
          if (f.city) cityCount.set(f.city, (cityCount.get(f.city) || 0) + 1);
        });
        const topCity = cityCount.size > 0
          ? [...cityCount.entries()].sort((a, b) => b[1] - a[1])[0][0]
          : null;

        // Generate recommendation text
        let recommendation = 'Monitor market developments';
        if (score >= 70) {
          recommendation = 'Highly recommended — strong market fit';
        } else if (score >= 50) {
          recommendation = 'Worth exploring — moderate potential';
        } else if (score >= 30) {
          recommendation = 'Low priority — limited indicators';
        } else {
          recommendation = 'Not recommended at this time';
        }

        recommendations.push({
          country,
          city: topCity,
          score: Math.round(score * 10) / 10,
          historicalROI: historicalROI !== null ? Math.round(historicalROI * 10) / 10 : null,
          collectorDensity: collectorCount,
          galleryCoverage: galleryCount,
          marketGrowth,
          recommendation,
        });

        countryScores.push({ country, score: Math.round(score * 10) / 10 });
      }

      // Sort recommendations by score descending
      recommendations.sort((a, b) => b.score - a.score);
      countryScores.sort((a, b) => b.score - a.score);

      setData({
        pastPerformance: pastPerformance.sort((a, b) => b.revenueCHF - a.revenueCHF),
        avgROI,
        bestFair,
        worstFair,
        totalFairRevenue,
        totalFairBudget,
        recommendations,
        countryScores,
      });
    } catch (err) {
      console.error('Failed to fetch art fair optimizer data:', err);
      setError('Failed to load art fair optimizer data.');
    } finally {
      setLoading(false);
    }
  }, [ratesReady, toCHF]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
