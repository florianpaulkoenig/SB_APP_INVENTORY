// ---------------------------------------------------------------------------
// NOA Inventory -- Collector Intelligence Dashboard (Dashboard 4)
// Repeat buyers, spend tiers, LTV, geography, anonymity-aware
// ---------------------------------------------------------------------------

import { useCollectorIntelligence } from '../../hooks/useCollectorIntelligence';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const TIER_COLORS = ['#3b82f6', '#f59e0b', '#f97316', '#ef4444'];
const GEO_COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#f5a623', '#7c3aed', '#059669'];

export function CollectorIntelligencePage() {
  const { data, loading } = useCollectorIntelligence();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!data || data.totalCollectors === 0) {
    return <div className="py-20 text-center text-primary-500">No collector data available.</div>;
  }

  const tierData = data.spendTiers.filter((t) => t.count > 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">Collector Intelligence</h1>
        <p className="mt-1 text-sm text-primary-500">Buyer analysis, spend tiers, and collector geography.</p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <KpiBox label="Total Collectors" value={data.totalCollectors} />
        <KpiBox label="Repeat Buyers" value={data.repeatBuyers} color="text-emerald-600" />
        <KpiBox label="Avg Spend" value={formatCurrency(data.avgSpend, 'CHF')} />
        <KpiBox label="Anonymous" value={data.anonymousCount} />
        <KpiBox label="Countries" value={data.byCountry.length} />
      </div>

      <div className="space-y-6">
        {/* Row 1: Spend tiers + Geography */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Spend Tiers</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={tierData} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90}
                  label={({ label, count }) => `${label}: ${count}`}>
                  {tierData.map((_, i) => (
                    <Cell key={i} fill={TIER_COLORS[i % TIER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Collectors by Country</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.byCountry.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="country" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" name="Collectors" radius={[0, 4, 4, 0]}>
                  {data.byCountry.slice(0, 10).map((_, i) => (
                    <Cell key={i} fill={GEO_COLORS[i % GEO_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Top Collectors Table */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Top Collectors</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Collector</th>
                  <th className="pb-3 pr-4">Country</th>
                  <th className="pb-3 pr-4 text-right">Total Spent</th>
                  <th className="pb-3 pr-4 text-right">Purchases</th>
                  <th className="pb-3 pr-4">Preferred Series</th>
                  <th className="pb-3">Privacy</th>
                </tr>
              </thead>
              <tbody>
                {data.topCollectors.map((c, i) => (
                  <tr key={c.id} className="border-b border-primary-100 hover:bg-primary-50">
                    <td className="py-3 pr-4 text-primary-500">{i + 1}</td>
                    <td className="py-3 pr-4 font-medium text-primary-900">
                      {c.isAnonymous ? 'Anonymous Collector' : c.name || 'Unknown'}
                    </td>
                    <td className="py-3 pr-4 text-primary-600">{c.country || '—'}</td>
                    <td className="py-3 pr-4 text-right font-medium text-primary-900">
                      {formatCurrency(c.totalSpent, 'CHF')}
                    </td>
                    <td className="py-3 pr-4 text-right text-primary-700">{c.purchaseCount}</td>
                    <td className="py-3 pr-4 text-primary-600 text-xs">
                      {c.preferredSeries.slice(0, 3).join(', ') || '—'}
                    </td>
                    <td className="py-3">
                      <Badge variant={c.isAnonymous ? 'default' : 'success'}>
                        {c.isAnonymous ? 'Private' : 'Named'}
                      </Badge>
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

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color || 'text-primary-900'}`}>{value}</p>
    </Card>
  );
}
