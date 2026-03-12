// ---------------------------------------------------------------------------
// NOA Inventory -- Exhibition Impact Dashboard (Dashboard 9)
// Sell-through, ROI proxy, collector acquisition per exhibition
// ---------------------------------------------------------------------------

import { useExhibitionImpact } from '../../hooks/useExhibitionImpact';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

const COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#f5a623', '#7c3aed', '#059669'];

function roiColor(roi: number | null): string {
  if (roi == null) return '#94a3b8';
  if (roi >= 100) return '#10b981';
  if (roi >= 0) return '#f59e0b';
  return '#ef4444';
}

export function ExhibitionImpactPage() {
  const { data, loading } = useExhibitionImpact();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!data || data.exhibitions.length === 0) {
    return <div className="py-20 text-center text-primary-500">No exhibition data available.</div>;
  }

  const top10 = data.exhibitions.slice(0, 10);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">Exhibition Impact</h1>
        <p className="mt-1 text-sm text-primary-500">ROI, sell-through, and collector acquisition per exhibition.</p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Total Exhibitions" value={data.totalExhibitions} />
        <KpiBox label="Avg ROI" value={data.avgROI != null ? `${data.avgROI}%` : '—'} color={roiColor(data.avgROI)} />
        <KpiBox label="Total Revenue" value={formatCurrency(data.totalRevenue, 'CHF')} />
        <KpiBox label="New Collectors" value={data.totalNewCollectors} color="#7c3aed" />
      </div>

      <div className="space-y-6">
        {/* Revenue by exhibition */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Revenue by Exhibition</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')} />
                <YAxis dataKey="title" type="category" tick={{ fontSize: 11 }} width={140} />
                <Tooltip formatter={(v: number) => formatCurrency(v, 'CHF')} />
                <Bar dataKey="totalRevenue" name="Revenue" fill="#1a1a2e" radius={[0, 4, 4, 0]}>
                  {top10.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* By Type pie */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Exhibitions by Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.byType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={100} label={(e) => `${e.type} (${e.count})`}>
                  {data.byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Revenue trend by year */}
        {data.byYear.length > 1 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Revenue by Year</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.byYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v, 'CHF')} />
                <Line type="monotone" dataKey="revenue" stroke="#1a1a2e" strokeWidth={2} dot={{ fill: '#1a1a2e' }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Detail Table */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Exhibition Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  <th className="pb-3 pr-4">Exhibition</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">Venue</th>
                  <th className="pb-3 pr-4 text-right">Works</th>
                  <th className="pb-3 pr-4 text-right">Sales</th>
                  <th className="pb-3 pr-4 text-right">Sell-Through</th>
                  <th className="pb-3 pr-4 text-right">Revenue</th>
                  <th className="pb-3 pr-4 text-right">Budget</th>
                  <th className="pb-3 pr-4 text-right">ROI</th>
                  <th className="pb-3 text-right">New Collectors</th>
                </tr>
              </thead>
              <tbody>
                {data.exhibitions.map((e) => (
                  <tr key={e.id} className="border-b border-primary-100 hover:bg-primary-50">
                    <td className="py-3 pr-4 font-medium text-primary-900">{e.title}</td>
                    <td className="py-3 pr-4 text-primary-600 capitalize">{e.type.replace('_', ' ')}</td>
                    <td className="py-3 pr-4 text-primary-600">{e.venue || '—'}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{e.artworksShown}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{e.directSales + e.attributedSales}</td>
                    <td className="py-3 pr-4 text-right font-medium" style={{ color: e.sellThrough >= 30 ? '#10b981' : e.sellThrough >= 10 ? '#f59e0b' : '#94a3b8' }}>
                      {e.sellThrough.toFixed(1)}%
                    </td>
                    <td className="py-3 pr-4 text-right text-primary-700">{formatCurrency(e.totalRevenue, 'CHF')}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{formatCurrency(e.budget, 'CHF')}</td>
                    <td className="py-3 pr-4 text-right font-medium" style={{ color: roiColor(e.roi) }}>
                      {e.roi != null ? `${Math.round(e.roi)}%` : '—'}
                    </td>
                    <td className="py-3 text-right text-primary-700">{e.newCollectors}</td>
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
      <p className="mt-1 text-2xl font-bold" style={{ color: color || undefined }}>{value}</p>
    </Card>
  );
}
