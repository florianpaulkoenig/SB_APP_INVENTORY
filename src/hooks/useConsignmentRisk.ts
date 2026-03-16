// ---------------------------------------------------------------------------
// useConsignmentRisk -- Consignment Risk Scoring
// Scores each consigned artwork by probability of selling, based on:
//   - Days on consignment (longer = higher risk)
//   - Gallery sell-through rate for that series/size
//   - Gallery partner score trend (from partner_score_snapshots if available)
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { gallerySellThrough } from '../lib/analytics/gallery';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConsignmentRiskItem {
  artworkId: string;
  artworkTitle: string;
  series: string | null;
  sizeCategory: string | null;
  galleryId: string;
  galleryName: string;
  consignedSince: string;
  daysConsigned: number;
  riskScore: number;         // 0-100 (100 = highest risk)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  gallerySellThrough: number;
  galleryPartnerScore: number;
  recommendAction: string;   // e.g. "Monitor", "Review", "Consider Recall"
}

export interface ConsignmentRiskData {
  items: ConsignmentRiskItem[];
  totalConsigned: number;
  criticalCount: number;
  highRiskCount: number;
  avgDaysConsigned: number;
  avgRiskScore: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeTimeFactor(days: number): number {
  if (days < 30) return 0;
  if (days < 90) return 20;
  if (days < 180) return 50;
  if (days < 365) return 75;
  return 100;
}

function computeSellThroughFactor(rate: number): number {
  if (rate > 70) return 0;
  if (rate >= 50) return 25;
  if (rate >= 30) return 50;
  if (rate >= 10) return 75;
  return 100;
}

function computePartnerScoreFactor(score: number): number {
  if (score > 70) return 0;
  if (score >= 50) return 25;
  if (score >= 30) return 50;
  return 100;
}

function computeRiskScore(
  daysConsigned: number,
  sellThroughRate: number,
  partnerScore: number,
): number {
  const timeFactor = computeTimeFactor(daysConsigned);
  const sellThroughFactor = computeSellThroughFactor(sellThroughRate);
  const partnerFactor = computePartnerScoreFactor(partnerScore);

  return Math.round(timeFactor * 0.4 + sellThroughFactor * 0.35 + partnerFactor * 0.25);
}

function riskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score < 25) return 'low';
  if (score <= 50) return 'medium';
  if (score <= 75) return 'high';
  return 'critical';
}

function recommendAction(level: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (level) {
    case 'low': return 'Monitor';
    case 'medium': return 'Review allocation';
    case 'high': return 'Consider recall';
    case 'critical': return 'Recall recommended';
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConsignmentRisk(): {
  data: ConsignmentRiskData | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<ConsignmentRiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      // Parallel data fetches
      const [consignedRes, galleriesRes, salesRes, allArtworksRes, snapshotsRes] =
        await Promise.all([
          // 1. Artworks on consignment
          supabase
            .from('artworks')
            .select('id, title, series, size_category, gallery_id, consigned_since')
            .eq('status', 'on_consignment'),
          // 2. Galleries
          supabase.from('galleries').select('id, name'),
          // 3. Sales (for sell-through)
          supabase.from('sales').select('id, gallery_id, artwork_id'),
          // 4. All artworks with gallery_id (for total allocated per gallery)
          supabase.from('artworks').select('id, gallery_id'),
          // 5. Partner score snapshots (latest per gallery)
          supabase
            .from('partner_score_snapshots')
            .select('gallery_id, score, snapshot_date')
            .order('snapshot_date', { ascending: false }),
        ]);

      if (consignedRes.error) throw consignedRes.error;
      if (galleriesRes.error) throw galleriesRes.error;
      if (salesRes.error) throw salesRes.error;
      if (allArtworksRes.error) throw allArtworksRes.error;
      // Snapshots table may not exist yet -- treat errors as empty
      const snapshots = snapshotsRes.error ? [] : (snapshotsRes.data ?? []);

      const consignedArtworks = consignedRes.data ?? [];
      const galleries = galleriesRes.data ?? [];
      const sales = salesRes.data ?? [];
      const allArtworks = allArtworksRes.data ?? [];

      if (consignedArtworks.length === 0) {
        setData({
          items: [],
          totalConsigned: 0,
          criticalCount: 0,
          highRiskCount: 0,
          avgDaysConsigned: 0,
          avgRiskScore: 0,
        });
        setLoading(false);
        return;
      }

      // Build lookup maps
      const galleryMap = new Map<string, string>();
      for (const g of galleries) {
        galleryMap.set(g.id, g.name);
      }

      // Total allocated per gallery (all artworks that have a gallery_id)
      const allocatedByGallery = new Map<string, number>();
      for (const a of allArtworks) {
        if (!a.gallery_id) continue;
        allocatedByGallery.set(a.gallery_id, (allocatedByGallery.get(a.gallery_id) ?? 0) + 1);
      }

      // Sold count per gallery
      const soldByGallery = new Map<string, number>();
      for (const s of sales) {
        if (!s.gallery_id) continue;
        soldByGallery.set(s.gallery_id, (soldByGallery.get(s.gallery_id) ?? 0) + 1);
      }

      // Latest partner score per gallery (snapshots sorted desc, take first per gallery)
      const latestPartnerScore = new Map<string, number>();
      for (const snap of snapshots) {
        if (!latestPartnerScore.has(snap.gallery_id)) {
          latestPartnerScore.set(snap.gallery_id, Number(snap.score) || 50);
        }
      }

      const now = new Date();

      // Score each consigned artwork
      const items: ConsignmentRiskItem[] = consignedArtworks.map((artwork) => {
        const gId = artwork.gallery_id ?? '';
        const gName = galleryMap.get(gId) ?? 'Unknown Gallery';

        // Days on consignment
        const consignedDate = artwork.consigned_since
          ? new Date(artwork.consigned_since)
          : now;
        const daysConsigned = Math.max(
          0,
          Math.floor((now.getTime() - consignedDate.getTime()) / 86400000),
        );

        // Gallery sell-through rate
        const sold = soldByGallery.get(gId) ?? 0;
        const allocated = allocatedByGallery.get(gId) ?? 0;
        const sellThrough = gallerySellThrough(sold, allocated);

        // Partner score (from snapshots or default 50)
        const partnerScore = latestPartnerScore.get(gId) ?? 50;

        const score = computeRiskScore(daysConsigned, sellThrough, partnerScore);
        const level = riskLevel(score);
        const action = recommendAction(level);

        return {
          artworkId: artwork.id,
          artworkTitle: artwork.title ?? 'Untitled',
          series: artwork.series ?? null,
          sizeCategory: artwork.size_category ?? null,
          galleryId: gId,
          galleryName: gName,
          consignedSince: artwork.consigned_since ?? '',
          daysConsigned,
          riskScore: score,
          riskLevel: level,
          gallerySellThrough: Math.round(sellThrough * 10) / 10,
          galleryPartnerScore: Math.round(partnerScore),
          recommendAction: action,
        };
      });

      // Sort by risk score descending (highest risk first)
      items.sort((a, b) => b.riskScore - a.riskScore);

      const totalConsigned = items.length;
      const criticalCount = items.filter((i) => i.riskLevel === 'critical').length;
      const highRiskCount = items.filter((i) => i.riskLevel === 'high').length;
      const avgDaysConsigned = totalConsigned > 0
        ? Math.round(items.reduce((s, i) => s + i.daysConsigned, 0) / totalConsigned)
        : 0;
      const avgRiskScore = totalConsigned > 0
        ? Math.round(items.reduce((s, i) => s + i.riskScore, 0) / totalConsigned)
        : 0;

      setData({
        items,
        totalConsigned,
        criticalCount,
        highRiskCount,
        avgDaysConsigned,
        avgRiskScore,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to compute consignment risk';
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refresh: fetch };
}
