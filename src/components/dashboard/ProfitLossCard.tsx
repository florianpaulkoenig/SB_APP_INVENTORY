import { Card } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';
import type { ProfitLossSummary } from '../../hooks/useDashboardAnalytics';

export function ProfitLossCard({ data }: { data: ProfitLossSummary }) {
  if (data.topArtworks.length === 0 && data.totalRevenue === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Profit & Loss</h3>
        <p className="text-sm text-primary-400">No sales data yet.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Profit & Loss</h3>

      {/* KPI row */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-primary-50/50 p-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Revenue</p>
          <p className="mt-1 font-display text-lg font-bold text-emerald-600">{formatCurrency(data.totalRevenue, 'CHF')}</p>
        </div>
        <div className="rounded-lg bg-primary-50/50 p-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Expenses</p>
          <p className="mt-1 font-display text-lg font-bold text-red-500">{formatCurrency(data.totalExpenses, 'CHF')}</p>
        </div>
        <div className="rounded-lg bg-primary-50/50 p-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Net Profit</p>
          <p className={`mt-1 font-display text-lg font-bold ${data.totalNetProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatCurrency(data.totalNetProfit, 'CHF')}
          </p>
          <p className="text-xs text-primary-400">{data.avgMargin.toFixed(0)}% avg margin</p>
        </div>
      </div>

      {/* Top artworks table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-primary-100">
              <th className="pb-2 pr-4 font-medium text-primary-400">Artwork</th>
              <th className="pb-2 pr-2 text-right font-medium text-primary-400">Revenue</th>
              <th className="hidden pb-2 pr-2 text-right font-medium text-primary-400 sm:table-cell">Expenses</th>
              <th className="pb-2 pr-2 text-right font-medium text-primary-400">Net</th>
              <th className="pb-2 text-right font-medium text-primary-400">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-50">
            {data.topArtworks.map((a) => (
              <tr key={a.artworkId} className="hover:bg-primary-50/50">
                <td className="max-w-[140px] truncate py-2 pr-4 font-medium text-primary-900">{a.title}</td>
                <td className="py-2 pr-2 text-right text-emerald-600">{formatCurrency(a.revenue, 'CHF')}</td>
                <td className="hidden py-2 pr-2 text-right text-red-500 sm:table-cell">{formatCurrency(a.expenses, 'CHF')}</td>
                <td className={`py-2 pr-2 text-right font-medium ${a.netProfit >= 0 ? 'text-primary-900' : 'text-red-500'}`}>
                  {formatCurrency(a.netProfit, 'CHF')}
                </td>
                <td className="py-2 text-right">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.marginPercent >= 50 ? 'bg-emerald-100 text-emerald-800' :
                    a.marginPercent >= 20 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {a.marginPercent.toFixed(0)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
