import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { CollectorLTV } from '../../hooks/useDashboardAnalytics';

export function CollectorLTVTable({ data }: { data: CollectorLTV[] }) {
  const navigate = useNavigate();

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Top Collectors</h3>
        <p className="text-sm text-primary-400">No collector data yet.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Top Collectors</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-primary-100">
              <th className="pb-2 pr-2 text-center font-medium text-primary-400">#</th>
              <th className="pb-2 pr-4 font-medium text-primary-400">Name</th>
              <th className="hidden pb-2 pr-4 font-medium text-primary-400 sm:table-cell">Country</th>
              <th className="pb-2 pr-2 text-right font-medium text-primary-400">Total Spend</th>
              <th className="hidden pb-2 pr-2 text-center font-medium text-primary-400 sm:table-cell">Purchases</th>
              <th className="hidden pb-2 pr-2 text-right font-medium text-primary-400 md:table-cell">Avg Order</th>
              <th className="hidden pb-2 text-right font-medium text-primary-400 md:table-cell">Last Purchase</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-50">
            {data.map((c, idx) => (
              <tr
                key={c.contactId}
                className="cursor-pointer hover:bg-primary-50/50"
                onClick={() => navigate(`/contacts/${c.contactId}`)}
              >
                <td className="py-2 pr-2 text-center font-bold text-primary-400">{idx + 1}</td>
                <td className="max-w-[160px] truncate py-2 pr-4 font-semibold text-primary-900">{c.name}</td>
                <td className="hidden py-2 pr-4 text-primary-600 sm:table-cell">{c.country ?? '\u2014'}</td>
                <td className="py-2 pr-2 text-right font-medium text-emerald-600">{formatCurrency(c.totalSpend, 'CHF')}</td>
                <td className="hidden py-2 pr-2 text-center text-primary-600 sm:table-cell">{c.purchaseCount}</td>
                <td className="hidden py-2 pr-2 text-right text-primary-600 md:table-cell">{formatCurrency(c.avgOrderValue, 'CHF')}</td>
                <td className="hidden py-2 text-right text-primary-600 md:table-cell">
                  {c.lastPurchaseDate ? formatDate(c.lastPurchaseDate) : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
