import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import type { GeoDistributionData } from '../../hooks/useDashboardAnalytics';

const chfFmt = new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function GeoDistributionChart({ data }: { data: GeoDistributionData }) {
  if (data.salesByCountry.length === 0 && data.collectorsByCountry.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Geographic Distribution</h3>
        <p className="text-sm text-primary-400">No geographic data yet.</p>
      </Card>
    );
  }

  const salesData = data.salesByCountry.slice(0, 8);
  const collectorData = data.collectorsByCountry.slice(0, 8);

  return (
    <Card className="p-4 sm:p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">Geographic Distribution</h3>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Where Sales Occur */}
        {salesData.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary-500">Where Sales Occur</h4>
            <ResponsiveContainer width="100%" height={Math.max(150, salesData.length * 32 + 40)}>
              <BarChart data={salesData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis type="number" tickFormatter={(v: number) => chfFmt.format(v)} tick={{ fill: '#737373', fontSize: 10 }} />
                <YAxis type="category" dataKey="location" width={80} tick={{ fill: '#737373', fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [chfFmt.format(value), 'Revenue']}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13 }}
                />
                <Bar dataKey="revenue" fill="#c9a96e" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Where Collectors Are Based */}
        {collectorData.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary-500">Collector Locations</h4>
            <ResponsiveContainer width="100%" height={Math.max(150, collectorData.length * 32 + 40)}>
              <BarChart data={collectorData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis type="number" tickFormatter={(v: number) => chfFmt.format(v)} tick={{ fill: '#737373', fontSize: 10 }} />
                <YAxis type="category" dataKey="location" width={80} tick={{ fill: '#737373', fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [chfFmt.format(value), 'Revenue']}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 13 }}
                />
                <Bar dataKey="revenue" fill="#7c9885" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
