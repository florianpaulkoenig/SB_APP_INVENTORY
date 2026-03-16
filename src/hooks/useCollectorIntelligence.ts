// ---------------------------------------------------------------------------
// useCollectorIntelligence -- Collector Intelligence Dashboard data (Dashboard 4)
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { CollectorProfile, CollectorHealth } from '../lib/analytics/collector';
import { repeatBuyerCount, classifySpendTiers, collectorsByCountry, buildCollectorHealth } from '../lib/analytics/collector';
import type { SpendTier } from '../lib/analytics/collector';

export interface CollectorIntelligenceData {
  profiles: CollectorProfile[];
  totalCollectors: number;
  repeatBuyers: number;
  spendTiers: SpendTier[];
  byCountry: { country: string; count: number }[];
  topCollectors: CollectorProfile[];
  avgSpend: number;
  anonymousCount: number;
  collectorHealth: CollectorHealth[];
  atRiskCount: number;
  churnCriticalCount: number;
}

export function useCollectorIntelligence() {
  const [data, setData] = useState<CollectorIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      // Get sales with buyer info and artwork series
      const { data: salesData, error } = await supabase
        .from('sales')
        .select('id, buyer_name, sale_price, currency, sale_date, collector_anonymity_mode, contact_id, artworks(series), contacts(first_name, last_name, country, city)')
        .not('sale_date', 'is', null);

      if (error) throw error;
      const sales = salesData ?? [];

      // Build collector profiles by contact_id (or buyer_name for anonymous)
      const profileMap = new Map<string, {
        id: string;
        name: string | null;
        isAnonymous: boolean;
        country: string | null;
        city: string | null;
        totalSpent: number;
        purchases: string[];
        seriesSet: Set<string>;
      }>();

      for (const s of sales) {
        const contact = s.contacts as { first_name: string; last_name: string; country: string | null; city: string | null } | null;
        const artData = s.artworks as { series: string | null } | null;
        const isAnon = (s.collector_anonymity_mode as string) === 'anonymous' || (s.collector_anonymity_mode as string) === 'private';
        const key = s.contact_id || s.buyer_name || `anon-${s.id}`;
        const name = contact ? `${contact.first_name} ${contact.last_name}`.trim() : s.buyer_name;

        const existing = profileMap.get(key) ?? {
          id: key,
          name: isAnon ? null : (name || null),
          isAnonymous: isAnon,
          country: contact?.country ?? null,
          city: contact?.city ?? null,
          totalSpent: 0,
          purchases: [],
          seriesSet: new Set<string>(),
        };

        existing.totalSpent += Number(s.sale_price) || 0;
        existing.purchases.push(s.sale_date);
        if (artData?.series) existing.seriesSet.add(artData.series);
        profileMap.set(key, existing);
      }

      const profiles: CollectorProfile[] = [...profileMap.values()].map((p) => ({
        id: p.id,
        name: p.name,
        isAnonymous: p.isAnonymous,
        country: p.country,
        city: p.city,
        totalSpent: p.totalSpent,
        purchaseCount: p.purchases.length,
        firstPurchase: p.purchases.sort()[0] || '',
        lastPurchase: p.purchases.sort().reverse()[0] || '',
        preferredSeries: [...p.seriesSet],
      }));

      const repeats = repeatBuyerCount(profiles);
      const tiers = classifySpendTiers(profiles);
      const byCountryRaw = collectorsByCountry(profiles);
      const byCountry = Object.entries(byCountryRaw)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count);

      const topCollectors = [...profiles]
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 15);

      const totalSpent = profiles.reduce((s, p) => s + p.totalSpent, 0);
      const avgSpend = profiles.length > 0 ? totalSpent / profiles.length : 0;
      const anonymousCount = profiles.filter((p) => p.isAnonymous).length;

      const collectorHealth = buildCollectorHealth(profiles);
      const atRiskCount = collectorHealth.filter(
        (c) => c.churnRisk === 'high' || c.churnRisk === 'critical',
      ).length;
      const churnCriticalCount = collectorHealth.filter(
        (c) => c.churnRisk === 'critical',
      ).length;

      setData({
        profiles,
        totalCollectors: profiles.length,
        repeatBuyers: repeats,
        spendTiers: tiers,
        byCountry,
        topCollectors,
        avgSpend,
        anonymousCount,
        collectorHealth,
        atRiskCount,
        churnCriticalCount,
      });
    } catch (err: unknown) {
      toast({ title: 'Error', description: 'Failed to load collector data', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, refresh: fetch };
}
