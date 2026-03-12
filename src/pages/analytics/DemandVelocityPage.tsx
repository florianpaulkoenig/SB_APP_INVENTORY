// ---------------------------------------------------------------------------
// NOA Inventory -- Demand Velocity Dashboard (Dashboard 5)
// Days to sale, fastest/slowest works, velocity by series/gallery
// ---------------------------------------------------------------------------

import { useDemandVelocity } from '../../hooks/useDemandVelocity';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

const VELOCITY_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444', '#94a3b8'];

export function DemandVelocityPage() {
  const { data, loading } = useDemandVelocity();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!data || data.allResults.length === 0) {
    return <div className="py-20 text-center text-primary-500">No velocity data available.</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">Demand Velocity</h1>
        <p className="mt-1 text-sm text-primary-500">How quickly works sell after release or consignment.</p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Avg Days to Sale" value={data.avgDays != null ? `${data.avgDays}d` : '—'} />
        <KpiBox label="Total Sales" value={data.allResults.length} />
        <KpiBox label="Fastest Sale" value={data.fastest[0] ? `${data.fastest[0].daysToSale}d` : '—'} color="text-emerald-600" />
        <KpiBox label="Slowest Sale" value={data.slowest[0] ? `${data.slowest[0].daysToSale}d` : '—'} color="text-red-600" />
      </div>

      <div className="space-y-6">
        {/* Distribution histogram */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
            Sale Speed Distribution
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.distribution.map((_, i) => (
                  <Cell key={i} fill={VELOCITY_COLORS[i % VELOCITY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Series + Gallery velocity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              Velocity by Series
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.velocityBySeries.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} unit="d" />
                <YAxis dataKey="series" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => `${v} days`} />
                <Bar dataKey="avgDays" name="Avg Days" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              Velocity by Gallery
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.velocityByGallery.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} unit="d" />
                <YAxis dataKey="gallery" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => `${v} days`} />
                <Bar dataKey="avgDays" name="Avg Days" fill="#1a1a2e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Fastest + Slowest tables */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              Fastest Selling
            </h3>
            <div className="space-y-2">
              {data.fastest.map((r, i) => (
                <div key={r.artworkId} className="flex items-center justify-between text-sm">
                  <span className="text-primary-500 w-6">{i + 1}.</span>
                  <span className="flex-1 text-primary-900 font-medium truncate">{r.title}</span>
                  <span className="font-bold text-emerald-600 ml-2">{r.daysToSale}d</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              Slowest Selling
            </h3>
            <div className="space-y-2">
              {data.slowest.map((r, i) => (
                <div key={r.artworkId} className="flex items-center justify-between text-sm">
                  <span className="text-primary-500 w-6">{i + 1}.</span>
                  <span className="flex-1 text-primary-900 font-medium truncate">{r.title}</span>
                  <span className="font-bold text-red-600 ml-2">{r.daysToSale}d</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
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
