// ---------------------------------------------------------------------------
// NOA Inventory -- Analytics Dashboard Page
// Revenue analysis and business insights with date-range filtering.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
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

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AnalyticsPage() {
  // ---- State ----------------------------------------------------------------

  const { data, loading, setDateRange } = useAnalytics();

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

        {/* Date range filter */}
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
      </div>

      {/* Active date range indicator */}
      {(appliedFrom || appliedTo) && (
        <div className="mb-6 rounded-md bg-primary-50 px-4 py-2 text-sm text-primary-700">
          Showing data
          {appliedFrom ? ` from ${appliedFrom}` : ''}
          {appliedTo ? ` to ${appliedTo}` : ''}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Dashboard content */}
      {!loading && data && (
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
    </div>
  );
}
