// ---------------------------------------------------------------------------
// RecentSalesTable -- Small table showing recent sales
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { Card } from '../ui/Card';
import { formatCurrency, formatDate } from '../../lib/utils';

export interface RecentSalesTableProps {
  sales: {
    id: string;
    artwork_title: string;
    sale_price: number;
    currency: string;
    sale_date: string;
    gallery_name: string | null;
    buyer_name: string | null;
  }[];
}

export function RecentSalesTable({ sales }: RecentSalesTableProps) {
  const displayed = useMemo(
    () =>
      [...sales]
        .sort(
          (a, b) =>
            new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime(),
        )
        .slice(0, 10),
    [sales],
  );

  const hasData = displayed.length > 0;

  return (
    <Card className="p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">
        Recent Sales
      </h3>

      {!hasData ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-primary-400">No recent sales</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-primary-100">
                <th className="pb-2 pr-4 text-xs font-medium uppercase tracking-wider text-primary-400">
                  Artwork
                </th>
                <th className="pb-2 pr-4 text-xs font-medium uppercase tracking-wider text-primary-400">
                  Gallery
                </th>
                <th className="pb-2 pr-4 text-xs font-medium uppercase tracking-wider text-primary-400">
                  Buyer
                </th>
                <th className="pb-2 pr-4 text-right text-xs font-medium uppercase tracking-wider text-primary-400">
                  Price
                </th>
                <th className="pb-2 text-xs font-medium uppercase tracking-wider text-primary-400">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-primary-50 transition-colors hover:bg-primary-50/50"
                >
                  <td className="py-2.5 pr-4 font-medium text-primary-900">
                    {sale.artwork_title}
                  </td>
                  <td className="py-2.5 pr-4 text-primary-600">
                    {sale.gallery_name ?? '\u2014'}
                  </td>
                  <td className="py-2.5 pr-4 text-primary-600">
                    {sale.buyer_name ?? '\u2014'}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-medium text-primary-900">
                    {formatCurrency(sale.sale_price, sale.currency)}
                  </td>
                  <td className="py-2.5 text-primary-600">
                    {formatDate(sale.sale_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
