// ---------------------------------------------------------------------------
// CategoryBreakdownChart -- Donut chart of artworks by category
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from 'recharts';
import { Card } from '../ui/Card';

export interface CategoryBreakdownChartProps {
  data: { category: string; count: number }[];
}

// Muted gallery-style palette for categories
const CATEGORY_COLORS = [
  '#c9a96e', // gold accent
  '#7c9885', // sage green
  '#8b7e9b', // muted purple
  '#b08d4a', // dark gold
  '#6b8fa3', // steel blue
  '#c47f6e', // terracotta
  '#a3a3a3', // grey
  '#8b6f47', // warm brown
  '#6e8b8b', // teal grey
  '#9b7e7e', // dusty rose
];

const RADIAN = Math.PI / 180;

function renderCustomLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const innerRadius = Number(props.innerRadius ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const percent = Number(props.percent ?? 0);

  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#404040"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  const hasData = data.length > 0;

  const total = useMemo(
    () => data.reduce((sum, d) => sum + d.count, 0),
    [data],
  );

  return (
    <Card className="p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">
        Category Breakdown
      </h3>

      {!hasData ? (
        <div className="flex h-[320px] items-center justify-center">
          <p className="text-sm text-primary-400">No category data</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="category"
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              label={renderCustomLabel}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
                name,
              ]}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e5e5',
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize: 12, color: '#737373' }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
