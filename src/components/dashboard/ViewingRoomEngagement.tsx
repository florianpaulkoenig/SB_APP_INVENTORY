import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import type { ViewingRoomEngagementData } from '../../hooks/useDashboardAnalytics';

export function ViewingRoomEngagement({ data }: { data: ViewingRoomEngagementData }) {
  if (data.rooms.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Viewing Room Engagement</h3>
        <p className="text-sm text-primary-400">No viewing rooms yet.</p>
      </Card>
    );
  }

  const mostViewed = data.rooms[0];

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Viewing Room Engagement</h3>

      {/* KPI row */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-primary-50/50 p-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Total Views</p>
          <p className="mt-1 font-display text-lg font-bold text-primary-900">{data.totalViews}</p>
        </div>
        <div className="rounded-lg bg-primary-50/50 p-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Top Room</p>
          <p className="mt-1 truncate text-sm font-bold text-primary-900">{mostViewed?.title ?? '\u2014'}</p>
        </div>
        <div className="rounded-lg bg-primary-50/50 p-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Avg / Room</p>
          <p className="mt-1 font-display text-lg font-bold text-primary-900">
            {data.rooms.length > 0 ? Math.round(data.totalViews / data.rooms.length) : 0}
          </p>
        </div>
      </div>

      {/* Monthly trend chart */}
      {data.monthlyTrend.length > 1 && (
        <div className="mb-4">
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data.monthlyTrend} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="month" tick={{ fill: '#737373', fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#737373', fontSize: 10 }} width={30} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="views" stroke="#c9a96e" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Rooms table */}
      <div className="max-h-48 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-primary-100">
              <th className="pb-1 pr-2 font-medium text-primary-400">Room</th>
              <th className="pb-1 pr-2 text-center font-medium text-primary-400">Works</th>
              <th className="pb-1 pr-2 text-center font-medium text-primary-400">Views</th>
              <th className="hidden pb-1 font-medium text-primary-400 sm:table-cell">Last View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-50">
            {data.rooms.map((r) => (
              <tr key={r.roomId} className="hover:bg-primary-50/50">
                <td className="max-w-[120px] truncate py-1.5 pr-2 text-primary-900">{r.title}</td>
                <td className="py-1.5 pr-2 text-center text-primary-600">{r.artworkCount}</td>
                <td className="py-1.5 pr-2 text-center font-medium text-primary-900">{r.totalViews}</td>
                <td className="hidden py-1.5 text-primary-500 sm:table-cell">
                  {r.lastViewed ? new Date(r.lastViewed).toLocaleDateString() : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
