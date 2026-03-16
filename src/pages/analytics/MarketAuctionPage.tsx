import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';
import { useAuctionAlerts } from '../../hooks/useAuctionAlerts';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import { useAuctionBenchmarking } from '../../hooks/useAuctionBenchmarking';
import { useSecondaryMarket } from '../../hooks/useSecondaryMarket';
import { useArtFairOptimizer } from '../../hooks/useArtFairOptimizer';

const TABS = [
  { key: 'geographic', label: 'Geographic Demand' },
  { key: 'auction', label: 'Auction Benchmarking' },
  { key: 'fairs', label: 'Art Fairs' },
] as const;

/* -------------------------------------------------------------------------- */
/*  Geographic tab types (inline supabase queries)                            */
/* -------------------------------------------------------------------------- */

interface MarketRow {
  country: string;
  enquiries: number;
  qualified: number;
  leads: number;
  sales: number;
}

interface ExpansionOpportunity {
  country: string;
  enquiries: number;
  galleryCount: number;
  galleryNames: string[];
  status: 'gap' | 'underserved' | 'covered';
}

function useGeographicDemand() {
  const [data, setData] = useState<{
    totalEnquiries: number;
    countriesCovered: number;
    marketOpportunities: MarketRow[];
    expansionOpportunities: ExpansionOpportunity[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: enquiriesData }, { data: galleriesData }] = await Promise.all([
        supabase
          .from('enquiries')
          .select('id, location_country, status'),
        supabase
          .from('galleries')
          .select('id, name, country'),
      ]);

      const enquiries = enquiriesData || [];
      const galleries = galleriesData || [];

      const galleriesByCountry = new Map<string, string[]>();
      for (const g of galleries) {
        if (!g.country) continue;
        if (!galleriesByCountry.has(g.country)) galleriesByCountry.set(g.country, []);
        galleriesByCountry.get(g.country)!.push(g.name);
      }

      const countryMap = new Map<string, { enquiries: number; qualified: number; leads: number; sales: number }>();
      for (const e of enquiries) {
        const country = e.location_country || 'Unknown';
        const row = countryMap.get(country) ?? { enquiries: 0, qualified: 0, leads: 0, sales: 0 };
        row.enquiries++;
        if (e.status === 'qualified') row.qualified++;
        if (e.status === 'lead') row.leads++;
        if (e.status === 'sold') row.sales++;
        countryMap.set(country, row);
      }

      const marketOpportunities: MarketRow[] = Array.from(countryMap.entries())
        .map(([country, v]) => ({ country, ...v }))
        .sort((a, b) => b.enquiries - a.enquiries);

      const allCountries = new Set([...countryMap.keys(), ...galleriesByCountry.keys()]);
      const expansionOpportunities: ExpansionOpportunity[] = Array.from(allCountries)
        .map((country) => {
          const enqCount = countryMap.get(country)?.enquiries ?? 0;
          const galNames = galleriesByCountry.get(country) ?? [];
          let status: 'gap' | 'underserved' | 'covered' = 'covered';
          if (galNames.length === 0 && enqCount > 0) status = 'gap';
          else if (galNames.length > 0 && enqCount > galNames.length * 5) status = 'underserved';
          return { country, enquiries: enqCount, galleryCount: galNames.length, galleryNames: galNames, status };
        })
        .filter((o) => o.status !== 'covered')
        .sort((a, b) => b.enquiries - a.enquiries);

      setData({
        totalEnquiries: enquiries.length,
        countriesCovered: countryMap.size,
        marketOpportunities,
        expansionOpportunities,
      });
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading };
}

/* -------------------------------------------------------------------------- */
/*  Page Component                                                            */
/* -------------------------------------------------------------------------- */

export function MarketAuctionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'geographic';

  const geo = useGeographicDemand();
  const { alerts, loading: alertsLoading } = useAuctionAlerts();
  const { toCHF, loading: ratesLoading } = useExchangeRates();
  const benchmarking = useAuctionBenchmarking(alerts, toCHF);
  const secondary = useSecondaryMarket(alerts, toCHF);
  const fairs = useArtFairOptimizer();

  const isLoading = geo.loading || alertsLoading || ratesLoading || secondary.loading || fairs.loading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-900">Market &amp; Auction</h1>

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

      {!isLoading && activeTab === 'geographic' && geo.data && (
        <GeographicTab data={geo.data} />
      )}

      {!isLoading && activeTab === 'auction' && (
        <AuctionTab benchmarking={benchmarking} secondary={secondary.data} />
      )}

      {!isLoading && activeTab === 'fairs' && fairs.data && (
        <FairsTab data={fairs.data} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Geographic Tab                                                            */
/* -------------------------------------------------------------------------- */

function GeographicTab({ data }: { data: NonNullable<ReturnType<typeof useGeographicDemand>['data']> }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <KpiCard label="Total Enquiries" value={data.totalEnquiries} />
        <KpiCard label="Countries" value={data.countriesCovered} />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Market Opportunities</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Country</th>
                <th className="px-4 py-2 text-right">Enquiries</th>
                <th className="px-4 py-2 text-right">Qualified</th>
                <th className="px-4 py-2 text-right">Leads</th>
                <th className="px-4 py-2 text-right">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.marketOpportunities.map((r) => (
                <tr key={r.country} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">{r.country}</td>
                  <td className="px-4 py-2 text-right">{r.enquiries}</td>
                  <td className="px-4 py-2 text-right">{r.qualified}</td>
                  <td className="px-4 py-2 text-right">{r.leads}</td>
                  <td className="px-4 py-2 text-right">{r.sales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Expansion Opportunities</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Country</th>
                <th className="px-4 py-2 text-right">Enquiries</th>
                <th className="px-4 py-2 text-right">Galleries</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.expansionOpportunities.map((o) => (
                <tr key={o.country} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">{o.country}</td>
                  <td className="px-4 py-2 text-right">{o.enquiries}</td>
                  <td className="px-4 py-2 text-right">{o.galleryCount}</td>
                  <td className="px-4 py-2">
                    <Badge variant={o.status === 'gap' ? 'danger' : 'warning'}>
                      {o.status}
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
/*  Auction Tab                                                               */
/* -------------------------------------------------------------------------- */

import type { AuctionBenchmarkingData } from '../../hooks/useAuctionBenchmarking';
import type { SecondaryMarketData } from '../../hooks/useSecondaryMarket';

function AuctionTab({
  benchmarking,
  secondary,
}: {
  benchmarking: AuctionBenchmarkingData;
  secondary: SecondaryMarketData;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Sell-Through" value={`${benchmarking.overallSellThroughRate}%`} />
        <KpiCard label="Strength Index" value={benchmarking.overallStrengthIndex} />
        <KpiCard label="Avg Appreciation" value={`${secondary.avgAppreciation}%`} />
      </div>

      {/* House Performance */}
      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">House Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Auction House</th>
                <th className="px-4 py-2 text-right">Lots</th>
                <th className="px-4 py-2 text-right">Sold</th>
                <th className="px-4 py-2 text-right">Sell-Through</th>
                <th className="px-4 py-2 text-right">Strength</th>
                <th className="px-4 py-2 text-right">Total Hammer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {benchmarking.houseStats.map((h) => (
                <tr key={h.auctionHouse} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">{h.auctionHouse}</td>
                  <td className="px-4 py-2 text-right">{h.totalLots}</td>
                  <td className="px-4 py-2 text-right">{h.soldCount}</td>
                  <td className="px-4 py-2 text-right">{h.sellThroughRate}%</td>
                  <td className="px-4 py-2 text-right">{h.auctionStrengthIndex}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(h.totalHammerCHF, 'CHF')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Estimate Accuracy */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-primary-900">Estimate Accuracy</h2>
        <div className="flex flex-wrap gap-3">
          {benchmarking.estimateAccuracy.map((b) => (
            <Badge
              key={b.label}
              variant={b.label === 'Above Estimate' ? 'success' : b.label === 'Below Estimate' ? 'danger' : 'info'}
            >
              {b.label}: {b.count} ({b.percentage}%)
            </Badge>
          ))}
        </div>
      </Card>

      {/* Secondary Market Items */}
      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Secondary Market</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Artwork</th>
                <th className="px-4 py-2">House</th>
                <th className="px-4 py-2 text-right">Hammer (CHF)</th>
                <th className="px-4 py-2 text-right">Appreciation</th>
                <th className="px-4 py-2">Gallery of Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {secondary.items.slice(0, 20).map((item) => (
                <tr key={item.auctionAlertId} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">{item.artworkTitle}</td>
                  <td className="px-4 py-2">{item.auctionHouse}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(item.hammerPriceCHF, 'CHF')}</td>
                  <td className="px-4 py-2 text-right">
                    {item.appreciation != null ? (
                      <Badge variant={item.appreciation >= 0 ? 'success' : 'danger'}>
                        {item.appreciation > 0 ? '+' : ''}{item.appreciation}%
                      </Badge>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-2">
                    {item.galleryOfOrigin ? (
                      <Link to="/analytics/galleries" className="text-accent hover:underline">
                        {item.galleryOfOrigin}
                      </Link>
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
/*  Fairs Tab                                                                 */
/* -------------------------------------------------------------------------- */

import type { ArtFairOptimizerData } from '../../hooks/useArtFairOptimizer';

function FairsTab({ data }: { data: ArtFairOptimizerData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard label="Total Fair Revenue" value={formatCurrency(data.totalFairRevenue, 'CHF')} />
        <KpiCard label="Avg ROI" value={`${Math.round(data.avgROI)}%`} />
        <KpiCard label="Best Fair" value={data.bestFair || '-'} />
      </div>

      {/* Past Performance */}
      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Past Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Fair</th>
                <th className="px-4 py-2">Country</th>
                <th className="px-4 py-2 text-right">Year</th>
                <th className="px-4 py-2 text-right">Revenue</th>
                <th className="px-4 py-2 text-right">Sales</th>
                <th className="px-4 py-2 text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.pastPerformance.map((f) => (
                <tr key={f.exhibitionId} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">{f.fairName}</td>
                  <td className="px-4 py-2">{f.country || '-'}</td>
                  <td className="px-4 py-2 text-right">{f.year}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(f.revenueCHF, 'CHF')}</td>
                  <td className="px-4 py-2 text-right">{f.salesCount}</td>
                  <td className="px-4 py-2 text-right">
                    <Badge variant={f.roi >= 0 ? 'success' : 'danger'}>
                      {Math.round(f.roi)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Country Recommendations */}
      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-primary-900">Country Recommendations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-primary-50 text-left text-xs text-primary-500">
              <tr>
                <th className="px-4 py-2">Country</th>
                <th className="px-4 py-2 text-right">Score</th>
                <th className="px-4 py-2 text-right">Historical ROI</th>
                <th className="px-4 py-2 text-right">Collectors</th>
                <th className="px-4 py-2">Growth</th>
                <th className="px-4 py-2">Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {data.recommendations.slice(0, 15).map((r) => (
                <tr key={r.country} className="hover:bg-primary-50/50">
                  <td className="px-4 py-2">
                    <Link
                      to={`?tab=geographic`}
                      className="text-accent hover:underline"
                    >
                      {r.country}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right">{r.score}</td>
                  <td className="px-4 py-2 text-right">{r.historicalROI != null ? `${r.historicalROI}%` : '-'}</td>
                  <td className="px-4 py-2 text-right">{r.collectorDensity}</td>
                  <td className="px-4 py-2">
                    <Badge variant={r.marketGrowth === 'growing' ? 'success' : r.marketGrowth === 'declining' ? 'danger' : 'default'}>
                      {r.marketGrowth}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-xs text-primary-600">{r.recommendation}</td>
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
