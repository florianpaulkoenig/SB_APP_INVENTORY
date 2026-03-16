// ---------------------------------------------------------------------------
// NOA Inventory -- Portfolio Overview Dashboard
// Consolidated view: Inventory Status, Supply & Production, Consignment Risk
// ---------------------------------------------------------------------------

import { Link, useSearchParams } from 'react-router-dom';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useInventoryAnalytics } from '../../hooks/useInventoryAnalytics';
import { useSupplyPlanning } from '../../hooks/useSupplyPlanning';
import { useProductionRecommendations } from '../../hooks/useProductionRecommendations';
import type { ProductionRecommendation } from '../../hooks/useProductionRecommendations';
import { useConsignmentRisk } from '../../hooks/useConsignmentRisk';
import type { ConsignmentRiskItem } from '../../hooks/useConsignmentRisk';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'status', label: 'Inventory Status' },
  { key: 'supply', label: 'Supply & Production' },
  { key: 'risk', label: 'Consignment Risk' },
];

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${!color ? 'text-primary-900' : ''}`}
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </Card>
  );
}

const RISK_BADGE_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
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

// ---------------------------------------------------------------------------
// Tab 1: Inventory Status
// ---------------------------------------------------------------------------

function InventoryStatusTab() {
  const { data, loading } = useInventoryAnalytics();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }
  if (!data) {
    return <div className="py-20 text-center text-primary-500">No inventory data available.</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiBox label="Total Works" value={data.total} />
        <KpiBox label="Available" value={data.statusCounts.available} color="#10b981" />
        <KpiBox label="On Consignment" value={data.statusCounts.on_consignment} color="#06b6d4" />
        <KpiBox label="Sell-Through" value={`${data.sellThroughRate.toFixed(1)}%`} />
        <KpiBox
          label="Pressure Ratio"
          value={data.pressureRatio < 0 ? 'No sales' : `${data.pressureRatio}x`}
          color={data.pressureRatio > 6 ? '#ef4444' : undefined}
        />
        <KpiBox
          label="Avg Days on Market"
          value={data.avgDaysOnMarket != null ? `${data.avgDaysOnMarket}d` : '\u2014'}
        />
      </div>

      {/* Status counts table */}
      <Card className="p-6">
        <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Status Breakdown</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(data.statusCounts)
            .filter(([, count]) => count > 0)
            .map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm py-1">
                <span className="capitalize text-primary-700">{status.replace(/_/g, ' ')}</span>
                <span className="font-medium text-primary-900">{count}</span>
              </div>
            ))}
        </div>
      </Card>

      {/* Aging Buckets */}
      <Card className="p-6">
        <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">Inventory Aging (Unsold Works)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                <th className="pb-3 pr-4">Bucket</th>
                <th className="pb-3 text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {data.agingBuckets.map((b) => (
                <tr key={b.label} className="border-b border-primary-100">
                  <td className="py-3 pr-4 text-primary-700">{b.label}</td>
                  <td className="py-3 text-right font-medium text-primary-900">{b.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Series Overview */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-semibold text-primary-900">Series Overview</h3>
          <Link
            to="/analytics/series?tab=performance"
            className="text-sm font-medium text-accent hover:underline"
          >
            View Series &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                <th className="pb-3 pr-4">Series</th>
                <th className="pb-3 pr-4 text-right">Total</th>
                <th className="pb-3 text-right">Sold</th>
              </tr>
            </thead>
            <tbody>
              {data.seriesDistribution.slice(0, 10).map((s) => (
                <tr key={s.series} className="border-b border-primary-100 hover:bg-primary-50">
                  <td className="py-3 pr-4 font-medium text-primary-900">{s.series}</td>
                  <td className="py-3 pr-4 text-right text-primary-700">{s.count}</td>
                  <td className="py-3 text-right text-primary-700">{s.sold}</td>
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
// Tab 2: Supply & Production
// ---------------------------------------------------------------------------

function SupplyProductionTab() {
  const { data, loading } = useSupplyPlanning();
  const { data: recData, loading: recLoading } = useProductionRecommendations();

  if (loading && recLoading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }
  if (!data && !recData) {
    return <div className="py-20 text-center text-primary-500">No supply planning data available.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Supply/Demand KPIs */}
      {data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiBox label="Total Produced" value={data.totalProduced} />
          <KpiBox label="Total Sold" value={data.totalSold} />
          <KpiBox
            label="Supply/Demand"
            value={`${data.supplyDemandRatio}x`}
            color={data.supplyDemandRatio > 3 ? '#ef4444' : data.supplyDemandRatio > 1.5 ? '#f59e0b' : '#10b981'}
          />
          <KpiBox label="Avg Monthly Sales" value={data.avgMonthlySales} />
        </div>
      )}

      {/* Recommendations */}
      {recLoading ? (
        <div className="flex items-center justify-center py-10"><LoadingSpinner size="md" /></div>
      ) : recData ? (
        <>
          {/* Rec KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiBox label="Recommendations" value={recData.recommendations.length} />
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
                      <th className="pb-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recData.recommendations.map((r: ProductionRecommendation, i: number) => {
                      const ps = PRIORITY_STYLES[r.priority] ?? PRIORITY_STYLES.low;
                      return (
                        <tr key={i} className="border-b border-primary-100 hover:bg-primary-50">
                          <td className="py-3 pr-4 font-medium text-primary-900">{r.series}</td>
                          <td className="py-3 pr-4 text-primary-700">{r.sizeCategory ?? '\u2014'}</td>
                          <td className="py-3 pr-4 text-right font-medium text-primary-900">{r.recommendedQuantity}</td>
                          <td className="py-3 pr-4">
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                              style={{ backgroundColor: ps.bg, color: ps.text }}
                            >
                              {r.priority}
                            </span>
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

          {/* Series Health */}
          {recData.seriesHealth.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold text-primary-900">Series Health</h3>
                <Link
                  to="/analytics/series?tab=performance"
                  className="text-sm font-medium text-accent hover:underline"
                >
                  View Series &rarr;
                </Link>
              </div>
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
                      const ss = STATUS_BADGE_STYLES[sh.status] ?? STATUS_BADGE_STYLES.balanced;
                      return (
                        <tr key={sh.series} className="border-b border-primary-100 hover:bg-primary-50">
                          <td className="py-3 pr-4 font-medium text-primary-900">{sh.series}</td>
                          <td className="py-3 pr-4 text-right text-primary-700">{sh.available}</td>
                          <td className="py-3 pr-4 text-right text-primary-700">{sh.sold6m}</td>
                          <td className="py-3 pr-4 text-right text-primary-700">{sh.enquiries}</td>
                          <td className="py-3 pr-4 text-right text-primary-700">{sh.supplyDemandRatio}x</td>
                          <td className="py-3 text-right">
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize"
                              style={{ backgroundColor: ss.bg, color: ss.text }}
                            >
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
        </>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Consignment Risk
// ---------------------------------------------------------------------------

function ConsignmentRiskTab() {
  const { data, loading } = useConsignmentRisk();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }
  if (!data) {
    return <div className="py-20 text-center text-primary-500">No consignment risk data available.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Risk KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiBox label="Total Consigned" value={data.totalConsigned} />
        <KpiBox label="Critical" value={data.criticalCount} color={data.criticalCount > 0 ? '#ef4444' : '#10b981'} />
        <KpiBox label="High Risk" value={data.highRiskCount} color={data.highRiskCount > 0 ? '#f59e0b' : '#10b981'} />
        <KpiBox label="Avg Days Consigned" value={`${data.avgDaysConsigned}d`} />
        <KpiBox label="Avg Risk Score" value={data.avgRiskScore} color={data.avgRiskScore > 50 ? '#ef4444' : data.avgRiskScore > 25 ? '#f59e0b' : '#10b981'} />
      </div>

      {/* Risk Items Table */}
      {data.items.length > 0 ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-primary-900">Consignment Risk Items</h3>
            <Link
              to="/analytics/galleries?tab=scorecard"
              className="text-sm font-medium text-accent hover:underline"
            >
              View Gallery &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  <th className="pb-3 pr-4">Artwork</th>
                  <th className="pb-3 pr-4">Gallery</th>
                  <th className="pb-3 pr-4">Series</th>
                  <th className="pb-3 pr-4 text-right">Days</th>
                  <th className="pb-3 pr-4 text-right">Score</th>
                  <th className="pb-3 pr-4">Risk</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: ConsignmentRiskItem) => (
                  <tr key={item.artworkId} className="border-b border-primary-100 hover:bg-primary-50">
                    <td className="py-3 pr-4 font-medium text-primary-900">{item.artworkTitle}</td>
                    <td className="py-3 pr-4 text-primary-700">{item.galleryName}</td>
                    <td className="py-3 pr-4 text-primary-700">{item.series ?? '\u2014'}</td>
                    <td className="py-3 pr-4 text-right text-primary-700">{item.daysConsigned}</td>
                    <td className="py-3 pr-4 text-right font-medium text-primary-900">{item.riskScore}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={RISK_BADGE_VARIANT[item.riskLevel] ?? 'default'}>
                        {item.riskLevel}
                      </Badge>
                    </td>
                    <td className="py-3 text-primary-600 text-xs">{item.recommendAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <p className="text-center text-primary-500 py-6">No artworks currently on consignment.</p>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PortfolioOverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'status';

  const handleTabChange = (key: string) => {
    setSearchParams({ tab: key }, { replace: true });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">Portfolio Overview</h1>
        <p className="mt-1 text-sm text-primary-500">
          Consolidated view of inventory status, supply planning, and consignment risk.
        </p>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={handleTabChange} className="mb-6" />

      {/* Tab Content */}
      {activeTab === 'status' && <InventoryStatusTab />}
      {activeTab === 'supply' && <SupplyProductionTab />}
      {activeTab === 'risk' && <ConsignmentRiskTab />}
    </div>
  );
}
