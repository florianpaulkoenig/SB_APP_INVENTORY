// ---------------------------------------------------------------------------
// NOA Inventory -- Viewing Room Analytics Deep Dive
// Views, engagement, and conversion attribution per viewing room
// ---------------------------------------------------------------------------

import { useViewingRoomAnalytics } from '../../hooks/useViewingRoomAnalytics';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ViewingRoomAnalyticsPage() {
  const { data, loading } = useViewingRoomAnalytics();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!data || data.totalRooms === 0) {
    return <div className="py-20 text-center text-primary-500">No viewing room data available.</div>;
  }

  // Last 30 days of the trend for the bar chart
  const last30 = data.viewsTrend.slice(-30);
  const maxViews = Math.max(...last30.map((d) => d.views), 1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">Viewing Room Analytics</h1>
        <p className="mt-1 text-sm text-primary-500">
          Performance, engagement, and conversion attribution across all viewing rooms.
        </p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Total Views" value={data.totalViews} />
        <KpiBox label="Published Rooms" value={data.publishedRooms} />
        <KpiBox label="Avg Views / Room" value={data.avgViewsPerRoom} />
        <KpiBox
          label="Overall Conversion"
          value={`${data.overallConversionRate}%`}
          color={data.overallConversionRate >= 5 ? '#10b981' : data.overallConversionRate > 0 ? '#f59e0b' : '#94a3b8'}
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
// KPI Card
// ---------------------------------------------------------------------------

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: color || undefined }}>{value}</p>
    </Card>
  );
}
