import { useSearchParams, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { useExhibitionImpact } from '../../hooks/useExhibitionImpact';
import { useCareerTrajectory } from '../../hooks/useCareerTrajectory';
import { useInstitutionalStrategy } from '../../hooks/useInstitutionalStrategy';
import { useMediaImpact } from '../../hooks/useMediaImpact';

const TABS = [
  { key: 'impact', label: 'Exhibition Impact' },
  { key: 'career', label: 'Career Trajectory' },
  { key: 'institutional', label: 'Institutional' },
  { key: 'media', label: 'Media Impact' },
] as const;

export function ExhibitionCareerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'impact';

  const exhibition = useExhibitionImpact();
  const career = useCareerTrajectory();
  const institutional = useInstitutionalStrategy();
  const media = useMediaImpact();

  const isLoading = exhibition.loading || career.loading || institutional.loading || media.loading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-900">Exhibition &amp; Career</h1>

      <Tabs
        tabs={[...TABS]}
        activeTab={activeTab}
        onChange={(key) => setSearchParams({ tab: key })}
      />

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!isLoading && activeTab === 'impact' && exhibition.data && (
        <ImpactTab data={exhibition.data} />
      )}

      {!isLoading && activeTab === 'career' && career.data && (
        <CareerTab data={career.data} />
      )}

      {!isLoading && activeTab === 'institutional' && institutional.data && (
        <InstitutionalTab data={institutional.data} />
      )}

      {!isLoading && activeTab === 'media' && media.data && (
        <MediaTab data={media.data} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Impact Tab                                                                */
/* -------------------------------------------------------------------------- */

import type { ExhibitionImpactData } from '../../hooks/useExhibitionImpact';

function ImpactTab({ data }: { data: ExhibitionImpactData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Exhibitions" value={data.totalExhibitions} />
        <KpiCard label="Total Impact Revenue" value={formatCurrency(data.totalRevenue, 'CHF')} />
        <KpiCard label="Avg Sell-Through" value={
          data.exhibitions.length > 0
            ? `${Math.round(data.exhibitions.reduce((s, e) => s + e.sellThrough, 0) / data.exhibitions.length)}%`
            : '-'
        } />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Impact per Exhibition</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Exhibition</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2 text-right">Works Shown</th>
                <th className="px-4 py-2 text-right">Sales</th>
                <th className="px-4 py-2 text-right">Revenue</th>
                <th className="px-4 py-2 text-right">Sell-Through</th>
                <th className="px-4 py-2 text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.exhibitions.map((e) => (
                <tr key={e.id} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">
                    <Link to={`/exhibitions/${e.id}`} className="text-accent hover:underline">
                      {e.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2 capitalize">{e.type}</td>
                  <td className="px-4 py-2 text-right">{e.artworksShown}</td>
                  <td className="px-4 py-2 text-right">{e.directSales + e.attributedSales}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(e.totalRevenue, 'CHF')}</td>
                  <td className="px-4 py-2 text-right">{e.sellThrough}%</td>
                  <td className="px-4 py-2 text-right">
                    {e.roi != null ? (
                      <Badge variant={e.roi >= 0 ? 'success' : 'danger'}>
                        {Math.round(e.roi)}%
                      </Badge>
                    ) : '-'}
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

/* -------------------------------------------------------------------------- */
/*  Career Tab                                                                */
/* -------------------------------------------------------------------------- */

import type { CareerTrajectoryData } from '../../hooks/useCareerTrajectory';

function CareerTab({ data }: { data: CareerTrajectoryData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Milestones" value={data.totalMilestones} />
        <KpiCard label="Years Active" value={data.yearsActive} />
        <KpiCard label="Total Revenue" value={formatCurrency(data.totalRevenue, 'CHF')} />
      </div>

      {/* Milestones by Type */}
      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Milestones by Type</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.milestonesByType.map((m) => (
                <tr key={m.type} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2 capitalize">{m.type}</td>
                  <td className="px-4 py-2 text-right">{m.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Milestones by Country */}
      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Milestones by Country</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Country</th>
                <th className="px-4 py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.milestonesByCountry.map((m) => (
                <tr key={m.country} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">{m.country}</td>
                  <td className="px-4 py-2 text-right">{m.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Yearly Growth Summary */}
      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Yearly Growth</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Year</th>
                <th className="px-4 py-2 text-right">Sales</th>
                <th className="px-4 py-2 text-right">Revenue</th>
                <th className="px-4 py-2 text-right">Exhibitions</th>
                <th className="px-4 py-2 text-right">Cumulative Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.yearlyGrowth.map((y) => (
                <tr key={y.year} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">{y.year}</td>
                  <td className="px-4 py-2 text-right">{y.sales}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(y.revenue, 'CHF')}</td>
                  <td className="px-4 py-2 text-right">{y.exhibitions}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(y.cumulativeRevenue, 'CHF')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Institutional Tab                                                         */
/* -------------------------------------------------------------------------- */

import type { InstitutionalStrategyData } from '../../hooks/useInstitutionalStrategy';

function InstitutionalTab({ data }: { data: InstitutionalStrategyData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Institutions" value={data.totalInstitutions} />
        <KpiCard label="Artworks Placed" value={data.totalArtworksPlaced} />
        <KpiCard label="Placement Velocity" value={`${data.placementVelocity}/yr`} />
      </div>

      {/* Type Distribution */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-primary-900">Type Distribution</h2>
        <div className="flex flex-wrap gap-2">
          {data.typeDistribution.map((t) => (
            <Badge key={t.type} variant="info">
              <span className="capitalize">{t.type}</span>: {t.count} ({t.percentage}%)
            </Badge>
          ))}
        </div>
      </Card>

      {/* Gap Analysis */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {data.gaps.map((g) => (
          <Card key={g.category} className="p-4">
            <p className="text-xs capitalize text-primary-500">{g.category}</p>
            <p className="mt-1 text-lg font-semibold text-primary-900">{g.current}</p>
            <p className="mt-0.5 text-xs text-primary-400">Target: {g.target}</p>
            <Badge
              variant={g.status === 'strong' ? 'success' : g.status === 'developing' ? 'warning' : 'danger'}
              className="mt-2"
            >
              {g.status}
            </Badge>
          </Card>
        ))}
      </div>

      {/* Placements Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Placements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Collection</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Country</th>
                <th className="px-4 py-2 text-right">Artworks</th>
                <th className="px-4 py-2 text-right">Latest Year</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.placements.map((p) => (
                <tr key={p.collectionId} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">
                    <Link to="/collections" className="text-accent hover:underline">
                      {p.collectionName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 capitalize">{p.institutionType || '-'}</td>
                  <td className="px-4 py-2">{p.country || '-'}</td>
                  <td className="px-4 py-2 text-right">{p.artworkCount}</td>
                  <td className="px-4 py-2 text-right">{p.latestAcquisitionYear ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Media Tab                                                                 */
/* -------------------------------------------------------------------------- */

import type { MediaImpactData } from '../../hooks/useMediaImpact';

function MediaTab({ data }: { data: MediaImpactData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Publications" value={data.totalPublications} />
        <KpiCard label="Avg Sales Lift" value={`${data.avgSalesLift}%`} />
        <KpiCard label="Avg Impact Score" value={data.avgImpactScore} />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Publications</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Institution</th>
                <th className="px-4 py-2 text-right">Year</th>
                <th className="px-4 py-2 text-right">90-Day Sales</th>
                <th className="px-4 py-2 text-right">Sales Lift</th>
                <th className="px-4 py-2 text-right">Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.publications.map((p) => (
                <tr key={p.milestoneId} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">{p.title}</td>
                  <td className="px-4 py-2">{p.institution || '-'}</td>
                  <td className="px-4 py-2 text-right">{p.year}</td>
                  <td className="px-4 py-2 text-right">{p.salesInFollowing90Days}</td>
                  <td className="px-4 py-2 text-right">
                    {p.salesLift != null ? (
                      <Badge variant={p.salesLift >= 0 ? 'success' : 'danger'}>
                        {p.salesLift > 0 ? '+' : ''}{p.salesLift}%
                      </Badge>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Badge variant={p.impactScore >= 60 ? 'success' : p.impactScore >= 30 ? 'warning' : 'default'}>
                      {p.impactScore}
                    </Badge>
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

/* -------------------------------------------------------------------------- */
/*  Shared KPI Card                                                           */
/* -------------------------------------------------------------------------- */

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-primary-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-primary-900">{String(value)}</p>
    </Card>
  );
}
