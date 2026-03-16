// ---------------------------------------------------------------------------
// NOA Inventory -- Career Trajectory Dashboard (Dashboard 12)
// Timeline, milestones, cumulative growth
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useCareerTrajectory } from '../../hooks/useCareerTrajectory';
import { useMediaImpact } from '../../hooks/useMediaImpact';
import { useInstitutionalStrategy } from '../../hooks/useInstitutionalStrategy';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';

const COLORS = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560', '#f5a623', '#7c3aed', '#059669'];

const TYPE_LABELS: Record<string, string> = {
  exhibition: 'Exhibition',
  museum_show: 'Museum Show',
  publication: 'Publication',
  award: 'Award',
  institutional: 'Institutional',
  collection: 'Collection',
  fair: 'Art Fair',
};

// ---------------------------------------------------------------------------
// Media Impact helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Institutional Strategy helpers
// ---------------------------------------------------------------------------

const INST_TYPE_COLORS: Record<string, string> = {
  museum: '#1a1a2e',
  foundation: '#533483',
  corporate: '#0f3460',
  university: '#059669',
  government: '#e94560',
  other: '#94a3b8',
};

function statusVariant(status: 'strong' | 'developing' | 'gap') {
  if (status === 'strong') return 'success' as const;
  if (status === 'developing') return 'warning' as const;
  return 'danger' as const;
}

function statusLabel(status: 'strong' | 'developing' | 'gap') {
  if (status === 'strong') return 'Strong';
  if (status === 'developing') return 'Developing';
  return 'Gap';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CareerTrajectoryPage() {
  const { data, loading } = useCareerTrajectory();
  const [showMediaImpact, setShowMediaImpact] = useState(false);
  const [showInstitutional, setShowInstitutional] = useState(false);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!data) {
    return <div className="py-20 text-center text-primary-500">No career data available.</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">Career Trajectory</h1>
        <p className="mt-1 text-sm text-primary-500">Timeline, milestones, and cumulative growth.</p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Years Active" value={data.yearsActive} />
        <KpiBox label="Total Milestones" value={data.totalMilestones} />
        <KpiBox label="Exhibitions" value={data.totalExhibitions} />
        <KpiBox label="Total Revenue" value={formatCurrency(data.totalRevenue, 'CHF')} />
      </div>

      <div className="space-y-6">
        {/* Cumulative Growth */}
        {data.yearlyGrowth.length > 1 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Cumulative Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.yearlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="revenue" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number, name: string) =>
                  name.includes('Revenue') ? formatCurrency(v, 'CHF') : v
                } />
                <Legend />
                <Line yAxisId="revenue" type="monotone" dataKey="cumulativeRevenue" name="Cumulative Revenue" stroke="#1a1a2e" strokeWidth={2} />
                <Line yAxisId="count" type="monotone" dataKey="cumulativeSales" name="Cumulative Sales" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Activity by year */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Activity by Year</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.yearlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="#1a1a2e" />
                <Bar dataKey="exhibitions" name="Exhibitions" fill="#0f3460" />
                <Bar dataKey="milestones" name="Milestones" fill="#e94560" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Milestones by type */}
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Milestones by Type</h3>
            {data.milestonesByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={data.milestonesByType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={100}
                    label={(e) => `${TYPE_LABELS[e.type] || e.type} (${e.count})`}>
                    {data.milestonesByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, _: string, props: { payload: { type: string } }) =>
                    [v, TYPE_LABELS[props.payload.type] || props.payload.type]
                  } />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-primary-500 py-10">No milestones recorded.</p>
            )}
          </Card>
        </div>

        {/* Milestones by Country */}
        {data.milestonesByCountry.length > 0 && (
          <Card className="p-6">
            <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Milestones by Country</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.milestonesByCountry.slice(0, 12)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="country" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" name="Milestones" fill="#533483" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Milestone Timeline */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Milestone Timeline</h3>
          {data.milestones.length > 0 ? (
            <div className="space-y-3">
              {data.milestones.slice(0, 30).map((m) => (
                <div key={m.id} className="flex items-start gap-4 border-b border-primary-100 pb-3">
                  <span className="shrink-0 w-12 text-right font-bold text-primary-900">{m.year}</span>
                  <div className="flex-1">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mr-2 capitalize"
                      style={{ backgroundColor: COLORS[Object.keys(TYPE_LABELS).indexOf(m.type) % COLORS.length] + '20',
                               color: COLORS[Object.keys(TYPE_LABELS).indexOf(m.type) % COLORS.length] }}>
                      {TYPE_LABELS[m.type] || m.type}
                    </span>
                    <span className="font-medium text-primary-900">{m.title}</span>
                    {m.institution && <span className="text-primary-500 ml-2">— {m.institution}</span>}
                    {m.city && <span className="text-primary-400 ml-1">({m.city}{m.country ? `, ${m.country}` : ''})</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-primary-500 py-10">No milestones recorded yet.</p>
          )}
        </Card>

        {/* ----------------------------------------------------------------- */}
        {/* Media Impact (collapsible)                                        */}
        {/* ----------------------------------------------------------------- */}
        <Card
          className="cursor-pointer select-none p-5"
          onClick={() => setShowMediaImpact((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-primary-900">Media Impact</h3>
            <svg
              className={`h-5 w-5 text-primary-500 transition-transform ${showMediaImpact ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </Card>
        {showMediaImpact && <MediaImpactSection />}

        {/* ----------------------------------------------------------------- */}
        {/* Institutional Placements (collapsible)                            */}
        {/* ----------------------------------------------------------------- */}
        <Card
          className="cursor-pointer select-none p-5"
          onClick={() => setShowInstitutional((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-primary-900">Institutional Placements</h3>
            <svg
              className={`h-5 w-5 text-primary-500 transition-transform ${showInstitutional ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </Card>
        {showInstitutional && <InstitutionalSection />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Media Impact Section (embedded)
// ---------------------------------------------------------------------------

function MediaImpactSection() {
  const { data, loading } = useMediaImpact();

  if (loading) {
    return <div className="flex items-center justify-center py-10"><LoadingSpinner size="lg" /></div>;
  }

  if (!data || data.publications.length === 0) {
    return <div className="py-10 text-center text-primary-500">No publication data available.</div>;
  }

  const topCountryName = data.topCountries[0]?.country ?? '—';

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
  );
}

// ---------------------------------------------------------------------------
// Institutional Placements Section (embedded)
// ---------------------------------------------------------------------------

function InstitutionalSection() {
  const { data, loading } = useInstitutionalStrategy();

  if (loading) {
    return <div className="flex items-center justify-center py-10"><LoadingSpinner size="lg" /></div>;
  }

  if (!data || data.placements.length === 0) {
    return <div className="py-10 text-center text-primary-500">No institutional placement data available.</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Total Institutions" value={data.totalInstitutions} />
        <KpiBox label="Artworks Placed" value={data.totalArtworksPlaced} />
        <KpiBox
          label="Placement Velocity"
          value={`${data.placementVelocity}/yr`}
          color="#7c3aed"
        />
        <KpiBox
          label="Countries"
          value={data.countryDistribution.length}
          color="#0f3460"
        />
      </div>

      {/* Type Distribution */}
      <Card className="p-6">
        <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
          Distribution by Institution Type
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {data.typeDistribution.map((t) => (
            <div
              key={t.type}
              className="rounded-lg border border-primary-100 p-4 text-center"
            >
              <span
                className="mb-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: INST_TYPE_COLORS[t.type] ?? '#94a3b8' }}
              >
                {t.type}
              </span>
              <p className="text-2xl font-bold text-primary-900">{t.count}</p>
              <p className="text-xs text-primary-500">{t.percentage}%</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Gap Analysis + Country Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Gap Analysis */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
            Placement Gap Analysis
          </h3>
          <div className="space-y-3">
            {data.gaps.map((g) => (
              <div
                key={g.category}
                className="flex items-center justify-between rounded-lg border border-primary-100 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-primary-900 capitalize">
                    {g.category}
                  </p>
                  <p className="text-xs text-primary-500">
                    Target: {g.target}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-primary-900">
                    {g.current}
                  </span>
                  <Badge variant={statusVariant(g.status)}>
                    {statusLabel(g.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Country Distribution */}
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
            Geographic Distribution
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  <th className="pb-3 pr-4">Country</th>
                  <th className="pb-3 pr-4 text-right">Institutions</th>
                  <th className="pb-3">Names</th>
                </tr>
              </thead>
              <tbody>
                {data.countryDistribution.map((c) => (
                  <tr
                    key={c.country}
                    className="border-b border-primary-100 hover:bg-primary-50"
                  >
                    <td className="py-3 pr-4 font-medium text-primary-900">
                      {c.country}
                    </td>
                    <td className="py-3 pr-4 text-right text-primary-700">
                      {c.count}
                    </td>
                    <td className="py-3 text-primary-600 text-xs">
                      {c.institutions.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Recent Placements (last 2 years) */}
      {data.recentPlacements.length > 0 && (
        <Card className="p-6">
          <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
            Recent Placements (Last 2 Years)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  <th className="pb-3 pr-4">Institution</th>
                  <th className="pb-3 pr-4">Type</th>
                  <th className="pb-3 pr-4">City</th>
                  <th className="pb-3 pr-4">Country</th>
                  <th className="pb-3 pr-4 text-right">Artworks</th>
                  <th className="pb-3 text-right">Latest Year</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPlacements.map((p) => (
                  <tr
                    key={p.collectionId}
                    className="border-b border-primary-100 hover:bg-primary-50"
                  >
                    <td className="py-3 pr-4 font-medium text-primary-900">
                      {p.collectionName}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                        style={{ backgroundColor: INST_TYPE_COLORS[p.institutionType ?? 'other'] ?? '#94a3b8' }}
                      >
                        {p.institutionType ?? 'other'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-primary-600">
                      {p.city ?? '—'}
                    </td>
                    <td className="py-3 pr-4 text-primary-600">
                      {p.country ?? '—'}
                    </td>
                    <td className="py-3 pr-4 text-right text-primary-700">
                      {p.artworkCount}
                    </td>
                    <td className="py-3 text-right text-primary-700">
                      {p.latestAcquisitionYear ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Full Placements Table */}
      <Card className="p-6">
        <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
          All Institutional Placements
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                <th className="pb-3 pr-4">Institution</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">City</th>
                <th className="pb-3 pr-4">Country</th>
                <th className="pb-3 pr-4 text-right">Artworks</th>
                <th className="pb-3 text-right">Latest Year</th>
              </tr>
            </thead>
            <tbody>
              {data.placements.map((p) => (
                <tr
                  key={p.collectionId}
                  className="border-b border-primary-100 hover:bg-primary-50"
                >
                  <td className="py-3 pr-4 font-medium text-primary-900">
                    {p.collectionName}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: INST_TYPE_COLORS[p.institutionType ?? 'other'] ?? '#94a3b8' }}
                    >
                      {p.institutionType ?? 'other'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-primary-600">
                    {p.city ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-primary-600">
                    {p.country ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-right text-primary-700">
                    {p.artworkCount}
                  </td>
                  <td className="py-3 text-right text-primary-700">
                    {p.latestAcquisitionYear ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared KPI Box
// ---------------------------------------------------------------------------

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: color || undefined }}>{value}</p>
    </Card>
  );
}
