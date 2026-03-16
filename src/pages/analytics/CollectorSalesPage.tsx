import { useSearchParams, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { useCollectorIntelligence } from '../../hooks/useCollectorIntelligence';
import { useSalesFunnel } from '../../hooks/useSalesFunnel';
import { useDemandVelocity } from '../../hooks/useDemandVelocity';

const TABS = [
  { key: 'profiles', label: 'Collector Profiles' },
  { key: 'funnel', label: 'Sales Funnel' },
  { key: 'velocity', label: 'Demand Velocity' },
] as const;

export function CollectorSalesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profiles';

  const collector = useCollectorIntelligence();
  const funnel = useSalesFunnel();
  const velocity = useDemandVelocity();

  const isLoading = collector.loading || funnel.loading || velocity.loading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-900">Collector &amp; Sales</h1>

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

      {!isLoading && activeTab === 'profiles' && collector.data && (
        <ProfilesTab data={collector.data} />
      )}

      {!isLoading && activeTab === 'funnel' && funnel.data && (
        <FunnelTab data={funnel.data} />
      )}

      {!isLoading && activeTab === 'velocity' && velocity.data && (
        <VelocityTab data={velocity.data} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Profiles Tab                                                              */
/* -------------------------------------------------------------------------- */

function ProfilesTab({ data }: { data: NonNullable<ReturnType<typeof useCollectorIntelligence>['data']> }) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total Collectors" value={data.totalCollectors} />
        <KpiCard label="Repeat Buyers" value={data.repeatBuyers} />
        <KpiCard label="At Risk" value={data.atRiskCount} />
        <KpiCard label="Churn Critical" value={data.churnCriticalCount} />
      </div>

      {/* Spend Tiers */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {data.spendTiers.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-xs text-primary-500">{t.label}</p>
            <p className="mt-1 text-lg font-semibold text-primary-900">{t.count}</p>
          </Card>
        ))}
      </div>

      {/* Top Collectors */}
      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Top Collectors</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Country</th>
                <th className="px-4 py-2 text-right">Total Spent</th>
                <th className="px-4 py-2 text-right">Purchases</th>
                <th className="px-4 py-2">RFM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.topCollectors.map((c) => {
                const health = data.collectorHealth.find((h) => h.id === c.id);
                return (
                  <tr key={c.id} className="hover:bg-primary-50/50">
                    <td className="px-4 py-2">
                      <Link
                        to={`/contacts/${c.id}`}
                        className="text-accent hover:underline"
                      >
                        {c.isAnonymous ? 'Anonymous' : c.name || 'Unknown'}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{c.country || '-'}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(c.totalSpent, 'CHF')}</td>
                    <td className="px-4 py-2 text-right">{c.purchaseCount}</td>
                    <td className="px-4 py-2">
                      {health ? (
                        <Badge variant={health.churnRisk === 'critical' ? 'danger' : health.churnRisk === 'high' ? 'warning' : 'success'}>
                          {health.churnRisk}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Country Distribution */}
      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Country Distribution</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
          {data.byCountry.slice(0, 12).map((c) => (
            <div key={c.country} className="flex items-center justify-between rounded bg-primary-50 px-3 py-2">
              <span className="text-sm text-primary-700">{c.country}</span>
              <span className="text-sm font-medium text-primary-900">{c.count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Funnel Tab                                                                */
/* -------------------------------------------------------------------------- */

function FunnelTab({ data }: { data: NonNullable<ReturnType<typeof useSalesFunnel>['data']> }) {
  const maxCount = Math.max(...data.stages.map((s) => s.count), 1);
  const topBottleneck = data.bottlenecks[0];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Enquiries" value={data.totalEnquiries} />
        <KpiCard label="Conversion Rate" value={`${data.overallConversionRate}%`} />
        <KpiCard label="Avg Cycle Time" value={data.avgCycleTime != null ? `${data.avgCycleTime} days` : '-'} />
      </div>

      {/* Funnel Bars */}
      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-primary-900">Funnel Stages</h2>
        {data.stages.map((s) => (
          <div key={s.stage} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-primary-600">
              <span className="capitalize">{s.stage}</span>
              <span>{s.count} ({s.conversionRate}%)</span>
            </div>
            <div className="h-3 w-full rounded bg-primary-100">
              <div
                className="h-3 rounded bg-accent"
                style={{ width: `${(s.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </Card>

      {/* Bottleneck Alert */}
      {topBottleneck && topBottleneck.dropOffRate > 20 && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            Bottleneck Alert: {topBottleneck.dropOffRate}% drop-off from{' '}
            <span className="capitalize">{topBottleneck.fromStage}</span> to{' '}
            <span className="capitalize">{topBottleneck.toStage}</span>{' '}
            ({topBottleneck.dropOffCount} lost)
          </p>
        </Card>
      )}

      {/* Stage Distribution Badges */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-primary-900">Active Deal Distribution</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.stageDistribution).map(([stage, count]) => (
            <Link key={stage} to="/deals" className="no-underline">
              <Badge variant="info">
                <span className="capitalize">{stage}</span>: {count}
              </Badge>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Velocity Tab                                                              */
/* -------------------------------------------------------------------------- */

function VelocityTab({ data }: { data: NonNullable<ReturnType<typeof useDemandVelocity>['data']> }) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <KpiCard label="Avg Velocity" value={data.avgDays != null ? `${data.avgDays} days` : '-'} />
        <KpiCard label="Fastest Seller" value={data.fastest[0]?.title ?? '-'} />
      </div>

      {/* Velocity by Series */}
      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Velocity by Series</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Series</th>
                <th className="px-4 py-2 text-right">Avg Days</th>
                <th className="px-4 py-2 text-right">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.velocityBySeries.map((s) => (
                <tr key={s.series} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">{s.series}</td>
                  <td className="px-4 py-2 text-right">{s.avgDays}</td>
                  <td className="px-4 py-2 text-right">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Velocity by Gallery */}
      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Velocity by Gallery</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Gallery</th>
                <th className="px-4 py-2 text-right">Avg Days</th>
                <th className="px-4 py-2 text-right">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.velocityByGallery.map((g) => (
                <tr key={g.gallery} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">
                    <Link to="/analytics/galleries?tab=scorecard" className="text-accent hover:underline">
                      {g.gallery}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right">{g.avgDays}</td>
                  <td className="px-4 py-2 text-right">{g.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Distribution Buckets */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-primary-900">Distribution</h2>
        <div className="flex flex-wrap gap-2">
          {data.distribution.map((b) => (
            <Badge key={b.bucket} variant="default">
              {b.bucket}: {b.count}
            </Badge>
          ))}
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
