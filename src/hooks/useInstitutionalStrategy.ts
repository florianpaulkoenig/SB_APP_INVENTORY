// ---------------------------------------------------------------------------
// useInstitutionalStrategy -- Institutional Placement Strategy data
// Collection placements, type/country distribution, gap analysis
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstitutionPlacement {
  collectionId: string;
  collectionName: string;
  city: string | null;
  country: string | null;
  institutionType: string | null;
  artworkCount: number;
  latestAcquisitionYear: number | null;
  artworkTitles: string[];
}

export interface TypeDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface CountryDistribution {
  country: string;
  count: number;
  institutions: string[];
}

export interface PlacementGap {
  category: string;
  current: number;
  target: string;
  status: 'strong' | 'developing' | 'gap';
}

export interface InstitutionalStrategyData {
  placements: InstitutionPlacement[];
  totalPlacements: number;
  totalInstitutions: number;
  totalArtworksPlaced: number;
  typeDistribution: TypeDistribution[];
  countryDistribution: CountryDistribution[];
  placementVelocity: number; // placements per year
  gaps: PlacementGap[];
  recentPlacements: InstitutionPlacement[]; // last 2 years
}

// ---------------------------------------------------------------------------
// Gap analysis targets
// ---------------------------------------------------------------------------

const GAP_TARGETS: { category: string; target: number; label: string }[] = [
  { category: 'museum', target: 3, label: '3+ major museums' },
  { category: 'foundation', target: 2, label: '2+ foundations' },
  { category: 'corporate', target: 1, label: '1+ corporate' },
  { category: 'university', target: 1, label: '1+ university' },
  { category: 'government', target: 1, label: '1+ government' },
];

function gapStatus(current: number, target: number): 'strong' | 'developing' | 'gap' {
  if (current >= target) return 'strong';
  if (current > 0) return 'developing';
  return 'gap';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useInstitutionalStrategy() {
  const [data, setData] = useState<InstitutionalStrategyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const [collectionsRes, junctionRes, artworksRes] = await Promise.all([
        supabase
          .from('public_collections')
          .select('id, name, city, country, institution_type, website, notes'),
        supabase
          .from('artwork_collections')
          .select('artwork_id, collection_id, acquisition_year, notes'),
        supabase
          .from('artworks')
          .select('id, title'),
      ]);

      if (collectionsRes.error) throw collectionsRes.error;
      if (junctionRes.error) throw junctionRes.error;
      if (artworksRes.error) throw artworksRes.error;

      const collections = collectionsRes.data ?? [];
      const junctions = junctionRes.data ?? [];
      const artworks = artworksRes.data ?? [];

      // Build artwork title lookup
      const artworkMap = new Map<string, string>();
      for (const a of artworks) {
        artworkMap.set(a.id, a.title ?? 'Untitled');
      }

      // Group junction rows by collection_id
      const collectionJunctions = new Map<string, typeof junctions>();
      for (const j of junctions) {
        const list = collectionJunctions.get(j.collection_id) ?? [];
        list.push(j);
        collectionJunctions.set(j.collection_id, list);
      }

      // Build placements (only collections that have at least 1 artwork)
      const placements: InstitutionPlacement[] = [];
      for (const c of collections) {
        const rows = collectionJunctions.get(c.id);
        if (!rows || rows.length === 0) continue;

        const years = rows
          .map((r) => r.acquisition_year)
          .filter((y): y is number => y != null);

        placements.push({
          collectionId: c.id,
          collectionName: c.name,
          city: c.city,
          country: c.country,
          institutionType: c.institution_type,
          artworkCount: rows.length,
          latestAcquisitionYear: years.length > 0 ? Math.max(...years) : null,
          artworkTitles: rows.map((r) => artworkMap.get(r.artwork_id) ?? 'Untitled'),
        });
      }

      placements.sort((a, b) => b.artworkCount - a.artworkCount);

      // Totals
      const totalInstitutions = placements.length;
      const totalArtworksPlaced = placements.reduce((s, p) => s + p.artworkCount, 0);
      const totalPlacements = junctions.length;

      // Type distribution
      const typeCounts = new Map<string, number>();
      for (const p of placements) {
        const t = p.institutionType ?? 'other';
        typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
      }
      const typeDistribution: TypeDistribution[] = Array.from(typeCounts.entries())
        .map(([type, count]) => ({
          type,
          count,
          percentage: totalInstitutions > 0 ? Math.round((count / totalInstitutions) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Country distribution
      const countryCounts = new Map<string, { count: number; institutions: Set<string> }>();
      for (const p of placements) {
        const country = p.country ?? 'Unknown';
        const entry = countryCounts.get(country) ?? { count: 0, institutions: new Set<string>() };
        entry.count++;
        entry.institutions.add(p.collectionName);
        countryCounts.set(country, entry);
      }
      const countryDistribution: CountryDistribution[] = Array.from(countryCounts.entries())
        .map(([country, v]) => ({
          country,
          count: v.count,
          institutions: Array.from(v.institutions),
        }))
        .sort((a, b) => b.count - a.count);

      // Placement velocity: total placements / span of years
      const allYears = junctions
        .map((j) => j.acquisition_year)
        .filter((y): y is number => y != null);
      let placementVelocity = 0;
      if (allYears.length > 0) {
        const minYear = Math.min(...allYears);
        const maxYear = Math.max(...allYears);
        const span = maxYear - minYear + 1;
        placementVelocity = Math.round((totalPlacements / span) * 10) / 10;
      }

      // Gap analysis
      const gaps: PlacementGap[] = GAP_TARGETS.map(({ category, target, label }) => {
        const current = typeCounts.get(category) ?? 0;
        return {
          category,
          current,
          target: label,
          status: gapStatus(current, target),
        };
      });

      // Recent placements (last 2 years)
      const currentYear = new Date().getFullYear();
      const recentPlacements = placements.filter(
        (p) => p.latestAcquisitionYear != null && p.latestAcquisitionYear >= currentYear - 2
      );

      setData({
        placements,
        totalPlacements,
        totalInstitutions,
        totalArtworksPlaced,
        typeDistribution,
        countryDistribution,
        placementVelocity,
        gaps,
        recentPlacements,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch institutional strategy data';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
