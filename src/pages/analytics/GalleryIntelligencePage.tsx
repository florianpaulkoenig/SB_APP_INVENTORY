// ---------------------------------------------------------------------------
// Gallery Intelligence -- Consolidated dashboard
// Tab 1: Partner Scorecard (from GalleryPerformancePage)
// Tab 2: Commission & Payments (from CommissionDashboardPage + invoicePaymentVelocity)
// Tab 3: Consignment by Gallery (useConsignmentRisk grouped by gallery)
// ---------------------------------------------------------------------------

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useGalleryPerformanceAnalytics } from '../../hooks/useGalleryPerformanceAnalytics';
import type { GalleryPerformanceRow } from '../../hooks/useGalleryPerformanceAnalytics';
import { useCommissionTransparency } from '../../hooks/useCommissionTransparency';
import type { GalleryCommissionSummary } from '../../hooks/useCommissionTransparency';
import { useConsignmentRisk } from '../../hooks/useConsignmentRisk';
import type { ConsignmentRiskItem } from '../../hooks/useConsignmentRisk';
import { computePaymentVelocity } from '../../lib/analytics/invoicePaymentVelocity';
import type { GalleryPaymentVelocity, InvoiceRecord } from '../../lib/analytics/invoicePaymentVelocity';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { GALLERY_TYPES } from '../../lib/constants';

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'scorecard', label: 'Partner Scorecard' },
  { key: 'commissions', label: 'Commission & Payments' },
  { key: 'consignment', label: 'Consignment by Gallery' },
];

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const CATEGORY_ALL = '__all__';

const categoryTabs = [
  { value: CATEGORY_ALL, label: 'All Categories' },
  ...GALLERY_TYPES.map((gt) => ({ value: gt.value, label: gt.label })),
];

function scoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function completenessColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-600';
}

function riskBadgeColor(level: string): string {
  switch (level) {
    case 'critical': return 'bg-red-600 text-white';
    case 'high': return 'bg-orange-500 text-white';
    case 'medium': return 'bg-amber-400 text-amber-900';
    default: return 'bg-emerald-100 text-emerald-800';
  }
}

function categoryLabel(type: string | null): string {
  if (!type) return 'Uncategorized';
  const found = GALLERY_TYPES.find((gt) => gt.value === type);
  return found ? found.label : type;
}

function trendIndicator(trend: 'improving' | 'stable' | 'declining' | null): string {
  switch (trend) {
    case 'improving': return '\u2191'; // up arrow
    case 'declining': return '\u2193'; // down arrow
    case 'stable': return '\u2192';    // right arrow
    default: return '\u2014';          // em dash
  }
}

function trendColor(trend: 'improving' | 'stable' | 'declining' | null): string {
  switch (trend) {
    case 'improving': return 'text-emerald-600';
    case 'declining': return 'text-red-600';
    case 'stable': return 'text-primary-400';
    default: return 'text-primary-300';
  }
}

// ---------------------------------------------------------------------------
// KPI Box
// ---------------------------------------------------------------------------

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color || 'text-primary-900'}`}>{value}</p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Grouped consignment type
// ---------------------------------------------------------------------------

interface GalleryConsignmentGroup {
  galleryId: string;
  galleryName: string;
  artworks: ConsignmentRiskItem[];
  artworkCount: number;
  avgRiskScore: number;
  criticalCount: number;
  highCount: number;
  topRecommendation: string;
}

function groupConsignmentByGallery(items: ConsignmentRiskItem[]): GalleryConsignmentGroup[] {
  const map = new Map<string, ConsignmentRiskItem[]>();
  for (const item of items) {
    const arr = map.get(item.galleryId) ?? [];
    arr.push(item);
    map.set(item.galleryId, arr);
  }

  const groups: GalleryConsignmentGroup[] = [];
  for (const [galleryId, artworks] of map.entries()) {
    const avgRisk = Math.round(artworks.reduce((s, a) => s + a.riskScore, 0) / artworks.length);
    const criticalCount = artworks.filter((a) => a.riskLevel === 'critical').length;
    const highCount = artworks.filter((a) => a.riskLevel === 'high').length;
    // Top recommendation = most urgent action in the group
    const worstItem = artworks[0]; // already sorted by risk desc
    groups.push({
      galleryId,
      galleryName: artworks[0]?.galleryName ?? 'Unknown',
      artworks,
      artworkCount: artworks.length,
      avgRiskScore: avgRisk,
      criticalCount,
      highCount,
      topRecommendation: worstItem?.recommendAction ?? 'Monitor',
    });
  }

  // Sort by average risk descending
  groups.sort((a, b) => b.avgRiskScore - a.avgRiskScore);
  return groups;
}

// ---------------------------------------------------------------------------
// Tab 1: Partner Scorecard
// ---------------------------------------------------------------------------

function ScorecardTab({ data }: { data: GalleryPerformanceRow[] }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ALL);

  const filtered = useMemo(() => {
    if (activeCategory === CATEGORY_ALL) return data;
    return data.filter((g) => g.type === activeCategory);
  }, [data, activeCategory]);

  const avgST = filtered.length > 0
    ? Math.round(filtered.reduce((s, r) => s + r.sellThrough, 0) / filtered.length * 10) / 10
    : 0;
  const avgPS = filtered.length > 0
    ? Math.round(filtered.reduce((s, r) => s + r.partnerScore, 0) / filtered.length)
    : 0;
  const topPerformer = filtered.length > 0
    ? [...filtered].sort((a, b) => b.partnerScore - a.partnerScore)[0]?.name ?? '\u2014'
    : '\u2014';

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categoryTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveCategory(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === tab.value
                ? 'bg-primary-900 text-white'
                : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
            }`}
          >
            {tab.label}
            {tab.value !== CATEGORY_ALL && (
              <span className="ml-1.5 text-xs opacity-70">
                ({data.filter((g) => g.type === tab.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Galleries" value={filtered.length} />
        <KpiBox label="Avg Sell-Through" value={`${avgST}%`} color="text-accent" />
        <KpiBox label="Avg Partner Score" value={avgPS} />
        <KpiBox label="Top Performer" value={topPerformer} />
      </div>

      {/* Ranking Table */}
      <Card className="p-6">
        <h3 className="font-display text-lg font-semibold text-primary-900 mb-4">
          Partner Ranking
          {activeCategory !== CATEGORY_ALL && (
            <span className="ml-2 text-sm font-normal text-primary-500">
              — {categoryTabs.find((t) => t.value === activeCategory)?.label}
            </span>
          )}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                <th className="pb-3 pr-4">Rank</th>
                <th className="pb-3 pr-4">Gallery</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4 text-right">Allocated</th>
                <th className="pb-3 pr-4 text-right">Sold</th>
                <th className="pb-3 pr-4 text-right">Sell-Through</th>
                <th className="pb-3 pr-4 text-right">Revenue</th>
                <th className="pb-3 pr-4 text-right">Reporting</th>
                <th className="pb-3 pr-4 text-right">Score</th>
                <th className="pb-3 text-right">Trend</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, i) => (
                <tr key={g.id} className="border-b border-primary-100 hover:bg-primary-50">
                  <td className="py-3 pr-4 font-medium text-primary-500">{i + 1}</td>
                  <td className="py-3 pr-4 font-medium text-primary-900">
                    <Link to={`/galleries/${g.id}`} className="hover:text-accent underline">
                      {g.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-xs text-primary-500">{categoryLabel(g.type)}</td>
                  <td className="py-3 pr-4 text-right text-primary-700">{g.totalAllocated}</td>
                  <td className="py-3 pr-4 text-right text-primary-700">{g.soldCount}</td>
                  <td className="py-3 pr-4 text-right font-medium" style={{ color: scoreColor(g.sellThrough) }}>
                    {g.sellThrough.toFixed(1)}%
                  </td>
                  <td className="py-3 pr-4 text-right text-primary-700">
                    {formatCurrency(g.totalRevenue, 'CHF')}
                  </td>
                  <td className={`py-3 pr-4 text-right font-medium ${completenessColor(g.reportingCompleteness)}`}>
                    {g.reportingCompleteness}%
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                      style={{ backgroundColor: scoreColor(g.partnerScore) }}
                    >
                      {g.partnerScore}
                    </span>
                  </td>
                  <td className={`py-3 text-right text-lg font-bold ${trendColor(g.scoreTrend)}`}>
                    {trendIndicator(g.scoreTrend)}
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
// Tab 2: Commission & Payments
// ---------------------------------------------------------------------------

function CommissionsTab({
  data,
  velocityMap,
}: {
  data: import('../../hooks/useCommissionTransparency').CommissionTransparencyData;
  velocityMap: Map<string, GalleryPaymentVelocity>;
}) {
  const [expandedGallery, setExpandedGallery] = useState<string | null>(null);

  const toggle = (id: string) =>
    setExpandedGallery((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <KpiBox label="Total Revenue" value={formatCurrency(data.totalRevenue, 'CHF')} />
        <KpiBox label="Gallery Commissions" value={formatCurrency(data.totalGalleryCommissions, 'CHF')} />
        <KpiBox label="NOA Revenue" value={formatCurrency(data.totalNoaRevenue, 'CHF')} color="text-accent" />
        <KpiBox label="Artist Revenue" value={formatCurrency(data.totalArtistRevenue, 'CHF')} />
        <KpiBox
          label="Outstanding"
          value={formatCurrency(data.totalOutstanding, 'CHF')}
          color={data.totalOutstanding > 0 ? 'text-red-600' : 'text-emerald-600'}
        />
      </div>

      {/* Per-gallery expandable sections */}
      <div className="space-y-3">
        {data.galleries.map((g) => {
          const isExpanded = expandedGallery === g.galleryId;
          const velocity = velocityMap.get(g.galleryId);

          return (
            <Card key={g.galleryId} className="overflow-hidden">
              {/* Gallery header row */}
              <button
                type="button"
                onClick={() => toggle(g.galleryId)}
                className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-primary-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold text-primary-900">
                    <Link
                      to={`/galleries/${g.galleryId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-accent underline"
                    >
                      {g.galleryName}
                    </Link>
                  </span>
                  {g.country && (
                    <span className="text-xs text-primary-400">{g.country}</span>
                  )}
                  {velocity && (
                    <span className="ml-2 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-600">
                      Avg {velocity.avgDaysToPay}d to pay &middot; {velocity.onTimeRate}% on-time
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-primary-500">{g.totalSales} sales</span>
                  <span className="font-medium text-primary-900">{formatCurrency(g.totalRevenue, 'CHF')}</span>
                  {g.outstandingAmount > 0 && (
                    <Link
                      to={`/invoices?gallery=${g.galleryId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-red-600 hover:text-red-800 underline"
                    >
                      {formatCurrency(g.outstandingAmount, 'CHF')} outstanding
                    </Link>
                  )}
                  <span className="text-primary-400">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-primary-100 px-6 py-4">
                  {/* Commission split summary */}
                  <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-primary-500">Gallery share</span>
                      <p className="font-medium text-primary-900">
                        {formatCurrency(g.totalGalleryCommission, 'CHF')}
                        {g.commissionGallery != null && (
                          <span className="ml-1 text-xs text-primary-400">({g.commissionGallery}%)</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-primary-500">NOA share</span>
                      <p className="font-medium text-primary-900">
                        {formatCurrency(g.totalNoaCommission, 'CHF')}
                        {g.commissionNoa != null && (
                          <span className="ml-1 text-xs text-primary-400">({g.commissionNoa}%)</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-primary-500">Artist share</span>
                      <p className="font-medium text-primary-900">
                        {formatCurrency(g.totalArtistCommission, 'CHF')}
                        {g.commissionArtist != null && (
                          <span className="ml-1 text-xs text-primary-400">({g.commissionArtist}%)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Per-sale detail table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                          <th className="pb-2 pr-3">Artwork</th>
                          <th className="pb-2 pr-3">Date</th>
                          <th className="pb-2 pr-3 text-right">Sale Price</th>
                          <th className="pb-2 pr-3 text-right">Gallery</th>
                          <th className="pb-2 pr-3 text-right">NOA</th>
                          <th className="pb-2 pr-3 text-right">Artist</th>
                          <th className="pb-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.sales.map((sale) => (
                          <tr key={sale.saleId} className="border-b border-primary-50 hover:bg-primary-50">
                            <td className="py-2 pr-3 text-primary-800">{sale.artworkTitle}</td>
                            <td className="py-2 pr-3 text-primary-500">{sale.saleDate || '\u2014'}</td>
                            <td className="py-2 pr-3 text-right text-primary-700">{formatCurrency(sale.salePrice, 'CHF')}</td>
                            <td className="py-2 pr-3 text-right text-primary-600">{formatCurrency(sale.galleryShare, 'CHF')}</td>
                            <td className="py-2 pr-3 text-right text-primary-600">{formatCurrency(sale.noaShare, 'CHF')}</td>
                            <td className="py-2 pr-3 text-right text-primary-600">{formatCurrency(sale.artistShare, 'CHF')}</td>
                            <td className="py-2 text-right">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                  sale.paymentStatus === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {sale.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: Consignment by Gallery
// ---------------------------------------------------------------------------

function ConsignmentTab({ groups }: { groups: GalleryConsignmentGroup[] }) {
  const [expandedGallery, setExpandedGallery] = useState<string | null>(null);

  const toggle = (id: string) =>
    setExpandedGallery((prev) => (prev === id ? null : id));

  // Overall KPIs
  const totalArtworks = groups.reduce((s, g) => s + g.artworkCount, 0);
  const totalCritical = groups.reduce((s, g) => s + g.criticalCount, 0);
  const totalHigh = groups.reduce((s, g) => s + g.highCount, 0);
  const overallAvgRisk = totalArtworks > 0
    ? Math.round(groups.reduce((s, g) => s + g.avgRiskScore * g.artworkCount, 0) / totalArtworks)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiBox label="Consigned Artworks" value={totalArtworks} />
        <KpiBox label="Avg Risk Score" value={overallAvgRisk} color={overallAvgRisk > 50 ? 'text-red-600' : 'text-primary-900'} />
        <KpiBox label="Critical" value={totalCritical} color={totalCritical > 0 ? 'text-red-600' : 'text-emerald-600'} />
        <KpiBox label="High Risk" value={totalHigh} color={totalHigh > 0 ? 'text-orange-500' : 'text-emerald-600'} />
      </div>

      {/* Per-gallery cards */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isExpanded = expandedGallery === group.galleryId;

          return (
            <Card key={group.galleryId} className="overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(group.galleryId)}
                className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-primary-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Link
                    to={`/galleries/${group.galleryId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-lg font-semibold text-primary-900 hover:text-accent underline"
                  >
                    {group.galleryName}
                  </Link>
                  <span className="text-sm text-primary-500">{group.artworkCount} artworks</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: scoreColor(100 - group.avgRiskScore) }}
                  >
                    Risk {group.avgRiskScore}
                  </span>
                  {group.criticalCount > 0 && (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                      {group.criticalCount} critical
                    </span>
                  )}
                  {group.highCount > 0 && (
                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-medium text-white">
                      {group.highCount} high
                    </span>
                  )}
                  <span className="font-medium text-primary-600">{group.topRecommendation}</span>
                  <span className="text-primary-400">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-primary-100 px-6 py-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                          <th className="pb-2 pr-3">Artwork</th>
                          <th className="pb-2 pr-3">Series</th>
                          <th className="pb-2 pr-3 text-right">Days Consigned</th>
                          <th className="pb-2 pr-3 text-right">Risk Score</th>
                          <th className="pb-2 pr-3">Level</th>
                          <th className="pb-2">Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.artworks.map((item) => (
                          <tr key={item.artworkId} className="border-b border-primary-50 hover:bg-primary-50">
                            <td className="py-2 pr-3 text-primary-800">{item.artworkTitle}</td>
                            <td className="py-2 pr-3 text-primary-500">{item.series || '\u2014'}</td>
                            <td className="py-2 pr-3 text-right text-primary-700">{item.daysConsigned}d</td>
                            <td className="py-2 pr-3 text-right font-medium" style={{ color: scoreColor(100 - item.riskScore) }}>
                              {item.riskScore}
                            </td>
                            <td className="py-2 pr-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${riskBadgeColor(item.riskLevel)}`}>
                                {item.riskLevel}
                              </span>
                            </td>
                            <td className="py-2 text-primary-600">{item.recommendAction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {groups.length === 0 && (
          <p className="py-12 text-center text-primary-500">No consigned artworks found.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// useInvoicePaymentVelocity (lightweight fetch + compute)
// ---------------------------------------------------------------------------

function useInvoicePaymentVelocity() {
  const [velocityMap, setVelocityMap] = useState<Map<string, GalleryPaymentVelocity>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchVelocity = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const [invoicesRes, galleriesRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('gallery_id, status, due_date, paid_date, issue_date'),
        supabase.from('galleries').select('id, name'),
      ]);

      if (invoicesRes.error || galleriesRes.error) {
        setLoading(false);
        return;
      }

      const invoices: InvoiceRecord[] = (invoicesRes.data ?? []).map((inv) => ({
        gallery_id: inv.gallery_id as string,
        status: inv.status as string,
        due_date: inv.due_date as string | null,
        paid_date: inv.paid_date as string | null,
        issue_date: inv.issue_date as string | null,
      }));

      const names: Record<string, string> = {};
      for (const g of galleriesRes.data ?? []) {
        names[g.id] = g.name;
      }

      const velocities = computePaymentVelocity(invoices, names);
      const map = new Map<string, GalleryPaymentVelocity>();
      for (const v of velocities) {
        map.set(v.galleryId, v);
      }
      setVelocityMap(map);
    } catch {
      // Silently ignore -- velocity is supplementary
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVelocity(); }, [fetchVelocity]);

  return { velocityMap, loading };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleryIntelligencePage() {
  const [activeTab, setActiveTab] = useState(TABS[0].key);

  // Data hooks
  const { data: perfData, loading: perfLoading } = useGalleryPerformanceAnalytics();
  const { data: commData, loading: commLoading } = useCommissionTransparency();
  const { data: riskData, loading: riskLoading } = useConsignmentRisk();
  const { velocityMap, loading: velLoading } = useInvoicePaymentVelocity();

  // Derived: consignment grouped by gallery
  const consignmentGroups = useMemo(() => {
    if (!riskData) return [];
    return groupConsignmentByGallery(riskData.items);
  }, [riskData]);

  // Loading state per tab
  const isTabLoading =
    (activeTab === 'scorecard' && perfLoading) ||
    (activeTab === 'commissions' && (commLoading || velLoading)) ||
    (activeTab === 'consignment' && riskLoading);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">
          Gallery Intelligence
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Partner performance, commission transparency, and consignment risk -- all in one view.
        </p>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* Loading */}
      {isTabLoading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Tab 1: Partner Scorecard */}
      {activeTab === 'scorecard' && !perfLoading && (
        perfData && perfData.galleries.length > 0 ? (
          <ScorecardTab data={perfData.galleries} />
        ) : (
          <p className="py-20 text-center text-primary-500">No gallery performance data available.</p>
        )
      )}

      {/* Tab 2: Commission & Payments */}
      {activeTab === 'commissions' && !commLoading && !velLoading && (
        commData && commData.galleries.length > 0 ? (
          <CommissionsTab data={commData} velocityMap={velocityMap} />
        ) : (
          <p className="py-20 text-center text-primary-500">No commission data available.</p>
        )
      )}

      {/* Tab 3: Consignment by Gallery */}
      {activeTab === 'consignment' && !riskLoading && (
        <ConsignmentTab groups={consignmentGroups} />
      )}
    </div>
  );
}
