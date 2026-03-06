// ---------------------------------------------------------------------------
// NOA Inventory -- Analytics Dashboard Page
// Revenue analysis and business insights with date-range filtering.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

// Chart & table components
import { DashboardSummaryCards } from '../components/analytics/DashboardSummaryCards';
import { SalesOverTimeChart } from '../components/analytics/SalesOverTimeChart';
import { GalleryPerformanceChart } from '../components/analytics/GalleryPerformanceChart';
import { CategoryBreakdownChart } from '../components/analytics/CategoryBreakdownChart';
import { StatusOverviewChart } from '../components/analytics/StatusOverviewChart';
import { RevenueByCountryChart } from '../components/analytics/RevenueByCountryChart';
import { RecentSalesTable } from '../components/analytics/RecentSalesTable';
import { OpenInvoicesTable } from '../components/analytics/OpenInvoicesTable';

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
            <div className="lg:col-span-2">
              <SalesOverTimeChart data={data.salesByMonth} />
            </div>
            <div>
              <CategoryBreakdownChart data={data.categoryBreakdown} />
            </div>
          </div>

          {/* Charts Row 2 -- Gallery performance + Status overview */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <GalleryPerformanceChart data={data.revenueByGallery} />
            <StatusOverviewChart data={data.statusOverview} />
          </div>

          {/* Charts Row 3 -- Revenue by country */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RevenueByCountryChart data={data.revenueByCountry} />
            <div>{/* Spacer */}</div>
          </div>

          {/* Tables Row -- Recent sales + Open invoices */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <RecentSalesTable data={data.recentSales} />
            <OpenInvoicesTable data={data.openInvoices} />
          </div>
        </div>
      )}
    </div>
  );
}
