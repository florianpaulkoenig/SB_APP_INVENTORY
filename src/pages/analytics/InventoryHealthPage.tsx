// ---------------------------------------------------------------------------
// NOA Inventory -- Inventory Health Dashboard (Dashboard 3)
// Status distribution, aging, pressure ratio, inventory funnel, series health
// ---------------------------------------------------------------------------

import { useInventoryAnalytics } from '../../hooks/useInventoryAnalytics';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  FunnelChart, Funnel, LabelList,
} from 'recharts';

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  available: '#10b981',
  sold: '#1a1a2e',
  reserved: '#f59e0b',
  in_production: '#3b82f6',
  in_transit: '#8b5cf6',
  on_consignment: '#06b6d4',
  paid: '#059669',
  pending_sale: '#f97316',
  archived: '#94a3b8',
  destroyed: '#ef4444',
  donated: '#8b5cf6',
};

const AGING_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];
const FUNNEL_COLORS = ['#1a1a2e', '#3b82f6', '#06b6d4', '#f59e0b', '#10b981'];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function InventoryHealthPage() {
  const { data, loading } = useInventoryAnalytics();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-primary-500">
        No inventory data available.
      </div>
    );
  }

  // Status breakdown for pie chart
  const statusData = Object.entries(data.statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: status.replace(/_/g, ' '),
      value: count,
      status,
    }));

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">
          Inventory Health
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Status distribution, aging analysis, and inventory pressure.
        </p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiBox label="Total Works" value={data.total} />
        <KpiBox label="Available" value={data.statusCounts.available} color="text-emerald-600" />
        <KpiBox label="On Consignment" value={data.statusCounts.on_consignment} color="text-cyan-600" />
        <KpiBox label="Sell-Through" value={`${data.sellThroughRate.toFixed(1)}%`} color="text-accent" />
        <KpiBox
          label="Pressure Ratio"
          value={data.pressureRatio < 0 ? 'No sales' : `${data.pressureRatio}x`}
          color={data.pressureRatio > 6 ? 'text-red-600' : 'text-primary-900'}
        />
        <KpiBox
          label="Avg Days on Market"
          value={data.avgDaysOnMarket != null ? `${data.avgDaysOnMarket}d` : '—'}
        />
      </div>

      <div className="space-y-6">
        {/* Row 1: Status + Aging */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Status distribution pie */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Aging histogram */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              Inventory Aging (Unsold Works)
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.agingBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.agingBuckets.map((_, i) => (
                    <Cell key={i} fill={AGING_COLORS[i % AGING_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Row 2: Funnel + Series */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Inventory funnel */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              Inventory Funnel
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <FunnelChart>
                <Tooltip />
                <Funnel dataKey="count" data={data.inventoryFunnel} isAnimationActive>
                  {data.inventoryFunnel.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                  <LabelList position="right" dataKey="stage" fill="#1a1a2e" fontSize={12} />
                  <LabelList position="center" dataKey="count" fill="#fff" fontSize={14} fontWeight="bold" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </Card>

          {/* Series distribution */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              Series Overview
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.seriesDistribution.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="series" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Total" fill="#1a1a2e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="sold" name="Sold" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Row 3: Category + Size + Production */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Category */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              By Category
            </h3>
            <div className="space-y-2">
              {data.categoryDistribution.map((c) => (
                <div key={c.category} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-primary-700">{c.category}</span>
                  <span className="font-medium text-primary-900">{c.count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Size */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              By Size
            </h3>
            <div className="space-y-2">
              {data.sizeDistribution.map((s) => (
                <div key={s.size} className="flex items-center justify-between text-sm">
                  <span className="text-primary-700">{s.size}</span>
                  <span className="font-medium text-primary-900">{s.count}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Monthly production trend */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
              Monthly Production
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.monthlyProduction.slice(-12)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1a1a2e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Box helper
// ---------------------------------------------------------------------------

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color || 'text-primary-900'}`}>{value}</p>
    </Card>
  );
}
