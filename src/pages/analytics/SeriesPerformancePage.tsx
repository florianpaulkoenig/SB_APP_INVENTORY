// ---------------------------------------------------------------------------
// NOA Inventory -- Series Performance Dashboard (Dashboard 6)
// Revenue, price, sell-through, velocity per series
// ---------------------------------------------------------------------------

import { useSeriesPerformance } from '../../hooks/useSeriesPerformance';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell,
} from 'recharts';

const COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#f5a623', '#7c3aed', '#059669', '#3b82f6', '#f97316'];

export function SeriesPerformancePage() {
  const { data, loading } = useSeriesPerformance();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!data || data.series.length === 0) {
    return <div className="py-20 text-center text-primary-500">No series data available.</div>;
  }

  // Bubble chart data: x = sell-through, y = avg price, z = total produced
  const bubbleData = data.series
    .filter((s) => s.totalProduced > 0)
    .map((s, i) => ({
      ...s,
      color: COLORS[i % COLORS.length],
    }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">Series Performance</h1>
        <p className="mt-1 text-sm text-primary-500">Revenue, sell-through, and velocity per series.</p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Total Series" value={data.totalSeries} />
        <KpiBox label="Highest Revenue" value={data.highestRevenue || '—'} />
        <KpiBox label="Best Sell-Through" value={data.bestSellThrough || '—'} color="text-emerald-600" />
        <KpiBox label="Total Revenue" value={formatCurrency(data.series.reduce((s, r) => s + r.totalRevenue, 0), 'CHF')} />
      </div>

      <div className="space-y-6">
        {/* Revenue by series */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Revenue by Series</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.series.slice(0, 12)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')} />
              <YAxis dataKey="series" type="category" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={(v: number) => formatCurrency(v, 'CHF')} />
              <Bar dataKey="totalRevenue" name="Revenue" fill="#1a1a2e" radius={[0, 4, 4, 0]}>
                {data.series.slice(0, 12).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Bubble chart: Sell-through vs Price vs Volume */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
            Sell-Through vs Avg Price (bubble = volume)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="sellThrough" name="Sell-Through" unit="%" tick={{ fontSize: 12 }} />
              <YAxis dataKey="avgPrice" name="Avg Price" tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <ZAxis dataKey="totalProduced" range={[50, 400]} name="Produced" />
              <Tooltip formatter={(value: number, name: string) =>
                name === 'Avg Price' ? formatCurrency(value, 'CHF') : `${value}${name === 'Sell-Through' ? '%' : ''}`
              } />
              <Scatter data={bubbleData}>
                {bubbleData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </Card>

        {/* Detailed table */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Series Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  <th className="pb-3 pr-4">Series</th>
                  <th className="pb-3 pr-4 text-right">Produced</th>
                  <th className="pb-3 pr-4 text-right">Sold</th>
                  <th className="pb-3 pr-4 text-right">Sell-Through</th>
                  <th className="pb-3 pr-4 text-right">Revenue</th>
                  <th className="pb-3 pr-4 text-right">Avg Price</th>
                  <th className="pb-3 text-right">Avg Days</th>
                </tr>
              </thead>
              <tbody>
                {data.series.map((s) => (
                  <tr key={s.series} className="border-b border-primary-100 hover:bg-primary-50">
                    <td className="py-3 pr-4 font-medium text-primary-900">{s.series}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{s.totalProduced}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{s.totalSold}</td>
                    <td className="py-3 pr-4 text-right font-medium" style={{
                      color: s.sellThrough >= 50 ? '#10b981' : s.sellThrough >= 25 ? '#f59e0b' : '#94a3b8',
                    }}>
                      {s.sellThrough.toFixed(1)}%
                    </td>
                    <td className="py-3 pr-4 text-right text-primary-700">{formatCurrency(s.totalRevenue, 'CHF')}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{formatCurrency(s.avgPrice, 'CHF')}</td>
                    <td className="py-3 text-right text-primary-700">{s.avgDaysToSale != null ? `${s.avgDaysToSale}d` : '—'}</td>
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

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color || 'text-primary-900'}`}>{value}</p>
    </Card>
  );
}
