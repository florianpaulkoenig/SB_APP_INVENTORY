import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatCurrency } from '../lib/utils';
import { MapView, MapLegend } from '../components/maps/MapView';
import type { MapMarker } from '../components/maps/MapView';
import { getCoordinates } from '../lib/geocoding';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

interface FairPerformance {
  id: string;
  title: string;
  city: string | null;
  country: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number;
  budgetCurrency: string | null;
  galleries: number;
  artworks: number;
  revenue: number;
  roi: number;
}

interface UntappedMarket {
  country: string;
  collectors: number;
  fairs: number;
  recommendation: string;
}

export function ArtFairHeatMapPage() {
  const [loading, setLoading] = useState(true);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [fairs, setFairs] = useState<FairPerformance[]>([]);
  const [untappedMarkets, setUntappedMarkets] = useState<UntappedMarket[]>([]);
  const [stats, setStats] = useState({
    totalFairs: 0,
    countries: 0,
    totalRevenue: 0,
    avgRoi: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [fairsRes, galleriesRes, artworksRes, salesRes, collectorsRes] = await Promise.all([
        supabase
          .from('exhibitions')
          .select('id, title, city, country, start_date, end_date, budget, budget_currency, type')
          .eq('type', 'art_fair'),
        supabase.from('exhibition_galleries').select('exhibition_id'),
        supabase.from('exhibition_artworks').select('exhibition_id'),
        supabase.from('sales').select('id, source_exhibition_id, sale_price, currency'),
        supabase.from('contacts').select('id, country, type').eq('type', 'collector'),
      ]);

      const exhibitions = fairsRes.data || [];
      const galleryRows = galleriesRes.data || [];
      const artworkRows = artworksRes.data || [];
      const sales = salesRes.data || [];
      const collectors = collectorsRes.data || [];

      // Count galleries per exhibition
      const galleryCount = new Map<string, number>();
      galleryRows.forEach((g) => {
        galleryCount.set(g.exhibition_id, (galleryCount.get(g.exhibition_id) || 0) + 1);
      });

      // Count artworks per exhibition
      const artworkCount = new Map<string, number>();
      artworkRows.forEach((a) => {
        artworkCount.set(a.exhibition_id, (artworkCount.get(a.exhibition_id) || 0) + 1);
      });

      // Revenue per exhibition (from sales with matching source_exhibition_id)
      const revenueMap = new Map<string, number>();
      sales.forEach((s) => {
        if (s.source_exhibition_id) {
          revenueMap.set(
            s.source_exhibition_id,
            (revenueMap.get(s.source_exhibition_id) || 0) + (s.sale_price || 0)
          );
        }
      });

      // Build fair performance data
      const fairData: FairPerformance[] = exhibitions.map((ex) => {
        const revenue = revenueMap.get(ex.id) || 0;
        const budget = ex.budget || 0;
        const roi = budget > 0 ? ((revenue - budget) / budget) * 100 : 0;
        return {
          id: ex.id,
          title: ex.title || 'Untitled Fair',
          city: ex.city,
          country: ex.country,
          startDate: ex.start_date,
          endDate: ex.end_date,
          budget,
          budgetCurrency: ex.budget_currency,
          galleries: galleryCount.get(ex.id) || 0,
          artworks: artworkCount.get(ex.id) || 0,
          revenue,
          roi,
        };
      });
      setFairs(fairData);

      // Build map markers
      const mapMarkers: MapMarker[] = [];
      for (const fair of fairData) {
        const coords = await getCoordinates(fair.city, fair.country);
        if (coords) {
          let color = '#ef4444'; // red - no revenue
          if (fair.revenue > 0 && fair.revenue > fair.budget) {
            color = '#22c55e'; // green - revenue exceeds budget
          } else if (fair.revenue > 0) {
            color = '#c9a96e'; // gold - some revenue
          }

          mapMarkers.push({
            id: `art_fair-${fair.id}`,
            lat: coords.lat,
            lng: coords.lng,
            type: 'art_fair',
            color,
            label: fair.title,
            value: fair.revenue || undefined,
            currency: fair.budgetCurrency ?? undefined,
          });
        }
      }
      setMarkers(mapMarkers);

      // Compute stats
      const fairCountries = new Set<string>();
      exhibitions.forEach((e) => e.country && fairCountries.add(e.country));
      const totalRevenue = fairData.reduce((sum, f) => sum + f.revenue, 0);
      const fairsWithBudget = fairData.filter((f) => f.budget > 0);
      const avgRoi =
        fairsWithBudget.length > 0
          ? fairsWithBudget.reduce((sum, f) => sum + f.roi, 0) / fairsWithBudget.length
          : 0;

      setStats({
        totalFairs: exhibitions.length,
        countries: fairCountries.size,
        totalRevenue,
        avgRoi,
      });

      // Untapped markets: countries with collectors but no fairs
      const collectorCountryCount = new Map<string, number>();
      collectors.forEach((c) => {
        if (c.country) {
          collectorCountryCount.set(c.country, (collectorCountryCount.get(c.country) || 0) + 1);
        }
      });

      const fairCountryCount = new Map<string, number>();
      exhibitions.forEach((e) => {
        if (e.country) {
          fairCountryCount.set(e.country, (fairCountryCount.get(e.country) || 0) + 1);
        }
      });

      const markets: UntappedMarket[] = [];
      for (const [country, count] of collectorCountryCount) {
        const fairsInCountry = fairCountryCount.get(country) || 0;
        let recommendation = 'Consider attending fairs';
        if (count >= 5 && fairsInCountry === 0) {
          recommendation = 'High priority — strong collector base, no fair presence';
        } else if (count >= 3 && fairsInCountry === 0) {
          recommendation = 'Medium priority — growing collector base';
        } else if (fairsInCountry > 0) {
          recommendation = 'Already active — maintain presence';
        }

        markets.push({
          country,
          collectors: count,
          fairs: fairsInCountry,
          recommendation,
        });
      }
      markets.sort((a, b) => b.collectors - a.collectors);
      setUntappedMarkets(markets);
    } catch (err) {
      console.error('Failed to fetch art fair data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Chart data: top 10 fairs by revenue
  const chartData = [...fairs]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((f) => ({
      name: f.title.length > 20 ? f.title.substring(0, 20) + '...' : f.title,
      revenue: f.revenue,
    }));

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Art Fair Distribution</h1>
        <p className="mt-1 text-sm text-gray-500">
          Geographic distribution and performance analysis of art fair participation.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Total Fairs</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalFairs}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Countries</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.countries}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatCurrency(stats.totalRevenue, 'EUR')}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Avg ROI</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {stats.avgRoi.toFixed(1)}%
            </p>
          </div>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <div className="p-4">
          <MapView markers={markers} height="450px" />
        </div>
      </Card>

      {/* Legend */}
      <MapLegend />

      {/* Fair Performance Chart */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fair Performance</h2>
        <Card>
          <div className="p-4">
            {chartData.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">No fair revenue data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v: number) => formatCurrency(v, 'EUR')} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value, 'EUR'), 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#c9a96e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Opportunity Analysis */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Opportunity Analysis</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Collectors
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Fairs Attended
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Recommendation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {untappedMarkets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                      No market data available.
                    </td>
                  </tr>
                ) : (
                  untappedMarkets.map((m) => (
                    <tr key={m.country} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {m.country}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {m.collectors}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {m.fairs}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {m.recommendation}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
