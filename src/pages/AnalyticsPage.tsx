// ---------------------------------------------------------------------------
// NOA Inventory -- Analytics Dashboard Page
// Revenue analysis and business insights with date-range filtering.
// Tabs: Overview | Commissions | Viewing Rooms
// ---------------------------------------------------------------------------

import { useState, useMemo } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { useCommissionTransparency } from '../hooks/useCommissionTransparency';
import type { GalleryCommissionSummary } from '../hooks/useCommissionTransparency';
import { useViewingRoomAnalytics } from '../hooks/useViewingRoomAnalytics';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { formatCurrency } from '../lib/utils';

// Chart & table components
import { DashboardSummaryCards } from '../components/analytics/DashboardSummaryCards';
import { SalesOverTimeChart } from '../components/analytics/SalesOverTimeChart';
import { GalleryPerformanceChart } from '../components/analytics/GalleryPerformanceChart';
import { CategoryBreakdownChart } from '../components/analytics/CategoryBreakdownChart';
import { StatusOverviewChart } from '../components/analytics/StatusOverviewChart';
import { RevenueByCountryChart } from '../components/analytics/RevenueByCountryChart';
import { RecentSalesTable } from '../components/analytics/RecentSalesTable';
import { OpenInvoicesTable } from '../components/analytics/OpenInvoicesTable';

// Colors for charts
const SERIES_COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#f5a623', '#7c3aed', '#059669'];
const REPORTING_COLORS: Record<string, string> = {
  draft: '#94a3b8', reserved: '#f59e0b', sold_pending_details: '#f97316',
  sold_reported: '#3b82f6', verified: '#10b981',
};
const PAYMENT_COLORS: Record<string, string> = {
  pending: '#94a3b8', partial: '#f59e0b', paid: '#10b981', overdue: '#ef4444',
};

// Tab type
type AnalyticsTab = 'overview' | 'commissions' | 'viewing_rooms';

const TABS: { key: AnalyticsTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'commissions', label: 'Commissions' },
  { key: 'viewing_rooms', label: 'Viewing Rooms' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AnalyticsPage() {
  // ---- State ----------------------------------------------------------------

  const { data, loading, setDateRange } = useAnalytics();

  const [tab, setTab] = useState<AnalyticsTab>('overview');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFrom, setAppliedFrom] = useState<string | null>(null);
  const [appliedTo, setAppliedTo] = useState<string | null>(null);

  // ---- Handlers -------------------------------------------------------------

  function handleApply() {
    const from = fromDate || null;
    const to = toDate || null;
    setDateRange(from, to);
    setAppliedFrom(from);
    setAppliedTo(to);
  }

  function handleReset() {
    setFromDate('');
    setToDate('');
    setDateRange(null, null);
    setAppliedFrom(null);
    setAppliedTo(null);
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Revenue analysis and business insights.
          </p>
        </div>

        {/* Date range filter -- only for Overview tab */}
        {tab === 'overview' && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-sm text-primary-700">
              From
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-md border border-primary-300 px-2 py-1.5 text-sm text-primary-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>

            <label className="flex items-center gap-1 text-sm text-primary-700">
              To
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-md border border-primary-300 px-2 py-1.5 text-sm text-primary-900 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>

            <Button size="sm" onClick={handleApply}>
              Apply
            </Button>
            <Button size="sm" variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* Active date range indicator */}
      {tab === 'overview' && (appliedFrom || appliedTo) && (
        <div className="mb-6 rounded-md bg-primary-50 px-4 py-2 text-sm text-primary-700">
          Showing data
          {appliedFrom ? ` from ${appliedFrom}` : ''}
          {appliedTo ? ` to ${appliedTo}` : ''}
        </div>
      )}

      {/* Tab Bar */}
      <div className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-primary-900 text-white'
                : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ====== Overview Tab ====== */}
      {tab === 'overview' && loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {tab === 'overview' && !loading && data && (
        <div className="space-y-6">
          {/* Summary Cards Row */}
          <DashboardSummaryCards
            totalArtworks={data.totalArtworks}
            totalSold={data.totalSold}
            totalRevenue={data.totalRevenue}
            totalExpenses={data.totalExpenses}
            openInvoicesCount={data.openInvoicesCount}
            openInvoicesTotal={data.openInvoicesTotal}
            avgTimeToSell={data.avgTimeToSell}
          />

          {/* Charts Row 1 -- Sales over time + Category breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <SalesOverTimeChart data={data.salesByMonth} />
            </div>
            <div className="min-w-0">
              <CategoryBreakdownChart data={data.categoryBreakdown} />
            </div>
          </div>

          {/* Charts Row 2 -- Gallery performance + Status overview */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="min-w-0">
              <GalleryPerformanceChart data={data.revenueByGallery} />
            </div>
            <div className="min-w-0">
              <StatusOverviewChart data={data.statusOverview} />
            </div>
          </div>

          {/* Charts Row 3 -- Revenue by country + Sell-through rate */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="min-w-0">
              <RevenueByCountryChart data={data.revenueByCountry} />
            </div>
            <Card className="min-w-0 p-4 sm:p-6">
              <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
                Sell-Through Rate
              </h3>
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <p className="text-5xl font-bold text-accent">
                    {data.sellThroughRate.toFixed(1)}%
                  </p>
                  <p className="mt-2 text-sm text-primary-500">
                    {data.totalSold} of {data.totalArtworks} artworks sold
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Row 4 -- Revenue by series */}
          {data.revenueBySeries.length > 0 && (
            <Card className="overflow-hidden p-4 sm:p-6">
              <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
                Revenue by Series
              </h3>
              <div className="min-h-[300px] overflow-x-auto">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.revenueBySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="series" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')} />
                  <Tooltip formatter={(value: number) => formatCurrency(value, 'CHF')} />
                  <Bar dataKey="revenue" fill="#1a1a2e" radius={[4, 4, 0, 0]}>
                    {data.revenueBySeries.map((_, i) => (
                      <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Charts Row 5 -- Reporting & Payment status breakdown */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {data.reportingBreakdown.length > 0 && (
              <Card className="min-w-0 overflow-hidden p-4 sm:p-6">
                <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
                  Reporting Status
                </h3>
                <div className="min-h-[250px]">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.reportingBreakdown}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ label, count }) => `${label}: ${count}`}
                    >
                      {data.reportingBreakdown.map((entry) => (
                        <Cell key={entry.status} fill={REPORTING_COLORS[entry.status] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                </div>
              </Card>
            )}
            {data.paymentBreakdown.length > 0 && (
              <Card className="min-w-0 overflow-hidden p-4 sm:p-6">
                <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
                  Payment Status
                </h3>
                <div className="min-h-[250px]">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.paymentBreakdown}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ label, count }) => `${label}: ${count}`}
                    >
                      {data.paymentBreakdown.map((entry) => (
                        <Cell key={entry.status} fill={PAYMENT_COLORS[entry.status] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>

          {/* Tables Row -- Recent sales + Open invoices */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="min-w-0">
              <RecentSalesTable sales={data.recentSales} />
            </div>
            <div className="min-w-0">
              <OpenInvoicesTable invoices={data.openInvoices} />
            </div>
          </div>
        </div>
      )}

      {/* ====== Commissions Tab ====== */}
      {tab === 'commissions' && <CommissionsSection />}

      {/* ====== Viewing Rooms Tab ====== */}
      {tab === 'viewing_rooms' && <ViewingRoomsSection />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Commission Helpers
// ---------------------------------------------------------------------------

function paymentStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'paid':
      return <Badge variant="success">Paid</Badge>;
    case 'overdue':
      return <Badge variant="danger">Overdue</Badge>;
    case 'pending':
    default:
      return <Badge variant="warning">Pending</Badge>;
  }
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function commissionRateLabel(gallery: GalleryCommissionSummary): string {
  if (gallery.commissionGallery != null && gallery.commissionNoa != null && gallery.commissionArtist != null) {
    return `${gallery.commissionGallery}/${gallery.commissionNoa}/${gallery.commissionArtist}`;
  }
  if (gallery.defaultCommissionRate != null) {
    return `${gallery.defaultCommissionRate}%`;
  }
  return '50/25/25 (default)';
}

// ---------------------------------------------------------------------------
// Commissions Section
// ---------------------------------------------------------------------------

function CommissionsSection() {
  const { data, loading } = useCommissionTransparency();
  const [expandedGallery, setExpandedGallery] = useState<string | null>(null);
  const [galleryFilter, setGalleryFilter] = useState('');

  const filteredGalleries = useMemo(() => {
    if (!data) return [];
    if (!galleryFilter) return data.galleries;
    const q = galleryFilter.toLowerCase();
    return data.galleries.filter(
      (g) => g.galleryName.toLowerCase().includes(q) || (g.country ?? '').toLowerCase().includes(q),
    );
  }, [data, galleryFilter]);

  const toggleGallery = (galleryId: string) => {
    setExpandedGallery((prev) => (prev === galleryId ? null : galleryId));
  };

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
        No commission data available.
      </div>
    );
  }

  return (
    <div>
      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <KpiBox label="Total Revenue" value={formatCurrency(data.totalRevenue, 'CHF')} />
        <KpiBox label="Gallery Commissions" value={formatCurrency(data.totalGalleryCommissions, 'CHF')} color="text-blue-600" />
        <KpiBox label="NOA Revenue" value={formatCurrency(data.totalNoaRevenue, 'CHF')} color="text-emerald-600" />
        <KpiBox label="Artist Revenue" value={formatCurrency(data.totalArtistRevenue, 'CHF')} color="text-violet-600" />
        <KpiBox label="Outstanding" value={formatCurrency(data.totalOutstanding, 'CHF')} color="text-amber-600" />
      </div>

      {/* Gallery Filter */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Filter by gallery name or country..."
          value={galleryFilter}
          onChange={(e) => setGalleryFilter(e.target.value)}
          className="w-full max-w-md rounded-lg border border-primary-200 px-4 py-2 text-sm text-primary-900 placeholder-primary-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
      </div>

      {/* Per-Gallery Expandable Sections */}
      <div className="space-y-4">
        {filteredGalleries.map((gallery) => {
          const isExpanded = expandedGallery === gallery.galleryId;
          const outstandingPct = gallery.totalRevenue > 0
            ? (gallery.outstandingAmount / gallery.totalRevenue) * 100
            : 0;

          return (
            <Card key={gallery.galleryId} className="overflow-hidden">
              {/* Gallery Header (clickable) */}
              <button
                onClick={() => toggleGallery(gallery.galleryId)}
                className="w-full px-6 py-4 text-left hover:bg-primary-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg
                      className={`h-4 w-4 text-primary-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <div>
                      <span className="font-display text-lg font-semibold text-primary-900">
                        {gallery.galleryName}
                      </span>
                      {gallery.country && (
                        <span className="ml-2 text-sm text-primary-500">{gallery.country}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <span className="text-xs uppercase tracking-wider text-primary-500">Commission Rate</span>
                      <p className="font-medium text-primary-900">{commissionRateLabel(gallery)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs uppercase tracking-wider text-primary-500">Revenue</span>
                      <p className="font-medium text-primary-900">{formatCurrency(gallery.totalRevenue, 'CHF')}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs uppercase tracking-wider text-primary-500">Sales</span>
                      <p className="font-medium text-primary-900">{gallery.totalSales}</p>
                    </div>
                    {gallery.outstandingAmount > 0 && (
                      <Badge variant="warning">{formatCurrency(gallery.outstandingAmount, 'CHF')} outstanding</Badge>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-primary-100 px-6 py-4">
                  {/* Commission Summary */}
                  <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
                    <div className="rounded-lg bg-primary-50 p-3 text-center">
                      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Total Revenue</p>
                      <p className="mt-1 text-lg font-bold text-primary-900">{formatCurrency(gallery.totalRevenue, 'CHF')}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3 text-center">
                      <p className="text-xs font-medium uppercase tracking-wider text-blue-600">Gallery Commission</p>
                      <p className="mt-1 text-lg font-bold text-blue-700">{formatCurrency(gallery.totalGalleryCommission, 'CHF')}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-3 text-center">
                      <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">NOA Share</p>
                      <p className="mt-1 text-lg font-bold text-emerald-700">{formatCurrency(gallery.totalNoaCommission, 'CHF')}</p>
                    </div>
                    <div className="rounded-lg bg-violet-50 p-3 text-center">
                      <p className="text-xs font-medium uppercase tracking-wider text-violet-600">Artist Share</p>
                      <p className="mt-1 text-lg font-bold text-violet-700">{formatCurrency(gallery.totalArtistCommission, 'CHF')}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-3 text-center">
                      <p className="text-xs font-medium uppercase tracking-wider text-amber-600">Outstanding</p>
                      <p className="mt-1 text-lg font-bold text-amber-700">{formatCurrency(gallery.outstandingAmount, 'CHF')}</p>
                      {outstandingPct > 0 && (
                        <p className="text-xs text-amber-500">{formatPercent(outstandingPct)} of revenue</p>
                      )}
                    </div>
                  </div>

                  {/* Paid vs Outstanding Bar */}
                  {gallery.totalRevenue > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-primary-500 mb-1">
                        <span>Paid: {formatCurrency(gallery.paidAmount, 'CHF')}</span>
                        <span>Outstanding: {formatCurrency(gallery.outstandingAmount, 'CHF')}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-primary-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${(gallery.paidAmount / gallery.totalRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Sale Detail Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                          <th className="pb-3 pr-4">Date</th>
                          <th className="pb-3 pr-4">Artwork</th>
                          <th className="pb-3 pr-4 text-right">Sale Price</th>
                          <th className="pb-3 pr-4 text-right">Gallery %</th>
                          <th className="pb-3 pr-4 text-right">Gallery Share</th>
                          <th className="pb-3 pr-4 text-right">NOA Share</th>
                          <th className="pb-3 pr-4 text-right">Artist Share</th>
                          <th className="pb-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gallery.sales.map((sale) => (
                          <tr key={sale.saleId} className="border-b border-primary-100 hover:bg-primary-50">
                            <td className="py-3 pr-4 text-primary-600 whitespace-nowrap">
                              {formatDate(sale.saleDate)}
                            </td>
                            <td className="py-3 pr-4 font-medium text-primary-900 max-w-[200px] truncate">
                              {sale.artworkTitle}
                            </td>
                            <td className="py-3 pr-4 text-right text-primary-700 whitespace-nowrap">
                              {formatCurrency(sale.salePrice, 'CHF')}
                            </td>
                            <td className="py-3 pr-4 text-right text-primary-700">
                              {formatPercent(sale.commissionPercent)}
                            </td>
                            <td className="py-3 pr-4 text-right text-blue-700 whitespace-nowrap">
                              {formatCurrency(sale.galleryShare, 'CHF')}
                            </td>
                            <td className="py-3 pr-4 text-right text-emerald-700 whitespace-nowrap">
                              {formatCurrency(sale.noaShare, 'CHF')}
                            </td>
                            <td className="py-3 pr-4 text-right text-violet-700 whitespace-nowrap">
                              {formatCurrency(sale.artistShare, 'CHF')}
                            </td>
                            <td className="py-3 text-right">
                              {paymentStatusBadge(sale.paymentStatus)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Viewing Rooms Section
// ---------------------------------------------------------------------------

function ViewingRoomsSection() {
  const { data, loading } = useViewingRoomAnalytics();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data || data.totalRooms === 0) {
    return (
      <div className="py-20 text-center text-primary-500">
        No viewing room data available.
      </div>
    );
  }

  // Last 30 days of the trend for the bar chart
  const last30 = data.viewsTrend.slice(-30);
  const maxViews = Math.max(...last30.map((d) => d.views), 1);

  return (
    <div>
      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Total Views" value={data.totalViews} />
        <KpiBox label="Published Rooms" value={data.publishedRooms} />
        <KpiBox label="Avg Views / Room" value={data.avgViewsPerRoom} />
        <KpiBox
          label="Overall Conversion"
          value={`${data.overallConversionRate}%`}
          color={data.overallConversionRate >= 5 ? 'text-emerald-500' : data.overallConversionRate > 0 ? 'text-amber-500' : 'text-primary-400'}
        />
      </div>

      <div className="space-y-6">
        {/* Views Trend (last 30 days) */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Views Trend (Last 30 Days)</h3>
          <div className="flex items-end gap-[2px]" style={{ height: 160 }}>
            {last30.map((d) => {
              const pct = maxViews > 0 ? (d.views / maxViews) * 100 : 0;
              return (
                <div
                  key={d.date}
                  className="group relative flex-1"
                  style={{ height: '100%' }}
                >
                  <div
                    className="absolute bottom-0 w-full rounded-t bg-primary-800 transition-colors group-hover:bg-primary-600"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                  {/* Tooltip on hover */}
                  <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded bg-primary-900 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                    {d.date.slice(5)}: {d.views}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-primary-400">
            <span>{last30[0]?.date.slice(5)}</span>
            <span>{last30[last30.length - 1]?.date.slice(5)}</span>
          </div>
        </Card>

        {/* Rooms Performance Table */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Rooms Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  <th className="pb-3 pr-4">Title</th>
                  <th className="pb-3 pr-4 text-right">Views</th>
                  <th className="pb-3 pr-4 text-right">Views/Day</th>
                  <th className="pb-3 pr-4 text-right">Artworks</th>
                  <th className="pb-3 pr-4 text-right">Enquiries Linked</th>
                  <th className="pb-3 pr-4 text-right">Sales Linked</th>
                  <th className="pb-3 text-right">Conversion Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.rooms.map((room) => (
                  <tr key={room.roomId} className="border-b border-primary-100 hover:bg-primary-50">
                    <td className="py-3 pr-4 font-medium text-primary-900">
                      <div className="flex items-center gap-2">
                        {room.roomTitle}
                        {room.published && (
                          <span className="inline-block rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                            Published
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right text-primary-700">{room.totalViews}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{room.viewsPerDay}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{room.artworkCount}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{room.convertedToEnquiry}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{room.convertedToSale}</td>
                    <td
                      className="py-3 text-right font-medium"
                      style={{
                        color: room.conversionRate >= 5
                          ? '#10b981'
                          : room.conversionRate > 0
                            ? '#f59e0b'
                            : '#94a3b8',
                      }}
                    >
                      {room.conversionRate}%
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
// Shared KPI Box helper
// ---------------------------------------------------------------------------

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color || 'text-primary-900'}`}>{value}</p>
    </Card>
  );
}
