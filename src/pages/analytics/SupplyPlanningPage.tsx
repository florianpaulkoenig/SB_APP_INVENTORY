// ---------------------------------------------------------------------------
// NOA Inventory -- Supply Planning Dashboard (Dashboard 10)
// Production vs sales, release calendar, supply-demand gap
// ---------------------------------------------------------------------------

import { useSupplyPlanning } from '../../hooks/useSupplyPlanning';
import { useProductionRecommendations } from '../../hooks/useProductionRecommendations';
import type { ProductionRecommendation } from '../../hooks/useProductionRecommendations';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#f5a623', '#7c3aed', '#059669'];

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  pending: '#f59e0b',
  in_production: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
  delivered: '#059669',
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  high: { bg: '#ef444420', text: '#ef4444' },
  medium: { bg: '#f59e0b20', text: '#f59e0b' },
  low: { bg: '#94a3b820', text: '#94a3b8' },
};

const STATUS_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  understocked: { bg: '#ef444420', text: '#ef4444' },
  balanced: { bg: '#10b98120', text: '#10b981' },
  overstocked: { bg: '#3b82f620', text: '#3b82f6' },
};

export function SupplyPlanningPage() {
  const { data, loading } = useSupplyPlanning();
  const { data: recData, loading: recLoading } = useProductionRecommendations();

  if (loading && recLoading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!data && !recData) {
    return <div className="py-20 text-center text-primary-500">No supply planning data available.</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">Supply Planning</h1>
        <p className="mt-1 text-sm text-primary-500">Production vs sales, release calendar, and supply-demand balance.</p>
      </div>

      {/* KPI Row */}
      {data && (
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Total Produced" value={data.totalProduced} />
        <KpiBox label="Total Sold" value={data.totalSold} />
        <KpiBox label="Supply/Demand" value={`${data.supplyDemandRatio}x`}
          color={data.supplyDemandRatio > 3 ? '#ef4444' : data.supplyDemandRatio > 1.5 ? '#f59e0b' : '#10b981'} />
        <KpiBox label="Avg Monthly Sales" value={data.avgMonthlySales} />
      </div>
      )}

      {data && (
      <div className="space-y-6">
        {/* Production vs Sales timeline */}
        {data.monthlyData.length > 0 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Production vs Sales Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="produced" name="Produced" stroke="#1a1a2e" strokeWidth={2} />
                <Line type="monotone" dataKey="sold" name="Sold" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Series production vs sold */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Production by Series</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.seriesProduction} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="series" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="produced" name="Produced" fill="#1a1a2e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="sold" name="Sold" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Production order status */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Order Status</h3>
            {data.statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={data.statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100}
                    label={(e) => `${e.status} (${e.count})`}>
                    {data.statusBreakdown.map((s, i) => (
                      <Cell key={i} fill={STATUS_COLORS[s.status] || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-primary-500 py-10">No production orders.</p>
            )}
          </Card>
        </div>

        {/* Upcoming Releases */}
        {data.upcomingReleases.length > 0 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Upcoming Releases</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                    <th className="pb-3 pr-4">Title</th>
                    <th className="pb-3 pr-4">Planned Release</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcomingReleases.map((r) => (
                    <tr key={r.id} className="border-b border-primary-100 hover:bg-primary-50">
                      <td className="py-3 pr-4 font-medium text-primary-900">{r.title}</td>
                      <td className="py-3 pr-4 text-primary-700">
                        {new Date(r.plannedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3 text-right">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                          style={{ backgroundColor: (STATUS_COLORS[r.status] || '#94a3b8') + '20', color: STATUS_COLORS[r.status] || '#94a3b8' }}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Supply-Demand Gap */}
        {data.monthlyData.length > 0 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Supply-Demand Gap (Produced − Sold)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="gap" name="Gap">
                  {data.monthlyData.map((d, i) => (
                    <Cell key={i} fill={d.gap >= 0 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Production Recommendations Section                                 */}
      {/* ------------------------------------------------------------------ */}

      <div className="mt-10">
        <h2 className="font-display text-xl font-bold text-primary-900 mb-1">Production Recommendations</h2>
        <p className="text-sm text-primary-500 mb-6">Demand-driven suggestions for what to produce next.</p>

        {recLoading ? (
          <div className="flex items-center justify-center py-10"><LoadingSpinner size="md" /></div>
        ) : recData ? (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiBox label="Total Recommendations" value={recData.recommendations.length} />
              <KpiBox label="High Priority" value={recData.highPriorityCount} color={recData.highPriorityCount > 0 ? '#ef4444' : '#10b981'} />
              <KpiBox label="Total Qty Recommended" value={recData.totalRecommended} />
              <KpiBox label="Series Tracked" value={recData.seriesHealth.length} />
            </div>

            {/* Recommendations table */}
            {recData.recommendations.length > 0 && (
              <Card className="p-6">
                <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Recommendations</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                        <th className="pb-3 pr-4">Series</th>
                        <th className="pb-3 pr-4">Size</th>
                        <th className="pb-3 pr-4 text-right">Rec. Qty</th>
                        <th className="pb-3 pr-4">Priority</th>
                        <th className="pb-3 pr-4">Target Gallery</th>
                        <th className="pb-3 pr-4">Demand Signals</th>
                        <th className="pb-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recData.recommendations.map((r: ProductionRecommendation, i: number) => {
                        const ps = PRIORITY_STYLES[r.priority];
                        return (
                          <tr key={i} className="border-b border-primary-100 hover:bg-primary-50">
                            <td className="py-3 pr-4 font-medium text-primary-900">{r.series}</td>
                            <td className="py-3 pr-4 text-primary-700">{r.sizeCategory ?? '—'}</td>
                            <td className="py-3 pr-4 text-right font-medium text-primary-900">{r.recommendedQuantity}</td>
                            <td className="py-3 pr-4">
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                                style={{ backgroundColor: ps.bg, color: ps.text }}>
                                {r.priority}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-primary-700">{r.targetGallery ?? '—'}</td>
                            <td className="py-3 pr-4 text-xs text-primary-600">
                              <span title="Sales (6m)">{r.demandSignals.recentSales}s</span>
                              {' / '}
                              <span title="Enquiries">{r.demandSignals.activeEnquiries}e</span>
                              {' / '}
                              <span title="Wish list">{r.demandSignals.wishListCount}w</span>
                              {' / '}
                              <span title="Stock">{r.demandSignals.currentStock}stk</span>
                              {' / '}
                              <span title="Pending production">{r.demandSignals.galleryRequests}prod</span>
                            </td>
                            <td className="py-3 text-primary-600 text-xs">{r.reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Series Health Overview */}
            {recData.seriesHealth.length > 0 && (
              <Card className="p-6">
                <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Series Health Overview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                        <th className="pb-3 pr-4">Series</th>
                        <th className="pb-3 pr-4 text-right">Available</th>
                        <th className="pb-3 pr-4 text-right">Sold (6m)</th>
                        <th className="pb-3 pr-4 text-right">Enquiries</th>
                        <th className="pb-3 pr-4 text-right">Supply/Demand</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recData.seriesHealth.map((sh) => {
                        const ss = STATUS_BADGE_STYLES[sh.status];
                        return (
                          <tr key={sh.series} className="border-b border-primary-100 hover:bg-primary-50">
                            <td className="py-3 pr-4 font-medium text-primary-900">{sh.series}</td>
                            <td className="py-3 pr-4 text-right text-primary-700">{sh.available}</td>
                            <td className="py-3 pr-4 text-right text-primary-700">{sh.sold6m}</td>
                            <td className="py-3 pr-4 text-right text-primary-700">{sh.enquiries}</td>
                            <td className="py-3 pr-4 text-right text-primary-700">{sh.supplyDemandRatio}x</td>
                            <td className="py-3 text-right">
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                                style={{ backgroundColor: ss.bg, color: ss.text }}>
                                {sh.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <p className="text-center text-primary-500 py-10">No recommendation data available.</p>
        )}
      </div>
    </div>
  );
}

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${!color ? 'text-primary-900' : ''}`} style={color ? { color } : undefined}>{value}</p>
    </Card>
  );
}
