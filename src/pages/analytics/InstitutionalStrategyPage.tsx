// ---------------------------------------------------------------------------
// NOA Inventory -- Institutional Placement Strategy Dashboard
// Type/country distribution, gap analysis, placement velocity
// ---------------------------------------------------------------------------

import { useInstitutionalStrategy } from '../../hooks/useInstitutionalStrategy';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
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

export function InstitutionalStrategyPage() {
  const { data, loading } = useInstitutionalStrategy();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data || data.placements.length === 0) {
    return (
      <div className="py-20 text-center text-primary-500">
        No institutional placement data available.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">
          Institutional Placement Strategy
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Track museum and institutional placements, identify gaps, and monitor placement velocity.
        </p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
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

      <div className="space-y-6">
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
                <Badge
                  className="mb-2"
                  style={{ backgroundColor: TYPE_COLORS[t.type] ?? '#94a3b8', color: '#fff' }}
                >
                  {t.type}
                </Badge>
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
                        <Badge
                          style={{
                            backgroundColor: TYPE_COLORS[p.institutionType ?? 'other'] ?? '#94a3b8',
                            color: '#fff',
                          }}
                        >
                          {p.institutionType ?? 'other'}
                        </Badge>
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
                      <Badge
                        style={{
                          backgroundColor: TYPE_COLORS[p.institutionType ?? 'other'] ?? '#94a3b8',
                          color: '#fff',
                        }}
                      >
                        {p.institutionType ?? 'other'}
                      </Badge>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Box (local helper)
// ---------------------------------------------------------------------------

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color: color || undefined }}>{value}</p>
    </Card>
  );
}
