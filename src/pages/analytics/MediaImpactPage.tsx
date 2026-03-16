// ---------------------------------------------------------------------------
// NOA Inventory -- Media Impact Tracker
// Press coverage correlation with sales lift
// ---------------------------------------------------------------------------

import { useMediaImpact } from '../../hooks/useMediaImpact';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#f5a623', '#7c3aed', '#059669'];

function impactColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function liftColor(lift: number | null): string {
  if (lift == null) return '#94a3b8';
  if (lift >= 50) return '#10b981';
  if (lift >= 0) return '#f59e0b';
  return '#ef4444';
}

export function MediaImpactPage() {
  const { data, loading } = useMediaImpact();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!data || data.publications.length === 0) {
    return <div className="py-20 text-center text-primary-500">No publication data available.</div>;
  }

  const topCountryName = data.topCountries[0]?.country ?? '—';

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">Media Impact Tracker</h1>
        <p className="mt-1 text-sm text-primary-500">Press coverage and its correlation with sales lift.</p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Total Publications" value={data.totalPublications} />
        <KpiBox
          label="Avg Sales Lift"
          value={`${data.avgSalesLift > 0 ? '+' : ''}${data.avgSalesLift}%`}
          color={liftColor(data.avgSalesLift)}
        />
        <KpiBox
          label="Avg Impact Score"
          value={data.avgImpactScore}
          color={impactColor(data.avgImpactScore)}
        />
        <KpiBox label="Top Country" value={topCountryName} />
      </div>

      <div className="space-y-6">
        {/* Yearly Publication Count */}
        {data.yearlyPublicationCount.length > 1 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Publications by Year</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.yearlyPublicationCount}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Publications" fill="#1a1a2e" radius={[4, 4, 0, 0]}>
                  {data.yearlyPublicationCount.map((_, i) => (
                    <rect key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Publications Table */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Publication Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  <th className="pb-3 pr-4">Title</th>
                  <th className="pb-3 pr-4">Year</th>
                  <th className="pb-3 pr-4">Institution</th>
                  <th className="pb-3 pr-4">Country</th>
                  <th className="pb-3 pr-4 text-right">Sales (90d)</th>
                  <th className="pb-3 pr-4 text-right">Revenue (90d)</th>
                  <th className="pb-3 pr-4 text-right">Sales Lift</th>
                  <th className="pb-3 text-right">Impact Score</th>
                </tr>
              </thead>
              <tbody>
                {data.publications.map((p) => (
                  <tr key={p.milestoneId} className="border-b border-primary-100 hover:bg-primary-50">
                    <td className="py-3 pr-4 font-medium text-primary-900">{p.title}</td>
                    <td className="py-3 pr-4 text-primary-600">{p.year}</td>
                    <td className="py-3 pr-4 text-primary-600">{p.institution || '—'}</td>
                    <td className="py-3 pr-4 text-primary-600">{p.country || '—'}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{p.salesInFollowing90Days}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{formatCurrency(p.revenueInFollowing90Days, 'CHF')}</td>
                    <td
                      className="py-3 pr-4 text-right font-medium"
                      style={{ color: liftColor(p.salesLift) }}
                    >
                      {p.salesLift != null ? `${p.salesLift > 0 ? '+' : ''}${p.salesLift}%` : '—'}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className="inline-block min-w-[2.5rem] rounded-full px-2 py-0.5 text-center text-xs font-bold text-white"
                        style={{ backgroundColor: impactColor(p.impactScore) }}
                      >
                        {p.impactScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Top Countries */}
        {data.topCountries.length > 0 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Publications by Country</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.topCountries.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis dataKey="country" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" name="Publications" fill="#0f3460" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  );
}

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: color || undefined }}>{value}</p>
    </Card>
  );
}
