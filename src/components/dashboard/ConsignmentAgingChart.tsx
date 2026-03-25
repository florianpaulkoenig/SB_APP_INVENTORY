import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';
import type { InventoryAgingData } from '../../hooks/useDashboardAnalytics';

const BUCKET_COLORS = ['#22c55e', '#f59e0b', '#f97316', '#ef4444'];

const chfFmt = new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function ConsignmentAgingChart({ data }: { data: InventoryAgingData }) {
  const navigate = useNavigate();

  if (data.totalConsigned === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Consignment Aging</h3>
        <p className="text-sm text-primary-400">No artworks on consignment.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Consignment Aging</h3>

      {/* KPI row */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-primary-50/50 p-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Consigned</p>
          <p className="mt-1 font-display text-lg font-bold text-primary-900">{data.totalConsigned}</p>
        </div>
        <div className="rounded-lg bg-primary-50/50 p-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Total Value</p>
          <p className="mt-1 font-display text-lg font-bold text-primary-900">{formatCurrency(data.totalConsignedValue, 'CHF')}</p>
        </div>
        <div className="rounded-lg bg-primary-50/50 p-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Avg Days</p>
          <p className="mt-1 font-display text-lg font-bold text-primary-900">{data.avgDaysConsigned}d</p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data.buckets} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#737373', fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fill: '#737373', fontSize: 12 }} />
          <Tooltip
            formatter={(value: number, name: string, props: { payload: { totalValue: number } }) => [
              name === 'count' ? `${value} artworks (${chfFmt.format(props.payload.totalValue)})` : chfFmt.format(value),
              name === 'count' ? 'Artworks' : 'Value',
            ]}
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13 }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
            {data.buckets.map((_entry, idx) => (
              <Cell key={idx} fill={BUCKET_COLORS[idx] ?? '#a3a3a3'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Stale inventory */}
      {data.staleArtworks.length > 0 && (
        <>
          <h4 className="mb-2 mt-4 text-sm font-semibold text-red-600">
            Stale Inventory ({data.staleArtworks.length} artworks &gt; 180 days)
          </h4>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-primary-100">
                  <th className="pb-1 pr-2 font-medium text-primary-400">Artwork</th>
                  <th className="pb-1 pr-2 font-medium text-primary-400">Gallery</th>
                  <th className="pb-1 pr-2 text-right font-medium text-primary-400">Days</th>
                  <th className="pb-1 font-medium text-primary-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-50">
                {data.staleArtworks.map((a) => (
                  <tr key={a.id} className="hover:bg-primary-50/50">
                    <td className="max-w-[120px] truncate py-1.5 pr-2 text-primary-900">{a.title}</td>
                    <td className="py-1.5 pr-2 text-primary-600">{a.galleryName}</td>
                    <td className="py-1.5 pr-2 text-right font-medium text-red-600">{a.daysConsigned}d</td>
                    <td className="py-1.5">
                      <button
                        type="button"
                        onClick={() => navigate('/forwarding')}
                        className="text-accent hover:text-accent-dark text-xs font-medium"
                      >
                        Forward
                      </button>
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
