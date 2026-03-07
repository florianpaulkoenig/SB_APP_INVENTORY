import { Card } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';
import type { ExhibitionImpact } from '../../hooks/useDashboardAnalytics';

export function ExhibitionImpactTable({ data }: { data: ExhibitionImpact[] }) {
  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Exhibition Impact</h3>
        <p className="text-sm text-primary-400">No exhibition data yet.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Exhibition Impact</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-primary-100">
              <th className="pb-2 pr-4 font-medium text-primary-400">Exhibition</th>
              <th className="hidden pb-2 pr-2 font-medium text-primary-400 sm:table-cell">Venue</th>
              <th className="hidden pb-2 pr-2 font-medium text-primary-400 md:table-cell">Dates</th>
              <th className="pb-2 pr-2 text-center font-medium text-primary-400">Works</th>
              <th className="pb-2 pr-2 text-center font-medium text-primary-400">Direct</th>
              <th className="hidden pb-2 pr-2 text-center font-medium text-primary-400 sm:table-cell">Attributed</th>
              <th className="pb-2 pr-2 text-right font-medium text-primary-400">Revenue</th>
              <th className="hidden pb-2 pr-2 text-right font-medium text-primary-400 md:table-cell">Budget</th>
              <th className="pb-2 text-right font-medium text-primary-400">ROI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-50">
            {data.map((exh) => (
              <tr key={exh.exhibitionId} className="hover:bg-primary-50/50">
                <td className="max-w-[140px] truncate py-2 pr-4 font-semibold text-primary-900">{exh.title}</td>
                <td className="hidden py-2 pr-2 text-primary-600 sm:table-cell">{exh.venue ?? '\u2014'}</td>
                <td className="hidden py-2 pr-2 text-xs text-primary-500 md:table-cell">{exh.dates}</td>
                <td className="py-2 pr-2 text-center text-primary-600">{exh.artworksShown}</td>
                <td className="py-2 pr-2 text-center text-primary-600">{exh.directSales}</td>
                <td className="hidden py-2 pr-2 text-center text-primary-600 sm:table-cell">{exh.attributedSales}</td>
                <td className="py-2 pr-2 text-right font-medium text-emerald-600">
                  {exh.totalRevenue > 0 ? formatCurrency(exh.totalRevenue, 'CHF') : '\u2014'}
                </td>
                <td className="hidden py-2 pr-2 text-right text-primary-600 md:table-cell">
                  {exh.budget > 0 ? formatCurrency(exh.budget, 'CHF') : '\u2014'}
                </td>
                <td className="py-2 text-right">
                  {exh.roi !== null ? (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      exh.roi >= 100 ? 'bg-emerald-100 text-emerald-800' :
                      exh.roi >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {exh.roi.toFixed(0)}%
                    </span>
                  ) : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-primary-400">
        Direct = sold within 90 days of exhibition end. Attributed = collector mentioned this exhibition as source.
      </p>
    </Card>
  );
}
