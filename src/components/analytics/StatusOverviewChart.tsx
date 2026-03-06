// ---------------------------------------------------------------------------
// StatusOverviewChart -- Horizontal bar chart of artwork count by status
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card } from '../ui/Card';

export interface StatusOverviewChartProps {
  data: { status: string; count: number }[];
}

// Map artwork status values to chart-friendly hex colours
const STATUS_COLOR_MAP: Record<string, string> = {
  available: '#22c55e',     // emerald / success
  sold: '#ef4444',          // red / danger
  reserved: '#f59e0b',      // amber / warning
  in_production: '#3b82f6', // blue / info
  in_transit: '#a855f7',    // purple
  on_consignment: '#0ea5e9', // sky
  paid: '#10b981',            // emerald
  pending_sale: '#f97316',    // orange
};

const FALLBACK_COLOR = '#a3a3a3';

// Format status value to human-readable label
function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusOverviewChart({ data }: StatusOverviewChartProps) {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: formatStatusLabel(d.status),
        fill: STATUS_COLOR_MAP[d.status] ?? FALLBACK_COLOR,
      })),
    [data],
  );

  const hasData = chartData.length > 0;
  const chartHeight = Math.max(250, chartData.length * 48 + 60);

  return (
    <Card className="p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">
        Artwork Status Overview
      </h3>

      {!hasData ? (
        <div className="flex h-[250px] items-center justify-center">
          <p className="text-sm text-primary-400">No status data</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#737373', fontSize: 12 }}
              axisLine={{ stroke: '#d4d4d4' }}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={130}
              tick={{ fill: '#404040', fontSize: 12 }}
              axisLine={{ stroke: '#d4d4d4' }}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [value, 'Count']}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e5e5',
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]} barSize={24}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
