import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';
import type { SalesFunnelData } from '../../hooks/useDashboardAnalytics';

const STAGE_COLORS: Record<string, string> = {
  lead: '#e5d5b0', contacted: '#d4bf8a', quoted: '#c9a96e',
  negotiating: '#b08d4a', sold: '#22c55e', lost: '#a3a3a3',
};

export function SalesFunnelChart({ data }: { data: SalesFunnelData }) {
  if (data.stages.every((s) => s.count === 0)) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Sales Pipeline</h3>
        <p className="text-sm text-primary-400">No deals in pipeline yet.</p>
      </Card>
    );
  }

  // Filter out stages with 0 count except sold/lost to keep them visible
  const chartData = data.stages.filter((s) => s.count > 0 || s.stage === 'sold' || s.stage === 'lost');

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="mb-2 font-display text-lg font-semibold text-primary-900">Sales Pipeline</h3>

      {/* Pipeline KPI */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-primary-400">Pipeline Value: </span>
          <span className="font-semibold text-primary-900">{formatCurrency(data.totalPipelineValue, 'CHF')}</span>
        </div>
        <div>
          <span className="text-primary-400">Lead → Sold: </span>
          <span className="font-semibold text-primary-900">{data.overallConversion.toFixed(0)}%</span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 48 + 40)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis type="number" allowDecimals={false} tick={{ fill: '#737373', fontSize: 12 }} />
          <YAxis type="category" dataKey="label" width={90} tick={{ fill: '#737373', fontSize: 12 }} />
          <Tooltip
            formatter={(value: number, _name: string, props: { payload: { totalValue: number } }) => [
              `${value} deals (${formatCurrency(props.payload.totalValue, 'CHF')})`,
              'Count',
            ]}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13 }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
            {chartData.map((entry) => (
              <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? '#c9a96e'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Conversion rates */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-primary-400">
        {data.stages.filter((s) => s.conversionRate > 0 && s.stage !== 'lost').map((s) => (
          <span key={s.stage}>{s.label} → {s.conversionRate.toFixed(0)}%</span>
        ))}
      </div>
    </Card>
  );
}
