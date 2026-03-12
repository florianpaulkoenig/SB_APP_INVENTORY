// ---------------------------------------------------------------------------
// NOA Inventory -- Supply Planning Dashboard (Dashboard 10)
// Production vs sales, release calendar, supply-demand gap
// ---------------------------------------------------------------------------

import { useSupplyPlanning } from '../../hooks/useSupplyPlanning';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#f5a623', '#7c3aed', '#059669'];

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  pending: '#f59e0b',
  in_production: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
  delivered: '#059669',
};

export function SupplyPlanningPage() {
  const { data, loading } = useSupplyPlanning();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!data) {
    return <div className="py-20 text-center text-primary-500">No supply planning data available.</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">Supply Planning</h1>
        <p className="mt-1 text-sm text-primary-500">Production vs sales, release calendar, and supply-demand balance.</p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Total Produced" value={data.totalProduced} />
        <KpiBox label="Total Sold" value={data.totalSold} />
        <KpiBox label="Supply/Demand" value={`${data.supplyDemandRatio}x`}
          color={data.supplyDemandRatio > 3 ? '#ef4444' : data.supplyDemandRatio > 1.5 ? '#f59e0b' : '#10b981'} />
        <KpiBox label="Avg Monthly Sales" value={data.avgMonthlySales} />
      </div>

      <div className="space-y-6">
        {/* Production vs Sales timeline */}
        {data.monthlyData.length > 0 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Production vs Sales Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="produced" name="Produced" stroke="#1a1a2e" strokeWidth={2} />
                <Line type="monotone" dataKey="sold" name="Sold" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Series production vs sold */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Production by Series</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.seriesProduction} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="series" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="produced" name="Produced" fill="#1a1a2e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="sold" name="Sold" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Production order status */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Order Status</h3>
            {data.statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={data.statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100}
                    label={(e) => `${e.status} (${e.count})`}>
                    {data.statusBreakdown.map((s, i) => (
                      <Cell key={i} fill={STATUS_COLORS[s.status] || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-primary-500 py-10">No production orders.</p>
            )}
          </Card>
        </div>

        {/* Upcoming Releases */}
        {data.upcomingReleases.length > 0 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Upcoming Releases</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                    <th className="pb-3 pr-4">Title</th>
                    <th className="pb-3 pr-4">Planned Release</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcomingReleases.map((r) => (
                    <tr key={r.id} className="border-b border-primary-100 hover:bg-primary-50">
                      <td className="py-3 pr-4 font-medium text-primary-900">{r.title}</td>
                      <td className="py-3 pr-4 text-primary-700">
                        {new Date(r.plannedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                          style={{ backgroundColor: (STATUS_COLORS[r.status] || '#94a3b8') + '20', color: STATUS_COLORS[r.status] || '#94a3b8' }}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Supply-Demand Gap */}
        {data.monthlyData.length > 0 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Supply-Demand Gap (Produced − Sold)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="gap" name="Gap">
                  {data.monthlyData.map((d, i) => (
                    <Cell key={i} fill={d.gap >= 0 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  );
}

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${!color ? 'text-primary-900' : ''}`} style={color ? { color } : undefined}>{value}</p>
    </Card>
  );
}
