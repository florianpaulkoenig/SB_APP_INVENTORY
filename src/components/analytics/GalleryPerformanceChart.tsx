// ---------------------------------------------------------------------------
// GalleryPerformanceChart -- Horizontal bar chart of revenue by gallery
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
} from 'recharts';
import { Card } from '../ui/Card';

export interface GalleryPerformanceChartProps {
  data: { gallery: string; revenue: number; count: number }[];
}

function currencyFormatter(value: number) {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

export function GalleryPerformanceChart({ data }: GalleryPerformanceChartProps) {
  const isMobile = useIsMobile();
  const sorted = useMemo(
    () =>
      [...data]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
    [data],
  );

  const hasData = sorted.length > 0;
  const chartHeight = Math.max(isMobile ? 250 : 300, sorted.length * (isMobile ? 40 : 48) + 60);

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">
        Gallery Performance
      </h3>

      {!hasData ? (
        <div className="flex h-[250px] sm:h-[300px] items-center justify-center">
          <p className="text-sm text-primary-400">No gallery data</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#737373', fontSize: isMobile ? 10 : 12 }}
              axisLine={{ stroke: '#d4d4d4' }}
              tickLine={false}
              tickFormatter={currencyFormatter}
            />
            <YAxis
              type="category"
              dataKey="gallery"
              width={isMobile ? 80 : 140}
              tick={{ fill: '#404040', fontSize: isMobile ? 10 : 12 }}
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
              barSize={isMobile ? 18 : 24}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
