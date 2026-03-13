// ---------------------------------------------------------------------------
// NOA Inventory -- Gallery Performance Dashboard (Dashboard 7)
// Sell-through, velocity, revenue, reporting completeness, partner ranking
// ---------------------------------------------------------------------------

import { useState, useMemo } from 'react';
import { useGalleryPerformanceAnalytics } from '../../hooks/useGalleryPerformanceAnalytics';
import type { GalleryPerformanceRow } from '../../hooks/useGalleryPerformanceAnalytics';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { GALLERY_TYPES } from '../../lib/constants';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_ALL = '__all__';

const categoryTabs = [
  { value: CATEGORY_ALL, label: 'All Categories' },
  ...GALLERY_TYPES.map((gt) => ({ value: gt.value, label: gt.label })),
];

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function completenessColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-600';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function categoryLabel(type: string | null): string {
  if (!type) return 'Uncategorized';
  const found = GALLERY_TYPES.find((gt) => gt.value === type);
  return found ? found.label : type;
}

interface CategorySummary {
  category: string;
  label: string;
  count: number;
  avgSellThrough: number;
  avgPartnerScore: number;
  totalRevenue: number;
}

function computeCategorySummaries(galleries: GalleryPerformanceRow[]): CategorySummary[] {
  const map = new Map<string, GalleryPerformanceRow[]>();
  for (const g of galleries) {
    const key = g.type || '__uncategorized__';
    const arr = map.get(key) ?? [];
    arr.push(g);
    map.set(key, arr);
  }

  const summaries: CategorySummary[] = [];
  for (const [key, rows] of map.entries()) {
    const avgST = rows.reduce((s, r) => s + r.sellThrough, 0) / rows.length;
    const avgPS = rows.reduce((s, r) => s + r.partnerScore, 0) / rows.length;
    const totalRev = rows.reduce((s, r) => s + r.totalRevenue, 0);
    summaries.push({
      category: key,
      label: key === '__uncategorized__' ? 'Uncategorized' : categoryLabel(key),
      count: rows.length,
      avgSellThrough: Math.round(avgST * 10) / 10,
      avgPartnerScore: Math.round(avgPS),
      totalRevenue: totalRev,
    });
  }

  summaries.sort((a, b) => b.avgSellThrough - a.avgSellThrough);
  return summaries;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleryPerformancePage() {
  const { data, loading } = useGalleryPerformanceAnalytics();
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ALL);

  const filteredGalleries = useMemo(() => {
    if (!data) return [];
    if (activeCategory === CATEGORY_ALL) return data.galleries;
    return data.galleries.filter((g) => g.type === activeCategory);
  }, [data, activeCategory]);

  const categorySummaries = useMemo(() => {
    if (!data) return [];
    return computeCategorySummaries(data.galleries);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data || data.galleries.length === 0) {
    return (
      <div className="py-20 text-center text-primary-500">
        No gallery performance data available.
      </div>
    );
  }

  // Chart data: top 10 by revenue (from filtered set)
  const revenueChart = [...filteredGalleries]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  // Chart data: sell-through comparison (from filtered set)
  const sellThroughChart = [...filteredGalleries]
    .filter((g) => g.totalAllocated > 0)
    .sort((a, b) => b.sellThrough - a.sellThrough)
    .slice(0, 10);

  // Filtered KPI values
  const filteredAvgST = filteredGalleries.length > 0
    ? Math.round(filteredGalleries.reduce((s, r) => s + r.sellThrough, 0) / filteredGalleries.length * 10) / 10
    : 0;
  const filteredAvgPS = filteredGalleries.length > 0
    ? Math.round(filteredGalleries.reduce((s, r) => s + r.partnerScore, 0) / filteredGalleries.length)
    : 0;
  const filteredTopPerformer = filteredGalleries.length > 0
    ? [...filteredGalleries].sort((a, b) => b.partnerScore - a.partnerScore)[0]?.name ?? '—'
    : '—';

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">
          Gallery Performance
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Partner ranking, sell-through rates, and reporting compliance.
        </p>
      </div>

      {/* Category Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {categoryTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveCategory(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === tab.value
                ? 'bg-primary-900 text-white'
                : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
            }`}
          >
            {tab.label}
            {tab.value !== CATEGORY_ALL && (
              <span className="ml-1.5 text-xs opacity-70">
                ({data.galleries.filter((g) => g.type === tab.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Galleries" value={filteredGalleries.length} />
        <KpiBox label="Avg Sell-Through" value={`${filteredAvgST}%`} color="text-accent" />
        <KpiBox label="Avg Partner Score" value={filteredAvgPS} />
        <KpiBox label="Top Performer" value={filteredTopPerformer} />
      </div>

      {/* Category Summary (only when viewing all) */}
      {activeCategory === CATEGORY_ALL && categorySummaries.length > 0 && (
        <Card className="mb-6 p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
            Sell-Through by Category
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4 text-right">Galleries</th>
                  <th className="pb-3 pr-4 text-right">Avg Sell-Through</th>
                  <th className="pb-3 pr-4 text-right">Avg Partner Score</th>
                  <th className="pb-3 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {categorySummaries.map((cs) => (
                  <tr key={cs.category} className="border-b border-primary-100 hover:bg-primary-50">
                    <td className="py-3 pr-4 font-medium text-primary-900">{cs.label}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{cs.count}</td>
                    <td className="py-3 pr-4 text-right font-medium" style={{ color: scoreColor(cs.avgSellThrough) }}>
                      {cs.avgSellThrough.toFixed(1)}%
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                        style={{ backgroundColor: scoreColor(cs.avgPartnerScore) }}
                      >
                        {cs.avgPartnerScore}
                      </span>
                    </td>
                    <td className="py-3 text-right text-primary-700">
                      {formatCurrency(cs.totalRevenue, 'CHF')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="space-y-6">
        {/* Row 1: Revenue + Sell-through charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              Revenue by Gallery
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(value: number) => formatCurrency(value, 'CHF')} />
                <Bar dataKey="totalRevenue" name="Revenue" fill="#1a1a2e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              Sell-Through Rate
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sellThroughChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="sellThrough" name="Sell-Through" radius={[0, 4, 4, 0]}>
                  {sellThroughChart.map((g) => (
                    <Cell key={g.id} fill={scoreColor(g.sellThrough)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Partner Ranking Table */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
            Partner Ranking
            {activeCategory !== CATEGORY_ALL && (
              <span className="ml-2 text-sm font-normal text-primary-500">
                — {categoryTabs.find((t) => t.value === activeCategory)?.label}
              </span>
            )}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  <th className="pb-3 pr-4">Rank</th>
                  <th className="pb-3 pr-4">Gallery</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Country</th>
                  <th className="pb-3 pr-4 text-right">Allocated</th>
                  <th className="pb-3 pr-4 text-right">Sold</th>
                  <th className="pb-3 pr-4 text-right">Sell-Through</th>
                  <th className="pb-3 pr-4 text-right">Revenue</th>
                  <th className="pb-3 pr-4 text-right">Avg Days</th>
                  <th className="pb-3 pr-4 text-right">Reporting</th>
                  <th className="pb-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredGalleries.map((g, i) => (
                  <tr key={g.id} className="border-b border-primary-100 hover:bg-primary-50">
                    <td className="py-3 pr-4 font-medium text-primary-500">{i + 1}</td>
                    <td className="py-3 pr-4 font-medium text-primary-900">{g.name}</td>
                    <td className="py-3 pr-4 text-xs text-primary-500">{categoryLabel(g.type)}</td>
                    <td className="py-3 pr-4 text-primary-600">{g.country || '—'}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{g.totalAllocated}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{g.soldCount}</td>
                    <td className="py-3 pr-4 text-right font-medium" style={{ color: scoreColor(g.sellThrough) }}>
                      {g.sellThrough.toFixed(1)}%
                    </td>
                    <td className="py-3 pr-4 text-right text-primary-700">
                      {formatCurrency(g.totalRevenue, 'CHF')}
                    </td>
                    <td className="py-3 pr-4 text-right text-primary-700">
                      {g.avgDaysToSale != null ? `${g.avgDaysToSale}d` : '—'}
                    </td>
                    <td className={`py-3 pr-4 text-right font-medium ${completenessColor(g.reportingCompleteness)}`}>
                      {g.reportingCompleteness}%
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                        style={{ backgroundColor: scoreColor(g.partnerScore) }}
                      >
                        {g.partnerScore}
                      </span>
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

// ---------------------------------------------------------------------------
// KPI Box helper
// ---------------------------------------------------------------------------

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color || 'text-primary-900'}`}>{value}</p>
    </Card>
  );
}
