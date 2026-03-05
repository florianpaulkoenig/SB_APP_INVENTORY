// ---------------------------------------------------------------------------
// GalleryPerformanceChart -- Horizontal bar chart of revenue by gallery
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
} from 'recharts';
import { Card } from '../ui/Card';

export interface GalleryPerformanceChartProps {
  data: { gallery: string; revenue: number; count: number }[];
}

function currencyFormatter(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function GalleryPerformanceChart({ data }: GalleryPerformanceChartProps) {
  const sorted = useMemo(
    () =>
      [...data]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
    [data],
  );

  const hasData = sorted.length > 0;
  const chartHeight = Math.max(300, sorted.length * 48 + 60);

  return (
    <Card className="p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">
        Gallery Performance
      </h3>

      {!hasData ? (
        <div className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-primary-400">No gallery data</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#737373', fontSize: 12 }}
              axisLine={{ stroke: '#d4d4d4' }}
              tickLine={false}
              tickFormatter={currencyFormatter}
            />
            <YAxis
              type="category"
              dataKey="gallery"
              width={140}
              tick={{ fill: '#404040', fontSize: 12 }}
              axisLine={{ stroke: '#d4d4d4' }}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'Revenue') return currencyFormatter(value);
                return value;
              }}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e5e5',
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <Bar
              dataKey="revenue"
              name="Revenue"
              fill="#c9a96e"
              radius={[0, 4, 4, 0]}
              barSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
