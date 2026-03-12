// ---------------------------------------------------------------------------
// NOA Inventory -- Career Trajectory Dashboard (Dashboard 12)
// Timeline, milestones, cumulative growth
// ---------------------------------------------------------------------------

import { useCareerTrajectory } from '../../hooks/useCareerTrajectory';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#f5a623', '#7c3aed', '#059669'];

const TYPE_LABELS: Record<string, string> = {
  exhibition: 'Exhibition',
  museum_show: 'Museum Show',
  publication: 'Publication',
  award: 'Award',
  institutional: 'Institutional',
  collection: 'Collection',
  fair: 'Art Fair',
};

export function CareerTrajectoryPage() {
  const { data, loading } = useCareerTrajectory();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!data) {
    return <div className="py-20 text-center text-primary-500">No career data available.</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">Career Trajectory</h1>
        <p className="mt-1 text-sm text-primary-500">Timeline, milestones, and cumulative growth.</p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Years Active" value={data.yearsActive} />
        <KpiBox label="Total Milestones" value={data.totalMilestones} />
        <KpiBox label="Exhibitions" value={data.totalExhibitions} />
        <KpiBox label="Total Revenue" value={formatCurrency(data.totalRevenue, 'CHF')} />
      </div>

      <div className="space-y-6">
        {/* Cumulative Growth */}
        {data.yearlyGrowth.length > 1 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Cumulative Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.yearlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="revenue" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number, name: string) =>
                  name.includes('Revenue') ? formatCurrency(v, 'CHF') : v
                } />
                <Legend />
                <Line yAxisId="revenue" type="monotone" dataKey="cumulativeRevenue" name="Cumulative Revenue" stroke="#1a1a2e" strokeWidth={2} />
                <Line yAxisId="count" type="monotone" dataKey="cumulativeSales" name="Cumulative Sales" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Activity by year */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Activity by Year</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.yearlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="#1a1a2e" />
                <Bar dataKey="exhibitions" name="Exhibitions" fill="#0f3460" />
                <Bar dataKey="milestones" name="Milestones" fill="#e94560" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Milestones by type */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Milestones by Type</h3>
            {data.milestonesByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={data.milestonesByType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={100}
                    label={(e) => `${TYPE_LABELS[e.type] || e.type} (${e.count})`}>
                    {data.milestonesByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, _: string, props: { payload: { type: string } }) =>
                    [v, TYPE_LABELS[props.payload.type] || props.payload.type]
                  } />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-primary-500 py-10">No milestones recorded.</p>
            )}
          </Card>
        </div>

        {/* Milestones by Country */}
        {data.milestonesByCountry.length > 0 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Milestones by Country</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.milestonesByCountry.slice(0, 12)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="country" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" name="Milestones" fill="#533483" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Milestone Timeline */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Milestone Timeline</h3>
          {data.milestones.length > 0 ? (
            <div className="space-y-3">
              {data.milestones.slice(0, 30).map((m) => (
                <div key={m.id} className="flex items-start gap-4 border-b border-primary-100 pb-3">
                  <span className="shrink-0 w-12 text-right font-bold text-primary-900">{m.year}</span>
                  <div className="flex-1">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mr-2 capitalize"
                      style={{ backgroundColor: COLORS[Object.keys(TYPE_LABELS).indexOf(m.type) % COLORS.length] + '20',
                               color: COLORS[Object.keys(TYPE_LABELS).indexOf(m.type) % COLORS.length] }}>
                      {TYPE_LABELS[m.type] || m.type}
                    </span>
                    <span className="font-medium text-primary-900">{m.title}</span>
                    {m.institution && <span className="text-primary-500 ml-2">— {m.institution}</span>}
                    {m.city && <span className="text-primary-400 ml-1">({m.city}{m.country ? `, ${m.country}` : ''})</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-primary-500 py-10">No milestones recorded yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color || 'text-primary-900'}`}>{value}</p>
    </Card>
  );
}
