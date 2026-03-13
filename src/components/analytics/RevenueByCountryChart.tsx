// ---------------------------------------------------------------------------
// RevenueByCountryChart -- Vertical bar chart of revenue by country
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
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

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);
  return isMobile;
}

export interface RevenueByCountryChartProps {
  data: { country: string; revenue: number }[];
}

function currencyFormatter(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function RevenueByCountryChart({ data }: RevenueByCountryChartProps) {
  const isMobile = useIsMobile();
  const hasData = data.length > 0;

  return (
    <Card className="overflow-hidden p-4 sm:p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">
        Revenue by Country
      </h3>

      {!hasData ? (
        <div className="flex h-[250px] sm:h-[400px] items-center justify-center">
          <p className="text-sm text-primary-400">No country data</p>
        </div>
      ) : (
        <div className="min-h-[250px] overflow-x-auto">
        <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 4, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
            <XAxis
              dataKey="country"
              tick={{ fill: '#404040', fontSize: isMobile ? 10 : 12 }}
              axisLine={{ stroke: '#d4d4d4' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#737373', fontSize: isMobile ? 10 : 12 }}
              axisLine={{ stroke: '#d4d4d4' }}
              tickLine={false}
              tickFormatter={currencyFormatter}
            />
            <Tooltip
              formatter={(value: number) => [currencyFormatter(value), 'Revenue']}
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
              radius={[4, 4, 0, 0]}
              barSize={isMobile ? 24 : 40}
            />
          </BarChart>
        </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
