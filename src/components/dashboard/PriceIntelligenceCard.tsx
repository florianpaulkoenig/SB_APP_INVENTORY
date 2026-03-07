import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';
import type { PriceIntelligenceData } from '../../hooks/useDashboardAnalytics';

function discountColor(pct: number): string {
  if (pct <= 5) return '#22c55e';
  if (pct <= 15) return '#f59e0b';
  return '#ef4444';
}

export function PriceIntelligenceCard({ data }: { data: PriceIntelligenceData }) {
  if (data.galleryDiscounts.length === 0 && data.recentDiscounted.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Price Intelligence</h3>
        <p className="text-sm text-primary-400">No price comparison data yet.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Price Intelligence</h3>

      {/* KPI row */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-primary-50/50 p-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Avg Discount</p>
          <p className={`mt-1 font-display text-lg font-bold ${data.avgDiscountRate <= 5 ? 'text-emerald-600' : data.avgDiscountRate <= 15 ? 'text-amber-600' : 'text-red-500'}`}>
            {data.avgDiscountRate.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg bg-primary-50/50 p-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">At List Price</p>
          <p className="mt-1 font-display text-lg font-bold text-emerald-600">{data.atListPricePercent.toFixed(0)}%</p>
        </div>
      </div>

      {/* Per-gallery discount chart */}
      {data.galleryDiscounts.length > 0 && (
        <>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary-500">Avg Discount by Gallery</h4>
          <ResponsiveContainer width="100%" height={Math.max(120, data.galleryDiscounts.length * 36 + 40)}>
            <BarChart data={data.galleryDiscounts} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v: number) => `${v.toFixed(0)}%`} tick={{ fill: '#737373', fontSize: 12 }} />
              <YAxis type="category" dataKey="galleryName" width={100} tick={{ fill: '#737373', fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Avg Discount']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13 }}
              />
              <Bar dataKey="avgDiscount" radius={[0, 4, 4, 0]} barSize={20}>
                {data.galleryDiscounts.map((entry) => (
                  <Cell key={entry.galleryId} fill={discountColor(entry.avgDiscount)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {/* Recent discounted sales */}
      {data.recentDiscounted.length > 0 && (
        <>
          <h4 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-primary-500">Recent Discounted Sales</h4>
          <div className="max-h-40 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-primary-100">
                  <th className="pb-1 pr-2 font-medium text-primary-400">Artwork</th>
                  <th className="pb-1 pr-2 text-right font-medium text-primary-400">List</th>
                  <th className="pb-1 pr-2 text-right font-medium text-primary-400">Sold</th>
                  <th className="pb-1 text-right font-medium text-primary-400">Disc.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-50">
                {data.recentDiscounted.map((s, i) => (
                  <tr key={i}>
                    <td className="max-w-[100px] truncate py-1 pr-2 text-primary-900">{s.title}</td>
                    <td className="py-1 pr-2 text-right text-primary-500">{formatCurrency(s.listPrice, 'CHF')}</td>
                    <td className="py-1 pr-2 text-right text-primary-900">{formatCurrency(s.salePrice, 'CHF')}</td>
                    <td className="py-1 text-right">
                      <span className={`font-medium ${s.discount <= 5 ? 'text-emerald-600' : s.discount <= 15 ? 'text-amber-600' : 'text-red-500'}`}>
                        {s.discount.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
