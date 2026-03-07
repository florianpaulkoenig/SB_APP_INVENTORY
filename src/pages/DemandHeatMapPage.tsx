import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatCurrency } from '../lib/utils';
import { MapView, MapLegend } from '../components/maps/MapView';
import type { MapMarker } from '../components/maps/MapView';
import { getCoordinates } from '../lib/geocoding';

interface ActiveLayers {
  enquiries: boolean;
  exhibitions: boolean;
  sales: boolean;
  collectors: boolean;
}

interface MarketRow {
  country: string;
  collectors: number;
  sales: number;
  exhibitions: number;
}

export function DemandHeatMapPage() {
  const [loading, setLoading] = useState(true);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [activeLayer, setActiveLayer] = useState<ActiveLayers>({
    enquiries: true,
    exhibitions: true,
    sales: true,
    collectors: true,
  });
  const [stats, setStats] = useState({
    totalEnquiries: 0,
    totalExhibitions: 0,
    totalSales: 0,
    countriesCovered: 0,
  });
  const [marketOpportunities, setMarketOpportunities] = useState<MarketRow[]>([]);
  const [allMarkers, setAllMarkers] = useState<MapMarker[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [enquiriesRes, exhibitionsRes, salesRes, contactsRes] = await Promise.all([
        supabase
          .from('enquiries')
          .select('id, sender_name, subject, location_city, location_country, estimated_value, currency, status'),
        supabase
          .from('exhibitions')
          .select('id, title, city, country, type'),
        supabase
          .from('sales')
          .select('id, sale_date, sale_price, currency, sale_city, sale_country'),
        supabase
          .from('contacts')
          .select('id, first_name, last_name, city, country, type')
          .eq('type', 'collector'),
      ]);

      const enquiries = enquiriesRes.data || [];
      const exhibitions = exhibitionsRes.data || [];
      const sales = salesRes.data || [];
      const collectors = contactsRes.data || [];

      // Build markers with geocoding
      const enquiryMarkers: MapMarker[] = [];
      for (const e of enquiries) {
        const coords = await getCoordinates(e.location_city, e.location_country);
        if (coords) {
          enquiryMarkers.push({
            id: `enquiry-${e.id}`,
            lat: coords.lat,
            lng: coords.lng,
            type: 'enquiry',
            color: '#3b82f6',
            label: e.sender_name || e.subject || 'Enquiry',
            value: e.estimated_value ?? undefined,
            currency: e.currency ?? undefined,
          });
        }
      }

      const exhibitionMarkers: MapMarker[] = [];
      for (const ex of exhibitions) {
        const coords = await getCoordinates(ex.city, ex.country);
        if (coords) {
          exhibitionMarkers.push({
            id: `exhibition-${ex.id}`,
            lat: coords.lat,
            lng: coords.lng,
            type: 'exhibition',
            color: '#8b5cf6',
            label: ex.title || 'Exhibition',
          });
        }
      }

      const saleMarkers: MapMarker[] = [];
      for (const s of sales) {
        const coords = await getCoordinates(s.sale_city, s.sale_country);
        if (coords) {
          saleMarkers.push({
            id: `sale-${s.id}`,
            lat: coords.lat,
            lng: coords.lng,
            type: 'sale',
            color: '#c9a96e',
            label: `Sale: ${s.sale_city || 'Unknown'}`,
            value: s.sale_price ?? undefined,
            currency: s.currency ?? undefined,
          });
        }
      }

      const collectorMarkers: MapMarker[] = [];
      for (const c of collectors) {
        const coords = await getCoordinates(c.city, c.country);
        if (coords) {
          collectorMarkers.push({
            id: `collector-${c.id}`,
            lat: coords.lat,
            lng: coords.lng,
            type: 'collector',
            color: '#22c55e',
            label: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Collector',
          });
        }
      }

      const combined = [...enquiryMarkers, ...exhibitionMarkers, ...saleMarkers, ...collectorMarkers];
      setAllMarkers(combined);

      // Compute stats
      const allCountries = new Set<string>();
      enquiries.forEach((e) => e.location_country && allCountries.add(e.location_country));
      exhibitions.forEach((e) => e.country && allCountries.add(e.country));
      sales.forEach((s) => s.sale_country && allCountries.add(s.sale_country));
      collectors.forEach((c) => c.country && allCountries.add(c.country));

      setStats({
        totalEnquiries: enquiries.length,
        totalExhibitions: exhibitions.length,
        totalSales: sales.length,
        countriesCovered: allCountries.size,
      });

      // Compute market opportunities
      const collectorCountries = new Map<string, number>();
      collectors.forEach((c) => {
        if (c.country) {
          collectorCountries.set(c.country, (collectorCountries.get(c.country) || 0) + 1);
        }
      });

      const exhibitionCountries = new Set<string>();
      exhibitions.forEach((e) => {
        if (e.country) exhibitionCountries.add(e.country);
      });

      const saleCountryCount = new Map<string, number>();
      sales.forEach((s) => {
        if (s.sale_country) {
          saleCountryCount.set(s.sale_country, (saleCountryCount.get(s.sale_country) || 0) + 1);
        }
      });

      const opportunities: MarketRow[] = [];
      for (const [country, count] of collectorCountries) {
        opportunities.push({
          country,
          collectors: count,
          sales: saleCountryCount.get(country) || 0,
          exhibitions: exhibitionCountries.has(country) ? 1 : 0,
        });
      }
      opportunities.sort((a, b) => b.collectors - a.collectors);
      setMarketOpportunities(opportunities);
    } catch (err) {
      console.error('Failed to fetch demand data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter markers by active layers
  useEffect(() => {
    const filtered = allMarkers.filter((m) => {
      if (m.type === 'enquiry' && !activeLayer.enquiries) return false;
      if (m.type === 'exhibition' && !activeLayer.exhibitions) return false;
      if (m.type === 'sale' && !activeLayer.sales) return false;
      if (m.type === 'collector' && !activeLayer.collectors) return false;
      return true;
    });
    setMarkers(filtered);
  }, [allMarkers, activeLayer]);

  const toggleLayer = (layer: keyof ActiveLayers) => {
    setActiveLayer((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const getStatusBadge = (row: MarketRow) => {
    if (row.exhibitions === 0 && row.sales === 0) {
      return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Cold</span>;
    }
    if (row.exhibitions > 0 && row.sales > 0) {
      return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Hot</span>;
    }
    return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Warm</span>;
  };

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
        <h1 className="text-2xl font-semibold text-gray-900">Demand Heat Map</h1>
        <p className="mt-1 text-sm text-gray-500">
          Geographic distribution of enquiries, exhibitions, sales, and collectors.
        </p>
      </div>

      {/* Layer Toggles */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => toggleLayer('enquiries')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeLayer.enquiries
              ? 'bg-blue-500 text-white'
              : 'border border-blue-500 text-blue-500 bg-white'
          }`}
        >
          Enquiries
        </button>
        <button
          onClick={() => toggleLayer('exhibitions')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeLayer.exhibitions
              ? 'bg-purple-500 text-white'
              : 'border border-purple-500 text-purple-500 bg-white'
          }`}
        >
          Exhibitions
        </button>
        <button
          onClick={() => toggleLayer('sales')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeLayer.sales
              ? 'bg-[#c9a96e] text-white'
              : 'border border-[#c9a96e] text-[#c9a96e] bg-white'
          }`}
        >
          Sales
        </button>
        <button
          onClick={() => toggleLayer('collectors')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeLayer.collectors
              ? 'bg-green-500 text-white'
              : 'border border-green-500 text-green-500 bg-white'
          }`}
        >
          Collectors
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Total Enquiries</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalEnquiries}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Exhibitions</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalExhibitions}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Sales</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalSales}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Countries Covered</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.countriesCovered}</p>
          </div>
        </Card>
      </div>

      {/* Map */}
      <Card>
        <div className="p-4">
          <MapView markers={markers} height="500px" />
        </div>
      </Card>

      {/* Legend */}
      <MapLegend
        items={[
          { label: 'Enquiries', color: '#3b82f6', count: allMarkers.filter(m => m.type === 'enquiry').length },
          { label: 'Exhibitions', color: '#8b5cf6', count: allMarkers.filter(m => m.type === 'exhibition').length },
          { label: 'Sales', color: '#c9a96e', count: allMarkers.filter(m => m.type === 'sale').length },
          { label: 'Collectors', color: '#22c55e', count: allMarkers.filter(m => m.type === 'collector').length },
        ]}
      />

      {/* Market Opportunities */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Market Opportunities</h2>
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
                    Sales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Exhibitions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {marketOpportunities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                      No market data available.
                    </td>
                  </tr>
                ) : (
                  marketOpportunities.map((row) => (
                    <tr key={row.country} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {row.country}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {row.collectors}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {row.sales}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                        {row.exhibitions}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {getStatusBadge(row)}
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
