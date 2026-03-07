// ---------------------------------------------------------------------------
// SalesOverTimeChart -- Monthly sales revenue (bars) & count (line)
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '../ui/Card';

export interface SalesOverTimeChartProps {
  data: { month: string; revenue: number; count: number }[];
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

export function SalesOverTimeChart({ data }: SalesOverTimeChartProps) {
  const isMobile = useIsMobile();
  const hasData = data.length > 0;

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">
        Sales Over Time
      </h3>

      {!hasData ? (
        <div className="flex h-[250px] sm:h-[400px] items-center justify-center">
          <p className="text-sm text-primary-400">No sales data</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="month"
              tick={{ fill: '#737373', fontSize: 12 }}
              axisLine={{ stroke: '#d4d4d4' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="revenue"
              orientation="left"
              tick={{ fill: '#737373', fontSize: 12 }}
              axisLine={{ stroke: '#d4d4d4' }}
              tickLine={false}
              tickFormatter={currencyFormatter}
            />
            <YAxis
              yAxisId="count"
              orientation="right"
              tick={{ fill: '#737373', fontSize: 12 }}
              axisLine={{ stroke: '#d4d4d4' }}
              tickLine={false}
              allowDecimals={false}
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
            <Legend
              wrapperStyle={{ fontSize: 13, color: '#737373' }}
            />
            <Bar
              yAxisId="revenue"
              dataKey="revenue"
              name="Revenue"
              fill="#c9a96e"
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="count"
              name="Count"
              stroke="#a3a3a3"
              strokeWidth={2}
              dot={{ fill: '#a3a3a3', r: 4 }}
              activeDot={{ r: 6, fill: '#737373' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
