// ---------------------------------------------------------------------------
// NOA Inventory -- Price Ladder Dashboard (Dashboard 11)
// Entry/mid/top tiers, size vs price, series vs price, distribution
// ---------------------------------------------------------------------------

import { usePriceLadder } from '../../hooks/usePriceLadder';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

const TIER_COLORS = { entry: '#3b82f6', mid: '#f59e0b', top: '#10b981' };
const DIST_COLORS = ['#94a3b8', '#3b82f6', '#06b6d4', '#f59e0b', '#f97316', '#ef4444'];

export function PriceLadderPage() {
  const { data, loading } = usePriceLadder();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!data || data.totalPriced === 0) {
    return <div className="py-20 text-center text-primary-500">No pricing data available.</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">Price Ladder</h1>
        <p className="mt-1 text-sm text-primary-500">Price tiers, distribution, and size/series pricing.</p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Priced Works" value={data.totalPriced} />
        <KpiBox label="Average Price" value={formatCurrency(data.avgPrice, 'CHF')} />
        <KpiBox label="Median Price" value={formatCurrency(data.medianPrice, 'CHF')} />
        <KpiBox label="Price Tiers" value={data.tiers.length} />
      </div>

      <div className="space-y-6">
        {/* Tier cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {data.tiers.map((tier) => (
            <Card key={tier.tier} className="p-6 text-center" style={{ borderTop: `4px solid ${TIER_COLORS[tier.tier]}` }}>
              <h3 className="font-display text-lg font-semibold text-primary-900">{tier.label}</h3>
              <p className="mt-2 text-2xl font-bold" style={{ color: TIER_COLORS[tier.tier] }}>
                {formatCurrency(tier.avgPrice, 'CHF')}
              </p>
              <p className="mt-1 text-xs text-primary-500">
                {formatCurrency(tier.minPrice, 'CHF')} — {formatCurrency(tier.maxPrice, 'CHF')}
              </p>
              <p className="mt-1 text-sm text-primary-600">{tier.count} works</p>
            </Card>
          ))}
        </div>

        {/* Price distribution */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
            Price Distribution
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.priceDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.priceDistribution.map((_, i) => (
                  <Cell key={i} fill={DIST_COLORS[i % DIST_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Price by series + size */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              Avg Price by Series
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.priceBySeries.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')} />
                <YAxis dataKey="series" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(v: number) => formatCurrency(v, 'CHF')} />
                <Bar dataKey="avgPrice" name="Avg Price" fill="#1a1a2e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              Avg Price by Size
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.priceBySize}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="size" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v, 'CHF').replace('.00', '')} />
                <Tooltip formatter={(v: number) => formatCurrency(v, 'CHF')} />
                <Bar dataKey="avgPrice" name="Avg Price" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
