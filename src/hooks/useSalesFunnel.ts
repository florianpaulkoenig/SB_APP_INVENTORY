import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FunnelStage {
  stage: string;
  count: number;
  conversionRate: number; // % that moved to next stage
  avgDaysInStage: number | null;
  value: number; // total deal value at this stage
}

export interface FunnelBottleneck {
  fromStage: string;
  toStage: string;
  dropOffRate: number; // % lost between stages
  dropOffCount: number;
}

export interface SalesFunnelData {
  stages: FunnelStage[];
  bottlenecks: FunnelBottleneck[];
  totalEnquiries: number;
  totalConverted: number; // enquiries that became deals
  totalSold: number;
  overallConversionRate: number; // enquiry → sale
  avgCycleTime: number | null; // days from enquiry to sale
  stageDistribution: Record<string, number>; // current deals by stage
}

// ---------------------------------------------------------------------------
// Ordered funnel stages (excluding "lost" which is a terminal exit)
// ---------------------------------------------------------------------------

const FUNNEL_ORDER = ['enquiry', 'lead', 'contacted', 'quoted', 'negotiating', 'sold'] as const;

// Map deal stages to their sequential index (for "at or beyond" logic)
const STAGE_INDEX: Record<string, number> = {
  lead: 1,
  contacted: 2,
  quoted: 3,
  negotiating: 4,
  sold: 5,
};

// ---------------------------------------------------------------------------
// Helper – days between two ISO dates
// ---------------------------------------------------------------------------

function daysBetween(a: string, b: string): number {
  return Math.abs(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24),
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSalesFunnel(): {
  data: SalesFunnelData | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [data, setData] = useState<SalesFunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      // 1. Fetch enquiries
      const { data: enquiries, error: eErr } = await supabase
        .from('enquiries')
        .select('id, status, converted_deal_id, created_at');

      if (eErr) throw eErr;

      // 2. Fetch deals
      const { data: deals, error: dErr } = await supabase
        .from('deals')
        .select('id, stage, value, currency, created_at, artwork_id, contact_id');

      if (dErr) throw dErr;

      // 3. Fetch sales
      const { data: sales, error: sErr } = await supabase
        .from('sales')
        .select('id, artwork_id, sale_date, sale_price, currency');

      if (sErr) throw sErr;

      // ----- Derived counts ---------------------------------------------------

      const allEnquiries = enquiries ?? [];
      const allDeals = deals ?? [];
      const allSales = sales ?? [];

      const totalEnquiries = allEnquiries.length;

      // Enquiries that converted to a deal
      const convertedEnquiries = allEnquiries.filter(
        (e) => e.converted_deal_id != null,
      );
      const totalConverted = convertedEnquiries.length;

      // Build a lookup: deal_id → enquiry (for cycle-time calc)
      const enquiryByDealId = new Map<string, (typeof allEnquiries)[number]>();
      for (const e of convertedEnquiries) {
        if (e.converted_deal_id) {
          enquiryByDealId.set(e.converted_deal_id, e);
        }
      }

      // Sales lookup by artwork_id for cross-referencing
      const salesByArtworkId = new Map<string, (typeof allSales)[number]>();
      for (const s of allSales) {
        if (s.artwork_id) salesByArtworkId.set(s.artwork_id, s);
      }

      // ----- Build funnel stages ---------------------------------------------

      // "At or beyond" counts: a deal at stage X also counts for all prior stages
      const atOrBeyond = (minStage: string) =>
        allDeals.filter((d) => {
          const idx = STAGE_INDEX[d.stage as string];
          const minIdx = STAGE_INDEX[minStage];
          return idx != null && minIdx != null && idx >= minIdx;
        }).length;

      const soldDeals = allDeals.filter((d) => d.stage === 'sold');
      const totalSold = soldDeals.length;

      // Stage counts
      const stageCounts: Record<string, number> = {
        enquiry: totalEnquiries,
        lead: atOrBeyond('lead'),
        contacted: atOrBeyond('contacted'),
        quoted: atOrBeyond('quoted'),
        negotiating: atOrBeyond('negotiating'),
        sold: totalSold,
      };

      // Stage values (sum of deal.value for deals currently at each stage)
      const stageValues: Record<string, number> = {
        enquiry: 0,
        lead: 0,
        contacted: 0,
        quoted: 0,
        negotiating: 0,
        sold: 0,
      };
      for (const d of allDeals) {
        const s = d.stage as string;
        if (s in stageValues) {
          stageValues[s] += (d.value as number) ?? 0;
        }
      }
      // Enquiry stage value = sum of converted deal values
      stageValues.enquiry = allDeals.reduce(
        (sum, d) => sum + ((d.value as number) ?? 0),
        0,
      );

      // Build FunnelStage array
      const stages: FunnelStage[] = FUNNEL_ORDER.map((stage, i) => {
        const count = stageCounts[stage];
        const nextCount =
          i < FUNNEL_ORDER.length - 1
            ? stageCounts[FUNNEL_ORDER[i + 1]]
            : count;
        const conversionRate = count > 0 ? (nextCount / count) * 100 : 0;

        return {
          stage,
          count,
          conversionRate: Math.round(conversionRate * 10) / 10,
          avgDaysInStage: null, // calculated below for deal stages
          value: stageValues[stage],
        };
      });

      // ----- Bottlenecks ------------------------------------------------------

      const bottlenecks: FunnelBottleneck[] = [];
      for (let i = 0; i < FUNNEL_ORDER.length - 1; i++) {
        const from = FUNNEL_ORDER[i];
        const to = FUNNEL_ORDER[i + 1];
        const fromCount = stageCounts[from];
        const toCount = stageCounts[to];
        const dropOffCount = fromCount - toCount;
        const dropOffRate = fromCount > 0 ? (dropOffCount / fromCount) * 100 : 0;

        bottlenecks.push({
          fromStage: from,
          toStage: to,
          dropOffRate: Math.round(dropOffRate * 10) / 10,
          dropOffCount,
        });
      }

      // Sort by biggest drop-off rate descending
      bottlenecks.sort((a, b) => b.dropOffRate - a.dropOffRate);

      // ----- Avg cycle time (enquiry → sale) ----------------------------------

      const cycleTimes: number[] = [];
      for (const deal of soldDeals) {
        const enquiry = enquiryByDealId.get(deal.id);
        if (enquiry?.created_at) {
          // Try to find matching sale by artwork_id for the sale_date
          const sale = deal.artwork_id
            ? salesByArtworkId.get(deal.artwork_id)
            : null;
          const endDate = sale?.sale_date ?? deal.created_at; // fallback to deal created_at
          cycleTimes.push(daysBetween(enquiry.created_at, endDate));
        }
      }

      const avgCycleTime =
        cycleTimes.length > 0
          ? Math.round(
              (cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) * 10,
            ) / 10
          : null;

      // ----- Stage distribution (active deals only) ---------------------------

      const stageDistribution: Record<string, number> = {};
      for (const d of allDeals) {
        const s = d.stage as string;
        if (s !== 'sold' && s !== 'lost') {
          stageDistribution[s] = (stageDistribution[s] ?? 0) + 1;
        }
      }

      // ----- Overall conversion rate ------------------------------------------

      const overallConversionRate =
        totalEnquiries > 0
          ? Math.round((totalSold / totalEnquiries) * 1000) / 10
          : 0;

      // ----- Commit -----------------------------------------------------------

      setData({
        stages,
        bottlenecks,
        totalEnquiries,
        totalConverted,
        totalSold,
        overallConversionRate,
        avgCycleTime,
        stageDistribution,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load funnel data';
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
