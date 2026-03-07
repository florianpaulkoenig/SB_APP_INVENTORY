import { useState, useEffect } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import type { CashFlowMonth } from '../../hooks/useDashboardAnalytics';

const chfFmt = new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0, maximumFractionDigits: 0 });

function useIsMobile() {
  const [m, setM] = useState(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

export function CashFlowChart({ data }: { data: CashFlowMonth[] }) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Cash Flow</h3>
        <p className="text-sm text-primary-400">No cash flow data yet.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Cash Flow</h3>

      <ResponsiveContainer width="100%" height={isMobile ? 250 : 360}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="month" tick={{ fill: '#737373', fontSize: isMobile ? 10 : 12 }} />
          <YAxis
            yAxisId="bars"
            tickFormatter={(v: number) => chfFmt.format(v)}
            tick={{ fill: '#737373', fontSize: 12 }}
            width={isMobile ? 60 : 80}
          />
          <YAxis
            yAxisId="line"
            orientation="right"
            tickFormatter={(v: number) => chfFmt.format(v)}
            tick={{ fill: '#737373', fontSize: 12 }}
            width={isMobile ? 60 : 80}
          />
          <Tooltip
            formatter={(value: number, name: string) => [chfFmt.format(value), name]}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="bars" dataKey="cashIn" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={isMobile ? 12 : 20} />
          <Bar yAxisId="bars" dataKey="cashOut" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={isMobile ? 12 : 20} />
          <Line yAxisId="line" type="monotone" dataKey="runningBalance" name="Balance" stroke="#c9a96e" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
