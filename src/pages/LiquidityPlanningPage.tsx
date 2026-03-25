// ---------------------------------------------------------------------------
// NOA Inventory -- Liquidity Planning Page
// Dual-entity (NOA / Simon Berger) monthly cash-flow visualization
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatCurrency } from '../lib/utils';
import { useLiquidityPlanning } from '../hooks/useLiquidityPlanning';
import type { LiquidityData } from '../hooks/useLiquidityPlanning';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Entity = 'noa' | 'sb';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: 'green' | 'red' | 'default';
}) {
  const colorClass =
    color === 'green'
      ? 'text-emerald-600'
      : color === 'red'
        ? 'text-red-600'
        : 'text-primary-900';

  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${colorClass}`}>
        {formatCurrency(Math.round(value), 'CHF')}
      </p>
    </Card>
  );
}

// Custom tooltip for charts
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-primary-100 bg-white p-3 shadow-md">
      <p className="mb-1 text-xs font-semibold text-primary-700">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(Math.round(entry.value), 'CHF')}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function LiquidityPlanningPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [entity, setEntity] = useState<Entity>('noa');
  const { noaData, sbData, loading } = useLiquidityPlanning(year);

  const data: LiquidityData | null = entity === 'noa' ? noaData : sbData;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">Liquidity Planning</h1>
          <p className="mt-1 text-sm text-primary-500">Monthly cash-flow overview for NOA and Simon Berger.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setYear((y) => y - 1)}>
            &larr;
          </Button>
          <span className="text-lg font-semibold min-w-[4rem] text-center">
            {year}
          </span>
          <Button variant="primary" onClick={() => setYear((y) => y + 1)}>
            &rarr;
          </Button>
        </div>
      </div>

      {/* Entity toggle */}
      <div className="flex gap-2">
        <Button
          variant={entity === 'noa' ? 'primary' : 'outline'}
          onClick={() => setEntity('noa')}
        >
          NOA
        </Button>
        <Button
          variant={entity === 'sb' ? 'primary' : 'outline'}
          onClick={() => setEntity('sb')}
        >
          Simon Berger
        </Button>
      </div>

      {!data ? (
        <Card className="p-8 text-center text-primary-500">
          No data available for {year}.
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Total Revenue In" value={data.totalRevenueIn} />
            <KpiCard label="Expected In" value={data.totalExpectedIn} />
            <KpiCard label="Total Expenses Out" value={data.totalExpensesOut} />
            <KpiCard
              label="Net Position"
              value={data.totalNet}
              color={data.totalNet >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* Cumulative Line Chart */}
          <Card className="p-4">
            <h2 className="mb-4 font-display text-sm font-semibold text-primary-900">
              Cumulative Cash Flow
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  name="Cumulative Net"
                  stroke="#1a1a2e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Monthly Inflow vs Outflow Bar Chart */}
          <Card className="p-4">
            <h2 className="mb-4 font-display text-sm font-semibold text-primary-900">
              Monthly Inflow vs Outflow
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar
                  dataKey="revenueIn"
                  name="Revenue In"
                  fill="#e94560"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expectedIn"
                  name="Expected In"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expensesOut"
                  name="Expenses Out"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Monthly Breakdown Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                    <th className="px-4 pb-3 pt-4">Month</th>
                    <th className="px-4 pb-3 pt-4 text-right">Revenue In</th>
                    <th className="px-4 pb-3 pt-4 text-right">Expected</th>
                    <th className="px-4 pb-3 pt-4 text-right">Expenses Out</th>
                    <th className="px-4 pb-3 pt-4 text-right">Net</th>
                    <th className="px-4 pb-3 pt-4 text-right">Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((m) => {
                    const isCurrentMonth =
                      year === new Date().getFullYear() &&
                      m.monthIndex === new Date().getMonth();
                    return (
                      <tr
                        key={m.month}
                        className={`border-b border-primary-100 ${isCurrentMonth ? 'bg-accent/5' : 'hover:bg-primary-50'}`}
                      >
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-primary-900">
                          {m.month}
                          {isCurrentMonth && (
                            <span className="ml-2 text-xs text-accent">
                              (current)
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right text-primary-700">
                          {formatCurrency(Math.round(m.revenueIn), 'CHF')}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right text-emerald-600">
                          {formatCurrency(Math.round(m.expectedIn), 'CHF')}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right text-red-600">
                          {formatCurrency(Math.round(m.expensesOut), 'CHF')}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-2 text-right font-semibold ${
                            m.net >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(Math.round(m.net), 'CHF')}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-2 text-right font-semibold ${
                            m.cumulative >= 0
                              ? 'text-primary-900'
                              : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(Math.round(m.cumulative), 'CHF')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t border-primary-200 bg-primary-50 font-semibold">
                    <td className="px-4 py-3 text-primary-900">Total</td>
                    <td className="px-4 py-3 text-right text-primary-900">
                      {formatCurrency(Math.round(data.totalRevenueIn), 'CHF')}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600">
                      {formatCurrency(Math.round(data.totalExpectedIn), 'CHF')}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {formatCurrency(Math.round(data.totalExpensesOut), 'CHF')}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        data.totalNet >= 0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(Math.round(data.totalNet), 'CHF')}
                    </td>
                    <td className="px-4 py-3 text-right text-primary-900">
                      {formatCurrency(Math.round(data.currentBalance), 'CHF')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
