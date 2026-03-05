// ---------------------------------------------------------------------------
// SalesOverTimeChart -- Monthly sales revenue (bars) & count (line)
// ---------------------------------------------------------------------------

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
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function SalesOverTimeChart({ data }: SalesOverTimeChartProps) {
  const hasData = data.length > 0;

  return (
    <Card className="p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">
        Sales Over Time
      </h3>

      {!hasData ? (
        <div className="flex h-[400px] items-center justify-center">
          <p className="text-sm text-primary-400">No sales data</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
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
