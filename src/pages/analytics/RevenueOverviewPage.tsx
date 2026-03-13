// ---------------------------------------------------------------------------
// NOA Inventory -- Revenue Overview Page
// Year-by-year revenue analysis + gallery ranking with YoY evolution
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useRevenueOverview } from '../../hooks/useRevenueOverview';
import type { GalleryYearRow } from '../../hooks/useRevenueOverview';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Cell,
} from 'recharts';

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

  // YoY growth for latest year
  const latestSummary = data.yearSummaries[data.yearSummaries.length - 1];
  const yoyLabel = latestSummary?.yoyChange != null
    ? `${latestSummary.yoyChange > 0 ? '+' : ''}${latestSummary.yoyChange.toFixed(1)}% vs ${latestSummary.year - 1}`
    : '';

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
          label="Latest YoY"
          value={yoyLabel || '—'}
        />
      </div>

      <div className="space-y-6">
        {/* ---- Section A: Annual Revenue Chart ---- */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
            Annual Revenue
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data.yearSummaries}>
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
                  if (name === 'count') return [value, 'Sales'];
                  return [value, name];
                }}
                labelFormatter={(label) => `Year ${label}`}
              />
              <Bar yAxisId="revenue" dataKey="revenue" name="revenue" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
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
                    onClick={() => setSelectedYear(ys.year)}
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

        {/* ---- Section B: Gallery Ranking by Year ---- */}
        <div className="flex items-center gap-3 mt-2">
          <h2 className="font-display text-xl font-bold text-primary-900">
            Gallery Ranking
          </h2>
          <div className="flex flex-wrap gap-1">
            {data.years.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
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
            <ResponsiveContainer width="100%" height={Math.max(300, top10.length * 40)}>
              <BarChart data={top10} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')} />
                <YAxis dataKey="galleryName" type="category" tick={{ fontSize: 11 }} width={160} />
                <Tooltip formatter={(value: number) => formatCurrency(value, 'CHF')} />
                <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                  {top10.map((_, i) => (
                    <Cell key={i} fill={GALLERY_COLORS[i % GALLERY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
