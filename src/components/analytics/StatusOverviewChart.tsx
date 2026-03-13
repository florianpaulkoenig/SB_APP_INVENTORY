// ---------------------------------------------------------------------------
// StatusOverviewChart -- Horizontal bar chart of artwork count by status
// ---------------------------------------------------------------------------

import { useMemo, useState, useEffect } from 'react';
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
  archived: '#a3a3a3',        // gray
  destroyed: '#991b1b',       // dark red
};

const FALLBACK_COLOR = '#a3a3a3';

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

// Format status value to human-readable label
function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusOverviewChart({ data }: StatusOverviewChartProps) {
  const isMobile = useIsMobile();
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
  const chartHeight = Math.max(isMobile ? 220 : 250, chartData.length * (isMobile ? 36 : 48) + 60);

  return (
    <Card className="overflow-hidden p-4 sm:p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">
        Artwork Status Overview
      </h3>

      {!hasData ? (
        <div className="flex h-[220px] sm:h-[250px] items-center justify-center">
          <p className="text-sm text-primary-400">No status data</p>
        </div>
      ) : (
        <div className="min-h-[220px] overflow-x-auto">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#737373', fontSize: isMobile ? 10 : 12 }}
              axisLine={{ stroke: '#d4d4d4' }}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={isMobile ? 90 : 130}
              tick={{ fill: '#404040', fontSize: isMobile ? 10 : 12 }}
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
            <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]} barSize={isMobile ? 18 : 24}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
