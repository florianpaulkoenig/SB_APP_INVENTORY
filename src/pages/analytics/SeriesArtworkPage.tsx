import { useSearchParams, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { useSeriesPerformance } from '../../hooks/useSeriesPerformance';
import { useViewingRoomAnalytics } from '../../hooks/useViewingRoomAnalytics';
import { usePriceTrajectory } from '../../hooks/usePriceTrajectory';

const TABS = [
  { key: 'performance', label: 'Series Performance' },
  { key: 'viewing-rooms', label: 'Viewing Rooms' },
  { key: 'trajectory', label: 'Price Trajectory' },
] as const;

export function SeriesArtworkPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'performance';

  const series = useSeriesPerformance();
  const viewingRooms = useViewingRoomAnalytics();
  const trajectory = usePriceTrajectory();

  const isLoading = series.loading || viewingRooms.loading || trajectory.loading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-900">Series &amp; Artwork</h1>

      <Tabs
        tabs={[...TABS]}
        activeTab={activeTab}
        onChange={(key) => setSearchParams({ tab: key })}
      />

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!isLoading && activeTab === 'performance' && series.data && (
        <PerformanceTab data={series.data} />
      )}

      {!isLoading && activeTab === 'viewing-rooms' && viewingRooms.data && (
        <ViewingRoomsTab data={viewingRooms.data} />
      )}

      {!isLoading && activeTab === 'trajectory' && trajectory.data && (
        <TrajectoryTab data={trajectory.data} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Performance Tab                                                           */
/* -------------------------------------------------------------------------- */

import type { SeriesPerformanceData } from '../../hooks/useSeriesPerformance';

function PerformanceTab({ data }: { data: SeriesPerformanceData }) {
  const avgSellThrough = data.series.length > 0
    ? Math.round(data.series.reduce((s, r) => s + r.sellThrough, 0) / data.series.length * 10) / 10
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Series" value={data.totalSeries} />
        <KpiCard label="Avg Sell-Through" value={`${avgSellThrough}%`} />
        <KpiCard label="Top Series" value={data.highestRevenue || '-'} />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Performance by Series</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Series</th>
                <th className="px-4 py-2 text-right">Revenue</th>
                <th className="px-4 py-2 text-right">Sold</th>
                <th className="px-4 py-2 text-right">Sell-Through</th>
                <th className="px-4 py-2 text-right">Avg Price</th>
                <th className="px-4 py-2 text-right">Velocity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.series.map((s) => (
                <tr key={s.series} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">{s.series}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(s.totalRevenue, 'CHF')}</td>
                  <td className="px-4 py-2 text-right">{s.totalSold}</td>
                  <td className="px-4 py-2 text-right">
                    <Badge variant={s.sellThrough >= 50 ? 'success' : s.sellThrough >= 25 ? 'warning' : 'default'}>
                      {s.sellThrough}%
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right">{formatCurrency(s.avgPrice, 'CHF')}</td>
                  <td className="px-4 py-2 text-right">{s.avgDaysToSale != null ? `${s.avgDaysToSale}d` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Viewing Rooms Tab                                                         */
/* -------------------------------------------------------------------------- */

import type { ViewingRoomAnalyticsData } from '../../hooks/useViewingRoomAnalytics';

function ViewingRoomsTab({ data }: { data: ViewingRoomAnalyticsData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Views" value={data.totalViews} />
        <KpiCard label="Published Rooms" value={data.publishedRooms} />
        <KpiCard label="Conversion Rate" value={`${data.overallConversionRate}%`} />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Viewing Rooms</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Room</th>
                <th className="px-4 py-2 text-right">Views</th>
                <th className="px-4 py-2 text-right">Views/Day</th>
                <th className="px-4 py-2 text-right">Enquiries</th>
                <th className="px-4 py-2 text-right">Sales</th>
                <th className="px-4 py-2 text-right">Conversion</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.rooms.map((r) => (
                <tr key={r.roomId} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">
                    <Link to={`/viewing-rooms/${r.roomId}`} className="text-accent hover:underline">
                      {r.roomTitle}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right">{r.totalViews}</td>
                  <td className="px-4 py-2 text-right">{r.viewsPerDay}</td>
                  <td className="px-4 py-2 text-right">{r.convertedToEnquiry}</td>
                  <td className="px-4 py-2 text-right">{r.convertedToSale}</td>
                  <td className="px-4 py-2 text-right">{r.conversionRate}%</td>
                  <td className="px-4 py-2">
                    <Badge variant={r.published ? 'success' : 'default'}>
                      {r.published ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Trajectory Tab                                                            */
/* -------------------------------------------------------------------------- */

import type { PriceTrajectoryData } from '../../hooks/usePriceTrajectory';

function TrajectoryTab({ data }: { data: PriceTrajectoryData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <KpiCard label="Current Avg Price" value={formatCurrency(data.currentAvgPrice, 'CHF')} />
        <KpiCard label="Historical Growth Rate" value={`${data.historicalGrowthRate}% p.a.`} />
      </div>

      {/* Scenario Cards */}
      {data.scenarios.map((scenario) => (
        <Card key={scenario.name} className="overflow-hidden">
          <div className="border-b border-primary-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-primary-900">{scenario.label}</h2>
              <Badge variant={
                scenario.name === 'conservative' ? 'default'
                : scenario.name === 'moderate' ? 'info'
                : 'success'
              }>
                {scenario.annualIncreaseRate}% p.a.
              </Badge>
            </div>
            <p className="mt-1 text-xs text-primary-500">{scenario.description}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-primary-50 text-left text-xs text-primary-500">
                <tr>
                  <th className="px-4 py-2">Year</th>
                  <th className="px-4 py-2 text-right">Avg Price</th>
                  <th className="px-4 py-2 text-right">Min Price</th>
                  <th className="px-4 py-2 text-right">Max Price</th>
                  <th className="px-4 py-2 text-right">Projected Revenue</th>
                  <th className="px-4 py-2">Milestones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-50">
                {scenario.years.map((y) => (
                  <tr key={y.year} className="hover:bg-primary-50/50">
                    <td className="px-4 py-2">{y.year}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(y.avgPrice, 'CHF')}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(y.minPrice, 'CHF')}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(y.maxPrice, 'CHF')}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(y.projectedRevenue, 'CHF')}</td>
                    <td className="px-4 py-2">
                      {y.milestonesExpected.length > 0 ? (
                        <Badge variant="info">{y.milestonesExpected.join(', ')}</Badge>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-primary-100 px-4 py-2 text-right text-xs text-primary-500">
            Total projected: {formatCurrency(scenario.totalProjectedRevenue, 'CHF')} | Final avg: {formatCurrency(scenario.finalAvgPrice, 'CHF')}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared KPI Card                                                           */
/* -------------------------------------------------------------------------- */

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-primary-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-primary-900">{String(value)}</p>
    </Card>
  );
}
