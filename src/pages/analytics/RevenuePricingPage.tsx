// ---------------------------------------------------------------------------
// Revenue & Pricing -- Consolidated dashboard
// Tab 1: Revenue Trends (from RevenueOverviewPage)
// Tab 2: Pricing Intelligence (from PriceLadderPage + usePricingStrategy)
// Tab 3: Cash Flow (from LiquidityPlanningPage)
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { useRevenueOverview } from '../../hooks/useRevenueOverview';
import type { GalleryYearRow } from '../../hooks/useRevenueOverview';
import { usePriceLadder } from '../../hooks/usePriceLadder';
import { usePricingStrategy } from '../../hooks/usePricingStrategy';
import { useLiquidityPlanning } from '../../hooks/useLiquidityPlanning';
import type { LiquidityData } from '../../hooks/useLiquidityPlanning';
import { supabase } from '../../lib/supabase';
import {
  ComposedChart, Bar, Line, LineChart, BarChart, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'trends', label: 'Revenue Trends' },
  { key: 'pricing', label: 'Pricing Intelligence' },
  { key: 'cashflow', label: 'Cash Flow' },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const BAR_COLOR = '#1a1a2e';
const LINE_COLOR = '#e94560';
const GALLERY_COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#f5a623', '#7c3aed', '#059669', '#3b82f6', '#f97316'];
const TIER_COLORS: Record<string, string> = { entry: '#3b82f6', mid: '#f59e0b', top: '#10b981' };
const DIST_COLORS = ['#94a3b8', '#3b82f6', '#06b6d4', '#f59e0b', '#f97316', '#ef4444'];

// ---------------------------------------------------------------------------
// Small helper components
// ---------------------------------------------------------------------------

function KpiBox({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color || 'text-primary-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-primary-500">{sub}</p>}
    </Card>
  );
}

function RankBadge({ change }: { change: number | null }) {
  if (change == null) return <span className="text-xs text-primary-400">NEW</span>;
  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        {change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-500">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        {Math.abs(change)}
      </span>
    );
  }
  return <span className="text-xs text-primary-400">=</span>;
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-primary-100 bg-white p-3 shadow-md">
      <p className="mb-1 text-xs font-semibold text-primary-700">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(Math.round(entry.value), 'CHF')}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function RevenuePricingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'trends';

  const handleTabChange = (key: string) => {
    setSearchParams({ tab: key }, { replace: true });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">Revenue &amp; Pricing</h1>
        <p className="mt-1 text-sm text-primary-500">
          Revenue trends, pricing intelligence, and cash flow planning.
        </p>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onChange={handleTabChange} className="mb-6" />

      {activeTab === 'trends' && <RevenueTrendsTab />}
      {activeTab === 'pricing' && <PricingIntelligenceTab />}
      {activeTab === 'cashflow' && <CashFlowTab />}
    </div>
  );
}

// ===========================================================================
// Tab 1: Revenue Trends
// ===========================================================================

function RevenueTrendsTab() {
  const { data, loading, refresh } = useRevenueOverview();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedGalleries, setSelectedGalleries] = useState<Set<string>>(new Set());
  const [expandedGalleryId, setExpandedGalleryId] = useState<string | null>(null);
  const [scenarioPct, setScenarioPct] = useState(15);
  const [editingSellThrough, setEditingSellThrough] = useState<string | null>(null);
  const [sellThroughInput, setSellThroughInput] = useState('');
  const [savingSellThrough, setSavingSellThrough] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const saveSellThroughOverride = useCallback(async (galleryId: string, value: number | null) => {
    setSavingSellThrough(true);
    try {
      await supabase
        .from('galleries')
        .update({ sell_through_override: value } as never)
        .eq('id', galleryId);
      setEditingSellThrough(null);
      await refresh();
    } finally {
      setSavingSellThrough(false);
    }
  }, [refresh]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!data || data.years.length === 0) {
    return <div className="py-20 text-center text-primary-500">No revenue data available.</div>;
  }

  const activeYear = selectedYear ?? data.years[data.years.length - 1];
  const galleryRanking: GalleryYearRow[] = data.galleryRankingsByYear[activeYear] ?? [];
  const top10 = galleryRanking.slice(0, 10);

  // Gallery evolution data
  const allGalleryTotals = new Map<string, { name: string; total: number }>();
  for (const year of data.years) {
    for (const g of data.galleryRankingsByYear[year] ?? []) {
      const existing = allGalleryTotals.get(g.galleryId) ?? { name: g.galleryName, total: 0 };
      existing.total += g.revenue;
      allGalleryTotals.set(g.galleryId, existing);
    }
  }
  const sortedGalleries = Array.from(allGalleryTotals.entries()).sort((a, b) => b[1].total - a[1].total);
  const activeGalleryIds = selectedGalleries.size > 0
    ? selectedGalleries
    : new Set(sortedGalleries.slice(0, 5).map(([id]) => id));

  const galleryEvolutionData = data.years.map((year) => {
    const row: Record<string, number | string> = { year };
    for (const [gid] of sortedGalleries) {
      if (!activeGalleryIds.has(gid)) continue;
      const gRow = (data.galleryRankingsByYear[year] ?? []).find((g) => g.galleryId === gid);
      const gName = allGalleryTotals.get(gid)!.name;
      row[gName] = gRow?.revenue ?? 0;
    }
    return row;
  });

  const activeGalleryNames = sortedGalleries
    .filter(([id]) => activeGalleryIds.has(id))
    .map(([, val]) => val.name);

  function toggleGallery(id: string) {
    setSelectedGalleries((prev) => {
      const next = new Set(prev);
      if (prev.size === 0) {
        for (const [gid] of sortedGalleries.slice(0, 5)) next.add(gid);
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const prognosis = data.prognosis;
  const yoyLabel = (() => {
    if (prognosis && prognosis.priorYearRevenue != null && prognosis.priorYearRevenue > 0) {
      const change = ((prognosis.projectedRevenue - prognosis.priorYearRevenue) / prognosis.priorYearRevenue) * 100;
      return `${change > 0 ? '+' : ''}${change.toFixed(1)}% vs ${prognosis.currentYear - 1}`;
    }
    const completedYears = data.yearSummaries.filter((y) => y.year !== new Date().getFullYear());
    const latest = completedYears[completedYears.length - 1];
    if (latest?.yoyChange != null) {
      return `${latest.yoyChange > 0 ? '+' : ''}${latest.yoyChange.toFixed(1)}% vs ${latest.year - 1}`;
    }
    return '';
  })();

  return (
    <div>
      {/* Refresh */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-md bg-primary-900 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50 transition-colors"
        >
          <svg className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Lifetime Revenue" value={formatCurrency(data.lifetimeRevenue, 'CHF')} />
        <KpiBox
          label="Best Year"
          value={data.bestYear ? String(data.bestYear.year) : '\u2014'}
          sub={data.bestYear ? formatCurrency(data.bestYear.revenue, 'CHF') : undefined}
        />
        <KpiBox label="Years Active" value={data.years.length} />
        <KpiBox
          label={prognosis ? `${prognosis.currentYear} Projected YoY` : 'Latest YoY'}
          value={yoyLabel || '\u2014'}
          sub={prognosis ? 'projected vs prior year' : undefined}
        />
      </div>

      {/* Prognosis Section */}
      {prognosis && (
        <Card className="mb-6 p-6 border-l-4 border-l-accent">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-primary-900">
                {prognosis.currentYear} Prognosis
              </h3>
              <p className="text-xs text-primary-500 mt-0.5">
                Based on {prognosis.daysElapsed} days elapsed ({(prognosis.fractionElapsed * 100).toFixed(1)}% of year)
              </p>
            </div>
            {prognosis.vsLastYearPace != null && (
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                prognosis.vsLastYearPace >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
              }`}>
                {prognosis.vsLastYearPace >= 0 ? '\u2191' : '\u2193'}
                {Math.abs(prognosis.vsLastYearPace).toFixed(1)}% vs {prognosis.currentYear - 1} pace
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-6">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Revenue to Date</p>
              <p className="mt-1 text-xl font-bold text-primary-900">{formatCurrency(prognosis.revenueToDateIncPreSold, 'CHF')}</p>
              <p className="text-xs text-primary-400">{prognosis.salesCountToDate} sales + {prognosis.preSoldCount} pre-sold</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-cyan-600">+ Consignment (wtd)</p>
              <p className="mt-1 text-xl font-bold text-cyan-700">{formatCurrency(prognosis.weightedConsignmentRevenue, 'CHF')}</p>
              <p className="text-xs text-cyan-500">{prognosis.consignmentCount} orders x sell-through</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-accent">Projected Full Year</p>
              <p className="mt-1 text-xl font-bold text-accent">{formatCurrency(prognosis.projectedRevenue, 'CHF')}</p>
              <p className="mt-0.5 text-sm font-semibold text-accent/80">~{prognosis.projectedSalesCount + prognosis.preSoldCount + prognosis.consignmentCount} artworks</p>
              <p className="text-[10px] text-primary-400">pace + pre-sold + consignment</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Pace Only (excl. consignment)</p>
              <p className="mt-1 text-lg font-semibold text-primary-500">{formatCurrency(prognosis.projectedRevenue - prognosis.weightedConsignmentRevenue, 'CHF')}</p>
              <p className="mt-0.5 text-sm font-medium text-primary-500">~{prognosis.projectedSalesCount} artworks</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{prognosis.currentYear - 1} Same Period</p>
              <p className="mt-1 text-lg font-semibold text-primary-700">
                {prognosis.priorYearSamePeriodRevenue != null ? formatCurrency(prognosis.priorYearSamePeriodRevenue, 'CHF') : '\u2014'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{prognosis.currentYear - 1} Full Year</p>
              <p className="mt-1 text-lg font-semibold text-primary-700">
                {prognosis.priorYearRevenue != null ? formatCurrency(prognosis.priorYearRevenue, 'CHF') : '\u2014'}
              </p>
            </div>
          </div>

          {/* Commission Split */}
          {prognosis.projectedSplit.total > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-primary-700 mb-3">
                Projected Revenue Split
                <span className="ml-2 text-xs font-normal text-primary-400">based on gallery commission profiles</span>
              </h4>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-primary-500">Gallery</p>
                  <p className="mt-1 text-lg font-bold text-primary-800">{formatCurrency(prognosis.projectedSplit.gallery, 'CHF')}</p>
                  <p className="text-[10px] text-primary-400">
                    {prognosis.projectedSplit.total > 0 ? `${((prognosis.projectedSplit.gallery / prognosis.projectedSplit.total) * 100).toFixed(0)}%` : '\u2014'}
                  </p>
                </div>
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-accent">NOA Contemporary</p>
                  <p className="mt-1 text-lg font-bold text-accent">{formatCurrency(prognosis.projectedSplit.noa, 'CHF')}</p>
                  <p className="text-[10px] text-primary-400">
                    {prognosis.projectedSplit.total > 0 ? `${((prognosis.projectedSplit.noa / prognosis.projectedSplit.total) * 100).toFixed(0)}%` : '\u2014'}
                  </p>
                </div>
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-indigo-700">Simon Berger</p>
                  <p className="mt-1 text-lg font-bold text-indigo-800">{formatCurrency(prognosis.projectedSplit.artist, 'CHF')}</p>
                  <p className="text-[10px] text-primary-400">
                    {prognosis.projectedSplit.total > 0 ? `${((prognosis.projectedSplit.artist / prognosis.projectedSplit.total) * 100).toFixed(0)}%` : '\u2014'}
                  </p>
                </div>
              </div>
              {/* Stacked progress bar */}
              {(() => {
                const s = prognosis.projectedSplit;
                const galleryPct = s.total > 0 ? (s.gallery / s.total) * 100 : 0;
                const noaPct = s.total > 0 ? (s.noa / s.total) * 100 : 0;
                const artistPct = s.total > 0 ? (s.artist / s.total) * 100 : 0;
                return (
                  <div className="flex h-3 w-full overflow-hidden rounded-full">
                    <div className="bg-primary-400" style={{ width: `${galleryPct}%` }} title={`Gallery: ${galleryPct.toFixed(0)}%`} />
                    <div className="bg-accent" style={{ width: `${noaPct}%` }} title={`NOA: ${noaPct.toFixed(0)}%`} />
                    <div className="bg-indigo-500" style={{ width: `${artistPct}%` }} title={`Simon Berger: ${artistPct.toFixed(0)}%`} />
                  </div>
                );
              })()}
              <div className="mt-2 flex items-center gap-4 text-[10px] text-primary-500">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-primary-400" />Gallery</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-accent" />NOA</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />Simon Berger</span>
              </div>
              {/* Breakdown table */}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-primary-200 text-left font-medium uppercase tracking-wider text-primary-500">
                      <th className="pb-1.5 pr-4">Source</th>
                      <th className="pb-1.5 pr-4 text-right">Gallery</th>
                      <th className="pb-1.5 pr-4 text-right">NOA</th>
                      <th className="pb-1.5 pr-4 text-right">Simon Berger</th>
                      <th className="pb-1.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-primary-100">
                      <td className="py-1.5 pr-4 text-primary-600">Revenue to Date (incl. pre-sold)</td>
                      <td className="py-1.5 pr-4 text-right text-primary-700">{formatCurrency(prognosis.revenueToDateSplit.gallery, 'CHF')}</td>
                      <td className="py-1.5 pr-4 text-right text-primary-700">{formatCurrency(prognosis.revenueToDateSplit.noa, 'CHF')}</td>
                      <td className="py-1.5 pr-4 text-right text-primary-700">{formatCurrency(prognosis.revenueToDateSplit.artist, 'CHF')}</td>
                      <td className="py-1.5 text-right font-medium text-primary-900">{formatCurrency(prognosis.revenueToDateSplit.total, 'CHF')}</td>
                    </tr>
                    <tr className="border-b border-primary-100">
                      <td className="py-1.5 pr-4 text-cyan-600">Consignment (weighted)</td>
                      <td className="py-1.5 pr-4 text-right text-primary-700">{formatCurrency(prognosis.consignmentSplit.gallery, 'CHF')}</td>
                      <td className="py-1.5 pr-4 text-right text-primary-700">{formatCurrency(prognosis.consignmentSplit.noa, 'CHF')}</td>
                      <td className="py-1.5 pr-4 text-right text-primary-700">{formatCurrency(prognosis.consignmentSplit.artist, 'CHF')}</td>
                      <td className="py-1.5 text-right font-medium text-cyan-700">{formatCurrency(prognosis.consignmentSplit.total, 'CHF')}</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-primary-300 font-semibold">
                      <td className="pt-2 pr-4 text-primary-700">Projected Full Year</td>
                      <td className="pt-2 pr-4 text-right text-primary-800">{formatCurrency(prognosis.projectedSplit.gallery, 'CHF')}</td>
                      <td className="pt-2 pr-4 text-right text-accent">{formatCurrency(prognosis.projectedSplit.noa, 'CHF')}</td>
                      <td className="pt-2 pr-4 text-right text-indigo-700">{formatCurrency(prognosis.projectedSplit.artist, 'CHF')}</td>
                      <td className="pt-2 text-right text-primary-900">{formatCurrency(prognosis.projectedSplit.total, 'CHF')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Pipeline */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-primary-700 mb-3">Revenue Pipeline</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-700">Pre-Sold Orders</p>
                <p className="mt-1 text-lg font-bold text-emerald-800">{formatCurrency(prognosis.preSoldRevenue, 'CHF')}</p>
                <p className="text-[10px] text-emerald-600">{prognosis.preSoldCount} orders -- confirmed</p>
              </div>
              <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-700">Consignment Orders</p>
                <p className="mt-1 text-lg font-bold text-cyan-800">{formatCurrency(prognosis.consignmentRevenue, 'CHF')}</p>
                <p className="text-[10px] text-cyan-600">{prognosis.consignmentCount} orders -- exhibited</p>
              </div>
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-sky-700">Artworks on Consignment</p>
                <p className="mt-1 text-lg font-bold text-sky-800">{formatCurrency(prognosis.artworksAtGalleriesRevenue, 'CHF')}</p>
                <p className="text-[10px] text-sky-600">{prognosis.artworksAtGalleriesCount} artworks</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-amber-700">Other Active Orders</p>
                <p className="mt-1 text-lg font-bold text-amber-900">{formatCurrency(prognosis.confirmedOrdersRevenue - prognosis.preSoldRevenue - prognosis.consignmentRevenue, 'CHF')}</p>
                <p className="text-[10px] text-amber-600">{prognosis.confirmedOrdersCount - prognosis.preSoldCount - prognosis.consignmentCount} in production</p>
              </div>
              <div className="rounded-lg border border-primary-100 bg-primary-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-primary-500">Available Artwork Revenue</p>
                <p className="mt-1 text-lg font-bold text-primary-900">{formatCurrency(prognosis.potentialRevenue, 'CHF')}</p>
                <p className="text-[10px] text-primary-400">{prognosis.potentialCount} available artworks</p>
              </div>
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-center col-span-2 sm:col-span-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-accent">Total Pipeline</p>
                <p className="mt-1 text-lg font-bold text-accent">{formatCurrency(prognosis.totalPipeline, 'CHF')}</p>
                <p className="text-[10px] text-primary-400">all sources combined</p>
              </div>
            </div>
          </div>

          {/* Consignment sell-through per gallery */}
          {prognosis.consignmentGalleryDetails.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-primary-700 mb-3">
                Consignment Sell-Through by Gallery
                <span className="ml-2 text-xs font-normal text-primary-400">orders + artworks at gallery x sell-through rate</span>
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                      <th className="pb-2 pr-4">Gallery</th>
                      <th className="pb-2 pr-4 text-right">Orders</th>
                      <th className="pb-2 pr-4 text-right">Artworks</th>
                      <th className="pb-2 pr-4 text-right">Total Value</th>
                      <th className="pb-2 pr-4 text-right">Sell-Through</th>
                      <th className="pb-2 pr-4 text-right">Weighted</th>
                      <th className="pb-2 text-right">History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prognosis.consignmentGalleryDetails.map((g) => (
                      <tr key={g.galleryId} className="border-b border-primary-100">
                        <td className="py-2 pr-4 font-medium text-primary-900">{g.galleryName}</td>
                        <td className="py-2 pr-4 text-right text-primary-600">
                          {g.consignmentOrderCount > 0 ? `${formatCurrency(g.consignmentOrderValue, 'CHF')} (${g.consignmentOrderCount})` : '\u2014'}
                        </td>
                        <td className="py-2 pr-4 text-right text-primary-600">
                          {g.artworksAtGalleryCount > 0 ? `${formatCurrency(g.artworksAtGalleryValue, 'CHF')} (${g.artworksAtGalleryCount})` : '\u2014'}
                        </td>
                        <td className="py-2 pr-4 text-right text-primary-700 font-medium">{formatCurrency(g.totalConsignmentValue, 'CHF')}</td>
                        <td className="py-2 pr-4 text-right">
                          {editingSellThrough === g.galleryId ? (
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                autoFocus
                                disabled={savingSellThrough}
                                value={sellThroughInput}
                                onChange={(e) => setSellThroughInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = parseFloat(sellThroughInput);
                                    if (!isNaN(val) && val >= 0 && val <= 100) saveSellThroughOverride(g.galleryId, val / 100);
                                  } else if (e.key === 'Escape') {
                                    setEditingSellThrough(null);
                                  }
                                }}
                                onBlur={() => {
                                  const val = parseFloat(sellThroughInput);
                                  if (!isNaN(val) && val >= 0 && val <= 100) saveSellThroughOverride(g.galleryId, val / 100);
                                  else setEditingSellThrough(null);
                                }}
                                className="w-14 rounded border border-primary-300 px-1.5 py-0.5 text-right text-sm focus:border-accent focus:outline-none"
                              />
                              <span className="text-xs text-primary-400">%</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingSellThrough(g.galleryId); setSellThroughInput((g.sellThroughRate * 100).toFixed(0)); }}
                              className="group inline-flex items-center gap-1 hover:bg-primary-100 rounded px-1.5 py-0.5 -mr-1.5 transition-colors"
                              title="Click to override sell-through %"
                            >
                              <span className={`font-semibold ${g.sellThroughRate >= 0.5 ? 'text-emerald-600' : g.sellThroughRate >= 0.3 ? 'text-amber-600' : 'text-red-500'}`}>
                                {(g.sellThroughRate * 100).toFixed(0)}%
                              </span>
                              {g.isOverride ? (
                                <span className="flex items-center gap-0.5">
                                  <svg className="h-3 w-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); saveSellThroughOverride(g.galleryId, null); }}
                                    className="text-primary-300 hover:text-red-500 transition-colors"
                                    title="Reset to auto"
                                  >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </span>
                              ) : (
                                <svg className="h-3 w-3 text-primary-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right font-medium text-cyan-700">{formatCurrency(g.weightedValue, 'CHF')}</td>
                        <td className="py-2 text-right text-xs text-primary-400">{g.salesCount} sold / {g.totalHandled} handled</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-primary-200 font-semibold">
                      <td className="pt-2 pr-4 text-primary-700">Total</td>
                      <td className="pt-2 pr-4 text-right text-primary-600">{formatCurrency(prognosis.consignmentRevenue, 'CHF')}</td>
                      <td className="pt-2 pr-4 text-right text-primary-600">{formatCurrency(prognosis.artworksAtGalleriesRevenue, 'CHF')}</td>
                      <td className="pt-2 pr-4 text-right text-primary-700">{formatCurrency(prognosis.consignmentRevenue + prognosis.artworksAtGalleriesRevenue, 'CHF')}</td>
                      <td className="pt-2 pr-4" />
                      <td className="pt-2 pr-4 text-right text-cyan-700">{formatCurrency(prognosis.weightedConsignmentRevenue, 'CHF')}</td>
                      <td className="pt-2" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Price increase scenario */}
          {(() => {
            const elasticity = prognosis.priceScenario.elasticity;
            const baseRevenue = prognosis.projectedRevenue;
            const baseSalesCount = prognosis.projectedSalesCount;
            const volumeChangePct = scenarioPct * elasticity;
            const revenueMultiplier = (1 + scenarioPct / 100) * (1 + volumeChangePct / 100);
            const scenarioRevenue = baseRevenue * revenueMultiplier;
            const scenarioSales = Math.round(baseSalesCount * (1 + volumeChangePct / 100));
            const netEffect = (revenueMultiplier - 1) * 100;
            return (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-primary-700 mb-3">
                  Scenario: Price Increase
                  <span className="ml-2 text-xs font-normal text-primary-400">elasticity {elasticity} -- art market estimate</span>
                </h4>
                <div className="mb-4 flex items-center gap-4">
                  <label className="text-sm font-medium text-primary-700 whitespace-nowrap">+{scenarioPct}%</label>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={scenarioPct}
                    onChange={(e) => setScenarioPct(Number(e.target.value))}
                    className="w-full max-w-xs accent-violet-600"
                  />
                  <div className="flex gap-1">
                    {[10, 15, 20, 30, 50].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setScenarioPct(pct)}
                        className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                          scenarioPct === pct ? 'bg-violet-600 text-white' : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
                        }`}
                      >
                        +{pct}%
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-center">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-violet-700">Price Change</p>
                    <p className="mt-1 text-lg font-bold text-violet-800">+{scenarioPct}%</p>
                  </div>
                  <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-center">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-violet-700">Volume Impact</p>
                    <p className="mt-1 text-lg font-bold text-red-600">{volumeChangePct.toFixed(1)}%</p>
                    <p className="text-[10px] text-violet-500">~{scenarioSales} sales</p>
                  </div>
                  <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-center">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-violet-700">Net Revenue Effect</p>
                    <p className={`mt-1 text-lg font-bold ${netEffect >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {netEffect >= 0 ? '+' : ''}{netEffect.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-lg border border-violet-300 bg-violet-100 p-3 text-center">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-violet-800">Projected Revenue</p>
                    <p className="mt-1 text-lg font-bold text-violet-900">{formatCurrency(scenarioRevenue, 'CHF')}</p>
                    <p className="text-[10px] text-violet-600">vs {formatCurrency(baseRevenue, 'CHF')} current</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Monthly breakdown */}
          <h4 className="text-sm font-semibold text-primary-700 mb-2">Monthly Breakdown -- {prognosis.currentYear}</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={prognosis.monthlyBreakdown.map((m) => ({
              ...m,
              name: MONTH_NAMES[m.month],
              isFuture: m.month > new Date().getMonth(),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')} />
              <Tooltip formatter={(value: number) => [formatCurrency(value, 'CHF'), 'Revenue']} />
              <Bar dataKey="revenue" name="Revenue" radius={[3, 3, 0, 0]}>
                {prognosis.monthlyBreakdown.map((m, i) => (
                  <Cell key={i} fill={m.month > new Date().getMonth() ? '#e2e8f0' : BAR_COLOR} opacity={m.month > new Date().getMonth() ? 0.4 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="space-y-6">
        {/* Annual Revenue Chart */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Annual Revenue</h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data.yearSummaries.map((ys) => ({
              ...ys,
              projected: data.prognosis && ys.year === data.prognosis.currentYear
                ? data.prognosis.projectedRevenue - ys.revenue
                : 0,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="revenue" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')} />
              <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 12 }} label={{ value: 'Sales', angle: 90, position: 'insideRight', fontSize: 11 }} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'revenue') return [formatCurrency(value, 'CHF'), 'Revenue'];
                  if (name === 'projected') return [formatCurrency(value, 'CHF'), 'Projected (remaining)'];
                  if (name === 'count') return [value, 'Sales'];
                  return [value, name];
                }}
                labelFormatter={(label) => `Year ${label}`}
              />
              <Bar yAxisId="revenue" dataKey="revenue" name="revenue" fill={BAR_COLOR} radius={[4, 4, 0, 0]} stackId="rev" />
              <Bar yAxisId="revenue" dataKey="projected" name="projected" fill={BAR_COLOR} opacity={0.2} radius={[4, 4, 0, 0]} stackId="rev" />
              <Line yAxisId="count" type="monotone" dataKey="count" name="count" stroke={LINE_COLOR} strokeWidth={2} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        {/* Year-by-Year Summary Table */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Year-by-Year Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  <th className="pb-3 pr-4">Year</th>
                  <th className="pb-3 pr-4 text-right">Revenue</th>
                  <th className="pb-3 pr-4 text-right"># Sales</th>
                  <th className="pb-3 pr-4 text-right">Avg Price</th>
                  <th className="pb-3 text-right">YoY Change</th>
                </tr>
              </thead>
              <tbody>
                {[...data.yearSummaries].reverse().map((ys) => (
                  <tr
                    key={ys.year}
                    className={`border-b border-primary-100 hover:bg-primary-50 cursor-pointer ${ys.year === activeYear ? 'bg-primary-50 font-medium' : ''}`}
                    onClick={() => { setSelectedYear(ys.year); setExpandedGalleryId(null); }}
                  >
                    <td className="py-3 pr-4 font-medium text-primary-900">{ys.year}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{formatCurrency(ys.revenue, 'CHF')}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{ys.count}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{formatCurrency(ys.avgPrice, 'CHF')}</td>
                    <td className="py-3 text-right">
                      {ys.yoyChange != null ? (
                        <span className={ys.yoyChange >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                          {ys.yoyChange > 0 ? '+' : ''}{ys.yoyChange.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-primary-400">\u2014</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Gallery Revenue Evolution */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Gallery Revenue Evolution</h3>
          <p className="text-xs text-primary-500 mb-3">Click galleries below to toggle them on/off. Showing top 5 by default.</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {sortedGalleries.map(([gid, val], i) => (
              <button
                key={gid}
                onClick={() => toggleGallery(gid)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeGalleryIds.has(gid) ? 'text-white' : 'bg-primary-100 text-primary-500 hover:bg-primary-200'
                }`}
                style={activeGalleryIds.has(gid) ? { backgroundColor: GALLERY_COLORS[i % GALLERY_COLORS.length] } : undefined}
              >
                {val.name}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={galleryEvolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')} />
              <Tooltip formatter={(value: number, name: string) => [formatCurrency(value, 'CHF'), name]} labelFormatter={(label) => `Year ${label}`} />
              <Legend />
              {activeGalleryNames.map((name, i) => {
                const gIdx = sortedGalleries.findIndex(([, val]) => val.name === name);
                return (
                  <Line key={name} type="monotone" dataKey={name} stroke={GALLERY_COLORS[gIdx % GALLERY_COLORS.length]} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Gallery Ranking Section */}
        <div className="flex items-center gap-3 mt-2">
          <h2 className="font-display text-xl font-bold text-primary-900">Gallery Ranking</h2>
          <div className="flex flex-wrap gap-1">
            {data.years.map((y) => (
              <button
                key={y}
                onClick={() => { setSelectedYear(y); setExpandedGalleryId(null); }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  y === activeYear ? 'bg-primary-900 text-white' : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Top 10 Bar Chart */}
        {top10.length > 0 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Top 10 Galleries -- {activeYear}</h3>
            <p className="text-xs text-primary-500 mb-3">Click a bar to see the revenue breakdown for that gallery.</p>
            <ResponsiveContainer width="100%" height={Math.max(300, top10.length * 40)}>
              <BarChart
                data={top10}
                layout="vertical"
                onClick={(state) => {
                  if (state?.activePayload?.[0]) {
                    const row = state.activePayload[0].payload as GalleryYearRow;
                    setExpandedGalleryId((prev) => prev === row.galleryId ? null : row.galleryId);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')} />
                <YAxis dataKey="galleryName" type="category" tick={{ fontSize: 11 }} width={160} />
                <Tooltip formatter={(value: number) => formatCurrency(value, 'CHF')} />
                <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} className="cursor-pointer">
                  {top10.map((g, i) => (
                    <Cell
                      key={i}
                      fill={GALLERY_COLORS[i % GALLERY_COLORS.length]}
                      stroke={expandedGalleryId === g.galleryId ? '#000' : 'none'}
                      strokeWidth={expandedGalleryId === g.galleryId ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Expanded gallery revenue detail */}
            {expandedGalleryId && (() => {
              const gallery = galleryRanking.find((g) => g.galleryId === expandedGalleryId);
              if (!gallery || gallery.details.length === 0) return null;
              const salesDetails = gallery.details.filter((d) => d.type === 'sale');
              const preSoldDetails = gallery.details.filter((d) => d.type === 'pre_sold');
              const consignOrderDetails = gallery.details.filter((d) => d.type === 'consignment_order');
              const consignArtworkDetails = gallery.details.filter((d) => d.type === 'consignment_artwork');
              const hasConsignment = consignOrderDetails.length > 0 || consignArtworkDetails.length > 0;
              const hasMultipleTypes = [salesDetails, preSoldDetails, consignOrderDetails, consignArtworkDetails].filter((a) => a.length > 0).length > 1;
              const salesTotal = salesDetails.reduce((sum, d) => sum + d.amountCHF, 0);
              const preSoldTotal = preSoldDetails.reduce((sum, d) => sum + d.amountCHF, 0);
              const consignOrderGross = consignOrderDetails.reduce((sum, d) => sum + (d.grossCHF ?? d.amount), 0);
              const consignOrderWeighted = consignOrderDetails.reduce((sum, d) => sum + d.amountCHF, 0);
              const consignArtworkGross = consignArtworkDetails.reduce((sum, d) => sum + (d.grossCHF ?? d.amount), 0);
              const consignArtworkWeighted = consignArtworkDetails.reduce((sum, d) => sum + d.amountCHF, 0);

              const typeBadge = (type: string) => {
                switch (type) {
                  case 'sale': return <Badge variant="default">Sale</Badge>;
                  case 'pre_sold': return <Badge variant="success">Pre-sold</Badge>;
                  case 'consignment_order': return <Badge variant="info">Consignment</Badge>;
                  case 'consignment_artwork': return <Badge variant="info">Artwork@Gallery</Badge>;
                  default: return null;
                }
              };

              return (
                <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50/50 p-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-display text-base font-semibold text-primary-900">
                      {gallery.galleryName} -- Revenue Breakdown ({activeYear})
                    </h4>
                    <button onClick={() => setExpandedGalleryId(null)} className="rounded-md p-1 text-primary-400 hover:bg-primary-200 hover:text-primary-700 transition-colors">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                          <th className="pb-2 pr-4">Type</th>
                          <th className="pb-2 pr-4">Date / Info</th>
                          {hasConsignment ? (
                            <>
                              <th className="pb-2 pr-4 text-right">Gross CHF</th>
                              <th className="pb-2 text-right">Weighted CHF</th>
                            </>
                          ) : (
                            <>
                              <th className="pb-2 pr-4 text-right">Amount</th>
                              <th className="pb-2 text-right">CHF</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {gallery.details.map((d, i) => {
                          const isConsignment = d.type === 'consignment_order' || d.type === 'consignment_artwork';
                          return (
                            <tr key={`${d.id}-${i}`} className="border-b border-primary-100">
                              <td className="py-2 pr-4">{typeBadge(d.type)}</td>
                              <td className="py-2 pr-4 text-primary-600 text-xs">
                                {d.date ? new Date(d.date).toLocaleDateString('de-CH') : (d.label ?? '\u2014')}
                              </td>
                              <td className="py-2 pr-4 text-right text-primary-700">
                                {isConsignment ? formatCurrency(d.grossCHF ?? d.amount, 'CHF') : formatCurrency(d.amount, d.currency)}
                              </td>
                              <td className={`py-2 text-right font-medium ${isConsignment ? 'text-cyan-700' : 'text-primary-900'}`}>
                                {formatCurrency(d.amountCHF, 'CHF')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {hasMultipleTypes && (
                        <tfoot>
                          {salesDetails.length > 0 && (
                            <tr className="border-t border-primary-200 text-xs text-primary-500">
                              <td className="pt-2 pr-4" colSpan={2}>Sales ({salesDetails.length})</td>
                              <td className="pt-2 pr-4 text-right">{formatCurrency(salesTotal, 'CHF')}</td>
                              <td className="pt-2 text-right">{formatCurrency(salesTotal, 'CHF')}</td>
                            </tr>
                          )}
                          {preSoldDetails.length > 0 && (
                            <tr className="text-xs text-primary-500">
                              <td className="py-1 pr-4" colSpan={2}>Pre-sold ({preSoldDetails.length})</td>
                              <td className="py-1 pr-4 text-right">{formatCurrency(preSoldTotal, 'CHF')}</td>
                              <td className="py-1 text-right">{formatCurrency(preSoldTotal, 'CHF')}</td>
                            </tr>
                          )}
                          {consignOrderDetails.length > 0 && (
                            <tr className="text-xs text-cyan-600">
                              <td className="py-1 pr-4" colSpan={2}>Consignment orders ({consignOrderDetails.length})</td>
                              <td className="py-1 pr-4 text-right">{formatCurrency(consignOrderGross, 'CHF')}</td>
                              <td className="py-1 text-right">{formatCurrency(consignOrderWeighted, 'CHF')}</td>
                            </tr>
                          )}
                          {consignArtworkDetails.length > 0 && (
                            <tr className="text-xs text-sky-600">
                              <td className="py-1 pr-4" colSpan={2}>Artworks on consignment ({consignArtworkDetails.length})</td>
                              <td className="py-1 pr-4 text-right">{formatCurrency(consignArtworkGross, 'CHF')}</td>
                              <td className="py-1 text-right">{formatCurrency(consignArtworkWeighted, 'CHF')}</td>
                            </tr>
                          )}
                          <tr className="border-t border-primary-300 font-semibold">
                            <td className="pt-2 pr-4" colSpan={2}>Total ({gallery.details.length} items)</td>
                            <td className="pt-2 pr-4 text-right text-primary-400 text-xs">
                              {hasConsignment ? formatCurrency(salesTotal + preSoldTotal + consignOrderGross + consignArtworkGross, 'CHF') : ''}
                            </td>
                            <td className="pt-2 text-right text-primary-900">{formatCurrency(gallery.revenue, 'CHF')}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              );
            })()}
          </Card>
        )}

        {/* Full Gallery Ranking Table */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Full Gallery Ranking -- {activeYear}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  <th className="pb-3 pr-4">Rank</th>
                  <th className="pb-3 pr-4">Gallery</th>
                  <th className="pb-3 pr-4 text-right">Revenue</th>
                  <th className="pb-3 pr-4 text-right"># Sales</th>
                  <th className="pb-3 pr-4 text-right">Avg Price</th>
                  <th className="pb-3 pr-2 text-center">vs Prior Year</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {galleryRanking.map((g) => (
                  <tr
                    key={g.galleryId}
                    className={`border-b border-primary-100 hover:bg-primary-50 cursor-pointer transition-colors ${expandedGalleryId === g.galleryId ? 'bg-primary-50' : ''}`}
                    onClick={() => setExpandedGalleryId((prev) => prev === g.galleryId ? null : g.galleryId)}
                  >
                    <td className="py-3 pr-4 font-medium text-primary-500">{g.rank}</td>
                    <td className="py-3 pr-4 font-medium text-primary-900 underline-offset-2 hover:underline">{g.galleryName}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{formatCurrency(g.revenue, 'CHF')}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{g.count}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{formatCurrency(g.avgPrice, 'CHF')}</td>
                    <td className="py-3 pr-2 text-center"><RankBadge change={g.rankChange} /></td>
                    <td className="py-3">
                      {g.galleryId !== 'direct' && (
                        <Link
                          to="/analytics/galleries?tab=scorecard"
                          className="text-xs text-accent hover:underline whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Gallery &rarr;
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ===========================================================================
// Tab 2: Pricing Intelligence
// ===========================================================================

function PricingIntelligenceTab() {
  const { data: ladderData, loading: ladderLoading } = usePriceLadder();
  const { data: strategyData, loading: strategyLoading } = usePricingStrategy();

  const loading = ladderLoading || strategyLoading;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Price Ladder Section */}
      {ladderData && ladderData.totalPriced > 0 && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiBox label="Priced Works" value={ladderData.totalPriced} />
            <KpiBox label="Average Price" value={formatCurrency(ladderData.avgPrice, 'CHF')} />
            <KpiBox label="Median Price" value={formatCurrency(ladderData.medianPrice, 'CHF')} />
            <KpiBox label="Price Tiers" value={ladderData.tiers.length} />
          </div>

          {/* Tier cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {ladderData.tiers.map((tier) => (
              <Card key={tier.tier} className="p-6 text-center" style={{ borderTop: `4px solid ${TIER_COLORS[tier.tier] || '#94a3b8'}` }}>
                <h3 className="font-display text-lg font-semibold text-primary-900">{tier.label}</h3>
                <p className="mt-2 text-2xl font-bold" style={{ color: TIER_COLORS[tier.tier] || '#94a3b8' }}>
                  {formatCurrency(tier.avgPrice, 'CHF')}
                </p>
                <p className="mt-1 text-xs text-primary-500">
                  {formatCurrency(tier.minPrice, 'CHF')} -- {formatCurrency(tier.maxPrice, 'CHF')}
                </p>
                <p className="mt-1 text-sm text-primary-600">{tier.count} works</p>
              </Card>
            ))}
          </div>

          {/* Price distribution */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Price Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ladderData.priceDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {ladderData.priceDistribution.map((_, i) => (
                    <Cell key={i} fill={DIST_COLORS[i % DIST_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Price by series + size */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Avg Price by Series</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ladderData.priceBySeries.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')} />
                  <YAxis dataKey="series" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, 'CHF')} />
                  <Bar dataKey="avgPrice" name="Avg Price" fill="#1a1a2e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {/* Series cross-reference links */}
              <div className="mt-4 space-y-1">
                {ladderData.priceBySeries.slice(0, 5).map((s) => (
                  <div key={s.series} className="flex items-center justify-between text-xs">
                    <span className="text-primary-700">{s.series}</span>
                    <Link to="/analytics/series?tab=performance" className="text-accent hover:underline">
                      View Series &rarr;
                    </Link>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Avg Price by Size</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ladderData.priceBySize}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="size" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')} />
                  <Tooltip formatter={(v: number) => formatCurrency(v, 'CHF')} />
                  <Bar dataKey="avgPrice" name="Avg Price" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}

      {/* Pricing Strategy Section */}
      {strategyData && (
        <>
          {/* Series Elasticity */}
          {strategyData.seriesElasticity.length > 0 && (
            <Card className="p-6">
              <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Series Price Elasticity</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                      <th className="pb-3 pr-4">Series</th>
                      <th className="pb-3 pr-4 text-right">Elasticity</th>
                      <th className="pb-3 pr-4 text-right">Avg Price</th>
                      <th className="pb-3 pr-4 text-right">Sales</th>
                      <th className="pb-3 pr-4 text-right">Price Range</th>
                      <th className="pb-3 pr-4 text-right">Optimal Range</th>
                      <th className="pb-3 pr-2 text-right">Rev-Max Price</th>
                      <th className="pb-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {strategyData.seriesElasticity.map((el) => (
                      <tr key={el.series} className="border-b border-primary-100">
                        <td className="py-3 pr-4 font-medium text-primary-900">{el.series}</td>
                        <td className="py-3 pr-4 text-right">
                          <span className={`font-semibold ${el.elasticity > -0.5 ? 'text-emerald-600' : el.elasticity > -1 ? 'text-amber-600' : 'text-red-500'}`}>
                            {el.elasticity}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right text-primary-700">{formatCurrency(el.avgPrice, 'CHF')}</td>
                        <td className="py-3 pr-4 text-right text-primary-700">{el.salesCount}</td>
                        <td className="py-3 pr-4 text-right text-xs text-primary-500">
                          {formatCurrency(el.priceRange.min, 'CHF')} -- {formatCurrency(el.priceRange.max, 'CHF')}
                        </td>
                        <td className="py-3 pr-4 text-right text-xs text-emerald-600">
                          {formatCurrency(el.optimalPriceRange.min, 'CHF')} -- {formatCurrency(el.optimalPriceRange.max, 'CHF')}
                        </td>
                        <td className="py-3 pr-2 text-right font-medium text-primary-900">{formatCurrency(el.revenueMaximizingPrice, 'CHF')}</td>
                        <td className="py-3">
                          <Link to="/analytics/series?tab=performance" className="text-xs text-accent hover:underline whitespace-nowrap">
                            View Series &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Gallery Pricing Power */}
          {strategyData.galleryPricing.length > 0 && (
            <Card className="p-6">
              <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Gallery Pricing Power</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                      <th className="pb-3 pr-4">Gallery</th>
                      <th className="pb-3 pr-4 text-right">Avg Sale (CHF)</th>
                      <th className="pb-3 pr-4 text-right">Avg Discount</th>
                      <th className="pb-3 pr-4 text-right">At List %</th>
                      <th className="pb-3 pr-4 text-right">Price Premium</th>
                      <th className="pb-3 text-right">Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategyData.galleryPricing.map((gp) => (
                      <tr key={gp.galleryId} className="border-b border-primary-100">
                        <td className="py-3 pr-4 font-medium text-primary-900">{gp.galleryName}</td>
                        <td className="py-3 pr-4 text-right text-primary-700">{formatCurrency(gp.avgSalePriceCHF, 'CHF')}</td>
                        <td className="py-3 pr-4 text-right text-primary-600">{gp.avgDiscountPercent.toFixed(1)}%</td>
                        <td className="py-3 pr-4 text-right text-primary-600">{gp.atListPriceRate.toFixed(0)}%</td>
                        <td className="py-3 pr-4 text-right">
                          <span className={gp.pricePremium >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                            {gp.pricePremium >= 0 ? '+' : ''}{gp.pricePremium.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 text-right text-primary-700">{gp.salesCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Size Premiums */}
          {strategyData.sizePremiums.length > 0 && (
            <Card className="p-6">
              <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Size Premiums</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                      <th className="pb-3 pr-4">Size</th>
                      <th className="pb-3 pr-4 text-right">Avg Price (CHF)</th>
                      <th className="pb-3 pr-4 text-right">Sales</th>
                      <th className="pb-3 text-right">Premium vs Smallest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategyData.sizePremiums.map((sp) => (
                      <tr key={sp.sizeCategory} className="border-b border-primary-100">
                        <td className="py-3 pr-4 font-medium text-primary-900">{sp.sizeCategory}</td>
                        <td className="py-3 pr-4 text-right text-primary-700">{formatCurrency(sp.avgPriceCHF, 'CHF')}</td>
                        <td className="py-3 pr-4 text-right text-primary-700">{sp.salesCount}</td>
                        <td className="py-3 text-right">
                          {sp.premiumVsSmallest > 0 ? (
                            <span className="text-emerald-600">+{sp.premiumVsSmallest.toFixed(1)}%</span>
                          ) : (
                            <span className="text-primary-400">baseline</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Seasonal Patterns */}
          {strategyData.seasonalPatterns.length > 0 && (
            <Card className="p-6">
              <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Seasonal Demand Patterns</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={strategyData.seasonalPatterns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="monthName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number, name: string) => name === 'avgPriceCHF' ? formatCurrency(v, 'CHF') : v} />
                  <Bar dataKey="salesCount" name="Sales" fill="#1a1a2e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Pricing Recommendations */}
          {strategyData.recommendations.length > 0 && (
            <Card className="p-6">
              <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Pricing Recommendations</h3>
              <div className="space-y-4">
                {strategyData.recommendations.map((rec) => (
                  <div key={rec.series} className="rounded-lg border border-primary-200 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-primary-900">{rec.series}</h4>
                        <Badge variant={rec.confidence === 'high' ? 'success' : rec.confidence === 'medium' ? 'warning' : 'default'}>
                          {rec.confidence}
                        </Badge>
                      </div>
                      <Link to="/analytics/series?tab=performance" className="text-xs text-accent hover:underline whitespace-nowrap">
                        View Series &rarr;
                      </Link>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-2 text-sm">
                      <div>
                        <p className="text-xs text-primary-500">Current Avg</p>
                        <p className="font-medium text-primary-900">{formatCurrency(rec.currentAvgPrice, 'CHF')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-primary-500">Recommended</p>
                        <p className="font-medium text-emerald-700">{formatCurrency(rec.recommendedPrice, 'CHF')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-primary-500">Revenue Impact</p>
                        <p className={`font-medium ${rec.projectedRevenueChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {rec.projectedRevenueChange >= 0 ? '+' : ''}{rec.projectedRevenueChange.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-primary-600">{rec.reasoning}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* No data fallback */}
      {(!ladderData || ladderData.totalPriced === 0) && !strategyData && (
        <div className="py-20 text-center text-primary-500">No pricing data available.</div>
      )}
    </div>
  );
}

// ===========================================================================
// Tab 3: Cash Flow
// ===========================================================================

function CashFlowTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [entity, setEntity] = useState<'noa' | 'sb'>('noa');
  const { noaData, sbData, loading } = useLiquidityPlanning(year);

  const data: LiquidityData | null = entity === 'noa' ? noaData : sbData;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Year navigation + Entity toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setYear((y) => y - 1)}>&larr;</Button>
          <span className="text-lg font-semibold min-w-[4rem] text-center">{year}</span>
          <Button variant="primary" onClick={() => setYear((y) => y + 1)}>&rarr;</Button>
        </div>
        <div className="flex gap-2">
          <Button variant={entity === 'noa' ? 'primary' : 'outline'} onClick={() => setEntity('noa')}>NOA</Button>
          <Button variant={entity === 'sb' ? 'primary' : 'outline'} onClick={() => setEntity('sb')}>Simon Berger</Button>
        </div>
      </div>

      {!data ? (
        <Card className="p-8 text-center text-primary-500">No data available for {year}.</Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiBox label="Total Revenue In" value={formatCurrency(Math.round(data.totalRevenueIn), 'CHF')} />
            <KpiBox label="Expected In" value={formatCurrency(Math.round(data.totalExpectedIn), 'CHF')} />
            <KpiBox label="Total Expenses Out" value={formatCurrency(Math.round(data.totalExpensesOut), 'CHF')} />
            <KpiBox
              label="Net Position"
              value={formatCurrency(Math.round(data.totalNet), 'CHF')}
              color={data.totalNet >= 0 ? 'text-emerald-600' : 'text-red-600'}
            />
          </div>

          {/* Cumulative Line Chart */}
          <Card className="p-4">
            <h2 className="mb-4 text-sm font-semibold text-primary-700">Cumulative Cash Flow</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="cumulative" name="Cumulative Net" stroke="#1a1a2e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Monthly Inflow vs Outflow */}
          <Card className="p-4">
            <h2 className="mb-4 text-sm font-semibold text-primary-700">Monthly Inflow vs Outflow</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="revenueIn" name="Revenue In" fill="#e94560" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expectedIn" name="Expected In" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expensesOut" name="Expenses Out" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Monthly Breakdown Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Month</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Revenue In</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Expected</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Expenses Out</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Net</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Cumulative</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {data.months.map((m) => {
                    const isCurrentMonth = year === new Date().getFullYear() && m.monthIndex === new Date().getMonth();
                    return (
                      <tr key={m.month} className={isCurrentMonth ? 'bg-blue-50/60' : ''}>
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-gray-900">
                          {m.month}
                          {isCurrentMonth && <span className="ml-2 text-xs text-blue-600">(current)</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-gray-700">{formatCurrency(Math.round(m.revenueIn), 'CHF')}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-emerald-600">{formatCurrency(Math.round(m.expectedIn), 'CHF')}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right text-sm text-red-600">{formatCurrency(Math.round(m.expensesOut), 'CHF')}</td>
                        <td className={`whitespace-nowrap px-4 py-2 text-right text-sm font-semibold ${m.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.round(m.net), 'CHF')}
                        </td>
                        <td className={`whitespace-nowrap px-4 py-2 text-right text-sm font-semibold ${m.cumulative >= 0 ? 'text-primary-900' : 'text-red-600'}`}>
                          {formatCurrency(Math.round(m.cumulative), 'CHF')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr className="font-semibold">
                    <td className="px-4 py-2 text-sm text-gray-900">Total</td>
                    <td className="px-4 py-2 text-right text-sm text-gray-900">{formatCurrency(Math.round(data.totalRevenueIn), 'CHF')}</td>
                    <td className="px-4 py-2 text-right text-sm text-emerald-600">{formatCurrency(Math.round(data.totalExpectedIn), 'CHF')}</td>
                    <td className="px-4 py-2 text-right text-sm text-red-600">{formatCurrency(Math.round(data.totalExpensesOut), 'CHF')}</td>
                    <td className={`px-4 py-2 text-right text-sm ${data.totalNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(Math.round(data.totalNet), 'CHF')}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-primary-900">{formatCurrency(Math.round(data.currentBalance), 'CHF')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
