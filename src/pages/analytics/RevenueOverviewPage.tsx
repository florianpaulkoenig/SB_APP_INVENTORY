// ---------------------------------------------------------------------------
// NOA Inventory -- Revenue Overview Page
// Year-by-year revenue analysis + gallery ranking with YoY evolution
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';
import { useRevenueOverview } from '../../hooks/useRevenueOverview';
import type { GalleryYearRow } from '../../hooks/useRevenueOverview';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import {
  ComposedChart, Bar, Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Cell, ReferenceLine,
} from 'recharts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const BAR_COLOR = '#1a1a2e';
const LINE_COLOR = '#e94560';
const GALLERY_COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#f5a623', '#7c3aed', '#059669', '#3b82f6', '#f97316'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function RankBadge({ change }: { change: number | null }) {
  if (change == null) {
    return <span className="text-xs text-primary-400">NEW</span>;
  }
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

function KpiBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-primary-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-primary-500">{sub}</p>}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function RevenueOverviewPage() {
  const { data, loading, refresh } = useRevenueOverview();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedGalleries, setSelectedGalleries] = useState<Set<string>>(new Set());
  const [expandedGalleryId, setExpandedGalleryId] = useState<string | null>(null);
  const [editingSellThrough, setEditingSellThrough] = useState<string | null>(null);
  const [sellThroughInput, setSellThroughInput] = useState('');
  const [savingSellThrough, setSavingSellThrough] = useState(false);

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
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data || data.years.length === 0) {
    return (
      <div className="py-20 text-center text-primary-500">
        No revenue data available.
      </div>
    );
  }

  // Default to latest year
  const activeYear = selectedYear ?? data.years[data.years.length - 1];
  const galleryRanking: GalleryYearRow[] = data.galleryRankingsByYear[activeYear] ?? [];
  const top10 = galleryRanking.slice(0, 10);

  // ---- Gallery evolution data for multi-line chart --------------------------
  // Build: [{ year: 2022, "Gallery A": 50000, "Gallery B": 30000 }, ...]

  // Get all galleries that ever had revenue, sorted by lifetime total
  const allGalleryTotals = new Map<string, { name: string; total: number }>();
  for (const year of data.years) {
    for (const g of data.galleryRankingsByYear[year] ?? []) {
      const existing = allGalleryTotals.get(g.galleryId) ?? { name: g.galleryName, total: 0 };
      existing.total += g.revenue;
      allGalleryTotals.set(g.galleryId, existing);
    }
  }
  const sortedGalleries = Array.from(allGalleryTotals.entries())
    .sort((a, b) => b[1].total - a[1].total);

  // Default: show top 5 if nothing selected
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
      // If nothing was explicitly selected, initialize from defaults
      if (prev.size === 0) {
        for (const [gid] of sortedGalleries.slice(0, 5)) next.add(gid);
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // YoY growth: for current year use projected revenue vs prior year full revenue
  const prognosis = data.prognosis;
  const yoyLabel = (() => {
    if (prognosis && prognosis.priorYearRevenue != null && prognosis.priorYearRevenue > 0) {
      const change = ((prognosis.projectedRevenue - prognosis.priorYearRevenue) / prognosis.priorYearRevenue) * 100;
      return `${change > 0 ? '+' : ''}${change.toFixed(1)}% vs ${prognosis.currentYear - 1}`;
    }
    // Fallback to last completed year's YoY
    const completedYears = data.yearSummaries.filter((y) => y.year !== new Date().getFullYear());
    const latest = completedYears[completedYears.length - 1];
    if (latest?.yoyChange != null) {
      return `${latest.yoyChange > 0 ? '+' : ''}${latest.yoyChange.toFixed(1)}% vs ${latest.year - 1}`;
    }
    return '';
  })();

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">
          Revenue Overview
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Year-by-year revenue analysis and gallery ranking evolution.
        </p>
      </div>
      <div className="mb-6 flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-md bg-primary-900 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800 disabled:opacity-50 transition-colors"
        >
          <svg className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Lifetime Revenue" value={formatCurrency(data.lifetimeRevenue, 'CHF')} />
        <KpiBox
          label="Best Year"
          value={data.bestYear ? String(data.bestYear.year) : '—'}
          sub={data.bestYear ? formatCurrency(data.bestYear.revenue, 'CHF') : undefined}
        />
        <KpiBox label="Years Active" value={data.years.length} />
        <KpiBox
          label={prognosis ? `${prognosis.currentYear} Projected YoY` : 'Latest YoY'}
          value={yoyLabel || '—'}
          sub={prognosis ? 'projected vs prior year' : undefined}
        />
      </div>

      {/* ---- Prognosis Section ---- */}
      {data.prognosis && (
        <Card className="mb-6 p-6 border-l-4 border-l-accent">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-primary-900">
                {data.prognosis.currentYear} Prognosis
              </h3>
              <p className="text-xs text-primary-500 mt-0.5">
                Based on {data.prognosis.daysElapsed} days elapsed ({(data.prognosis.fractionElapsed * 100).toFixed(1)}% of year)
              </p>
            </div>
            {data.prognosis.vsLastYearPace != null && (
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                data.prognosis.vsLastYearPace >= 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-600'
              }`}>
                {data.prognosis.vsLastYearPace >= 0 ? '↑' : '↓'}
                {Math.abs(data.prognosis.vsLastYearPace).toFixed(1)}% vs {data.prognosis.currentYear - 1} pace
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-6">
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Revenue to Date</p>
              <p className="mt-1 text-xl font-bold text-primary-900">{formatCurrency(data.prognosis.revenueToDateIncPreSold, 'CHF')}</p>
              <p className="text-xs text-primary-400">{data.prognosis.salesCountToDate} sales + {data.prognosis.preSoldCount} pre-sold</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-cyan-600">+ Consignment (wtd)</p>
              <p className="mt-1 text-xl font-bold text-cyan-700">{formatCurrency(data.prognosis.weightedConsignmentRevenue, 'CHF')}</p>
              <p className="text-xs text-cyan-500">{data.prognosis.consignmentCount} orders × sell-through</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-accent">Projected Full Year</p>
              <p className="mt-1 text-xl font-bold text-accent">{formatCurrency(data.prognosis.projectedRevenue, 'CHF')}</p>
              <p className="text-xs text-primary-400">pace + consignment</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Pace Only (excl. consignment)</p>
              <p className="mt-1 text-lg font-semibold text-primary-500">{formatCurrency(data.prognosis.projectedRevenue - data.prognosis.weightedConsignmentRevenue, 'CHF')}</p>
              <p className="text-xs text-primary-400">~{data.prognosis.projectedSalesCount} sales</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{data.prognosis.currentYear - 1} Same Period</p>
              <p className="mt-1 text-lg font-semibold text-primary-700">
                {data.prognosis.priorYearSamePeriodRevenue != null
                  ? formatCurrency(data.prognosis.priorYearSamePeriodRevenue, 'CHF')
                  : '—'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{data.prognosis.currentYear - 1} Full Year</p>
              <p className="mt-1 text-lg font-semibold text-primary-700">
                {data.prognosis.priorYearRevenue != null
                  ? formatCurrency(data.prognosis.priorYearRevenue, 'CHF')
                  : '—'}
              </p>
            </div>
          </div>

          {/* Pipeline: Potential + Orders breakdown */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-primary-700 mb-3">Revenue Pipeline</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-700">Pre-Sold Orders</p>
                <p className="mt-1 text-lg font-bold text-emerald-800">{formatCurrency(data.prognosis.preSoldRevenue, 'CHF')}</p>
                <p className="text-[10px] text-emerald-600">{data.prognosis.preSoldCount} orders — confirmed</p>
              </div>
              <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-700">Consignment Orders</p>
                <p className="mt-1 text-lg font-bold text-cyan-800">{formatCurrency(data.prognosis.consignmentRevenue, 'CHF')}</p>
                <p className="text-[10px] text-cyan-600">{data.prognosis.consignmentCount} orders — exhibited</p>
              </div>
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-sky-700">Artworks on Consignment</p>
                <p className="mt-1 text-lg font-bold text-sky-800">{formatCurrency(data.prognosis.artworksAtGalleriesRevenue, 'CHF')}</p>
                <p className="text-[10px] text-sky-600">{data.prognosis.artworksAtGalleriesCount} artworks</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-amber-700">Other Active Orders</p>
                <p className="mt-1 text-lg font-bold text-amber-900">{formatCurrency(data.prognosis.confirmedOrdersRevenue - data.prognosis.preSoldRevenue - data.prognosis.consignmentRevenue, 'CHF')}</p>
                <p className="text-[10px] text-amber-600">{data.prognosis.confirmedOrdersCount - data.prognosis.preSoldCount - data.prognosis.consignmentCount} in production</p>
              </div>
              <div className="rounded-lg border border-primary-100 bg-primary-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-primary-500">Available Artwork Revenue</p>
                <p className="mt-1 text-lg font-bold text-primary-900">{formatCurrency(data.prognosis.potentialRevenue, 'CHF')}</p>
                <p className="text-[10px] text-primary-400">{data.prognosis.potentialCount} available artworks</p>
              </div>
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-center col-span-2 sm:col-span-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-accent">Total Pipeline</p>
                <p className="mt-1 text-lg font-bold text-accent">{formatCurrency(data.prognosis.totalPipeline, 'CHF')}</p>
                <p className="text-[10px] text-primary-400">all sources combined</p>
              </div>
            </div>
          </div>

          {/* Consignment sell-through per gallery (orders + artworks at gallery) */}
          {data.prognosis.consignmentGalleryDetails.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-primary-700 mb-3">
                Consignment Sell-Through by Gallery
                <span className="ml-2 text-xs font-normal text-primary-400">
                  orders + artworks at gallery × sell-through rate
                </span>
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
                    {data.prognosis.consignmentGalleryDetails.map((g) => (
                      <tr key={g.galleryId} className="border-b border-primary-100">
                        <td className="py-2 pr-4 font-medium text-primary-900">{g.galleryName}</td>
                        <td className="py-2 pr-4 text-right text-primary-600">
                          {g.consignmentOrderCount > 0 ? `${formatCurrency(g.consignmentOrderValue, 'CHF')} (${g.consignmentOrderCount})` : '—'}
                        </td>
                        <td className="py-2 pr-4 text-right text-primary-600">
                          {g.artworksAtGalleryCount > 0 ? `${formatCurrency(g.artworksAtGalleryValue, 'CHF')} (${g.artworksAtGalleryCount})` : '—'}
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
                                    if (!isNaN(val) && val >= 0 && val <= 100) {
                                      saveSellThroughOverride(g.galleryId, val / 100);
                                    }
                                  } else if (e.key === 'Escape') {
                                    setEditingSellThrough(null);
                                  }
                                }}
                                onBlur={() => {
                                  const val = parseFloat(sellThroughInput);
                                  if (!isNaN(val) && val >= 0 && val <= 100) {
                                    saveSellThroughOverride(g.galleryId, val / 100);
                                  } else {
                                    setEditingSellThrough(null);
                                  }
                                }}
                                className="w-14 rounded border border-primary-300 px-1.5 py-0.5 text-right text-sm focus:border-accent focus:outline-none"
                              />
                              <span className="text-xs text-primary-400">%</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingSellThrough(g.galleryId);
                                setSellThroughInput((g.sellThroughRate * 100).toFixed(0));
                              }}
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
                      <td className="pt-2 pr-4 text-right text-primary-600">{formatCurrency(data.prognosis.consignmentRevenue, 'CHF')}</td>
                      <td className="pt-2 pr-4 text-right text-primary-600">{formatCurrency(data.prognosis.artworksAtGalleriesRevenue, 'CHF')}</td>
                      <td className="pt-2 pr-4 text-right text-primary-700">{formatCurrency(data.prognosis.consignmentRevenue + data.prognosis.artworksAtGalleriesRevenue, 'CHF')}</td>
                      <td className="pt-2 pr-4" />
                      <td className="pt-2 pr-4 text-right text-cyan-700">{formatCurrency(data.prognosis.weightedConsignmentRevenue, 'CHF')}</td>
                      <td className="pt-2" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Price increase scenario (+15%) */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-primary-700 mb-3">
              Scenario: +{data.prognosis.priceScenario.priceIncreasePct}% Price Increase
              <span className="ml-2 text-xs font-normal text-primary-400">
                elasticity {data.prognosis.priceScenario.elasticity} — art market estimate
              </span>
            </h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-violet-700">Price Change</p>
                <p className="mt-1 text-lg font-bold text-violet-800">+{data.prognosis.priceScenario.priceIncreasePct}%</p>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-violet-700">Volume Impact</p>
                <p className="mt-1 text-lg font-bold text-red-600">{data.prognosis.priceScenario.volumeChangePct.toFixed(1)}%</p>
                <p className="text-[10px] text-violet-500">~{data.prognosis.priceScenario.projectedSalesCount} sales</p>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-violet-700">Net Revenue Effect</p>
                <p className={`mt-1 text-lg font-bold ${data.prognosis.priceScenario.netRevenueChangePct >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {data.prognosis.priceScenario.netRevenueChangePct >= 0 ? '+' : ''}{data.prognosis.priceScenario.netRevenueChangePct.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg border border-violet-300 bg-violet-100 p-3 text-center">
                <p className="text-[10px] font-medium uppercase tracking-wider text-violet-800">Projected Revenue</p>
                <p className="mt-1 text-lg font-bold text-violet-900">{formatCurrency(data.prognosis.priceScenario.projectedRevenue, 'CHF')}</p>
                <p className="text-[10px] text-violet-600">vs {formatCurrency(data.prognosis.projectedRevenue, 'CHF')} current</p>
              </div>
            </div>
          </div>

          {/* Monthly breakdown bar chart */}
          <h4 className="text-sm font-semibold text-primary-700 mb-2">Monthly Breakdown — {data.prognosis.currentYear}</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.prognosis.monthlyBreakdown.map((m) => ({
              ...m,
              name: MONTH_NAMES[m.month],
              isFuture: m.month > new Date().getMonth(),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')} />
              <Tooltip formatter={(value: number) => [formatCurrency(value, 'CHF'), 'Revenue']} />
              <Bar dataKey="revenue" name="Revenue" radius={[3, 3, 0, 0]}>
                {data.prognosis.monthlyBreakdown.map((m, i) => (
                  <Cell
                    key={i}
                    fill={m.month > new Date().getMonth() ? '#e2e8f0' : BAR_COLOR}
                    opacity={m.month > new Date().getMonth() ? 0.4 : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="space-y-6">
        {/* ---- Section A: Annual Revenue Chart ---- */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
            Annual Revenue
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data.yearSummaries.map((ys) => ({
              ...ys,
              projected: data.prognosis && ys.year === data.prognosis.currentYear
                ? data.prognosis.projectedRevenue - ys.revenue
                : 0,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis
                yAxisId="revenue"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                tick={{ fontSize: 12 }}
                label={{ value: 'Sales', angle: 90, position: 'insideRight', fontSize: 11 }}
              />
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

        {/* Annual Summary Table */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
            Year-by-Year Summary
          </h3>
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
                        <span className="text-primary-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ---- Section B: Gallery Revenue Evolution ---- */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
            Gallery Revenue Evolution
          </h3>
          <p className="text-xs text-primary-500 mb-3">
            Click galleries below to toggle them on/off. Showing top 5 by default.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {sortedGalleries.map(([gid, val], i) => (
              <button
                key={gid}
                onClick={() => toggleGallery(gid)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeGalleryIds.has(gid)
                    ? 'text-white'
                    : 'bg-primary-100 text-primary-500 hover:bg-primary-200'
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
              <Tooltip
                formatter={(value: number, name: string) => [formatCurrency(value, 'CHF'), name]}
                labelFormatter={(label) => `Year ${label}`}
              />
              <Legend />
              {activeGalleryNames.map((name, i) => {
                const gIdx = sortedGalleries.findIndex(([, val]) => val.name === name);
                return (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={GALLERY_COLORS[gIdx % GALLERY_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* ---- Section C: Gallery Ranking by Year ---- */}
        <div className="flex items-center gap-3 mt-2">
          <h2 className="font-display text-xl font-bold text-primary-900">
            Gallery Ranking
          </h2>
          <div className="flex flex-wrap gap-1">
            {data.years.map((y) => (
              <button
                key={y}
                onClick={() => { setSelectedYear(y); setExpandedGalleryId(null); }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  y === activeYear
                    ? 'bg-primary-900 text-white'
                    : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Top 10 Gallery Bar Chart */}
        {top10.length > 0 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              Top 10 Galleries — {activeYear}
            </h3>
            <p className="text-xs text-primary-500 mb-3">
              Click a bar to see the revenue breakdown for that gallery.
            </p>
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
                  case 'sale': return <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">Sale</span>;
                  case 'pre_sold': return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Pre-sold</span>;
                  case 'consignment_order': return <span className="inline-flex items-center rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700">Consignment</span>;
                  case 'consignment_artwork': return <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">Artwork@Gallery</span>;
                  default: return null;
                }
              };

              return (
                <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50/50 p-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-display text-base font-semibold text-primary-900">
                      {gallery.galleryName} — Revenue Breakdown ({activeYear})
                    </h4>
                    <button
                      onClick={() => setExpandedGalleryId(null)}
                      className="rounded-md p-1 text-primary-400 hover:bg-primary-200 hover:text-primary-700 transition-colors"
                    >
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
                                {d.date ? new Date(d.date).toLocaleDateString('de-CH') : (d.label ?? '—')}
                              </td>
                              <td className="py-2 pr-4 text-right text-primary-700">
                                {isConsignment
                                  ? formatCurrency(d.grossCHF ?? d.amount, 'CHF')
                                  : formatCurrency(d.amount, d.currency)}
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

        {/* Gallery Ranking Table */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
            Full Gallery Ranking — {activeYear}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  <th className="pb-3 pr-4">Rank</th>
                  <th className="pb-3 pr-4">Gallery</th>
                  <th className="pb-3 pr-4 text-right">Revenue</th>
                  <th className="pb-3 pr-4 text-right"># Sales</th>
                  <th className="pb-3 pr-4 text-right">Avg Price</th>
                  <th className="pb-3 text-center">vs Prior Year</th>
                </tr>
              </thead>
              <tbody>
                {galleryRanking.map((g) => (
                  <tr key={g.galleryId} className="border-b border-primary-100 hover:bg-primary-50">
                    <td className="py-3 pr-4 font-medium text-primary-500">{g.rank}</td>
                    <td className="py-3 pr-4 font-medium text-primary-900">{g.galleryName}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{formatCurrency(g.revenue, 'CHF')}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{g.count}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{formatCurrency(g.avgPrice, 'CHF')}</td>
                    <td className="py-3 text-center">
                      <RankBadge change={g.rankChange} />
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
