import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { MapView, MapLegend } from '../components/maps/MapView';
import type { MapMarker } from '../components/maps/MapView';
import { getCoordinates } from '../lib/geocoding';

interface ActiveLayers {
  allEnquiries: boolean;
  qualified: boolean;
  leads: boolean;
  sales: boolean;
}

interface MarketRow {
  country: string;
  enquiries: number;
  qualified: number;
  leads: number;
  sales: number;
}

export function DemandHeatMapPage() {
  const [loading, setLoading] = useState(true);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [activeLayer, setActiveLayer] = useState<ActiveLayers>({
    allEnquiries: true,
    qualified: true,
    leads: true,
    sales: true,
  });
  const [stats, setStats] = useState({
    totalEnquiries: 0,
    qualifiedEnquiries: 0,
    totalLeads: 0,
    totalSales: 0,
    countriesCovered: 0,
  });
  const [marketOpportunities, setMarketOpportunities] = useState<MarketRow[]>([]);
  const [allMarkers, setAllMarkers] = useState<MapMarker[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: enquiriesData } = await supabase
        .from('enquiries')
        .select('id, sender_name, subject, location_city, location_country, estimated_value, currency, status');

      const enquiries = enquiriesData || [];

      // Pipeline stages — each enquiry belongs to exactly one stage
      const allEnquiryMarkers: MapMarker[] = [];    // All (light blue)
      const qualifiedMarkers: MapMarker[] = [];       // Qualified (blue)
      const leadMarkers: MapMarker[] = [];            // Lead (orange)
      const saleMarkers: MapMarker[] = [];            // Sold (gold)

      for (const e of enquiries) {
        const coords = await getCoordinates(e.location_city, e.location_country);
        if (!coords) continue;

        const base = {
          lat: coords.lat,
          lng: coords.lng,
          label: e.sender_name || e.subject || 'Enquiry',
          value: e.estimated_value ?? undefined,
          currency: e.currency ?? undefined,
        };

        // Every enquiry goes into "All Enquiries" layer
        allEnquiryMarkers.push({
          ...base,
          id: `enquiry-${e.id}`,
          type: 'enquiry',
          color: '#93c5fd',
        });

        // Additionally, place into specific pipeline stage layer
        if (e.status === 'qualified') {
          qualifiedMarkers.push({
            ...base,
            id: `qualified-${e.id}`,
            type: 'qualified',
            color: '#2563eb',
          });
        } else if (e.status === 'lead') {
          leadMarkers.push({
            ...base,
            id: `lead-${e.id}`,
            type: 'lead',
            color: '#f97316',
          });
        } else if (e.status === 'sold' || e.status === 'closed_won') {
          saleMarkers.push({
            ...base,
            id: `sale-${e.id}`,
            type: 'sale',
            color: '#c9a96e',
          });
        }
      }

      const combined = [...allEnquiryMarkers, ...qualifiedMarkers, ...leadMarkers, ...saleMarkers];
      setAllMarkers(combined);

      // Compute stats
      const allCountries = new Set<string>();
      enquiries.forEach((e) => e.location_country && allCountries.add(e.location_country));

      setStats({
        totalEnquiries: enquiries.length,
        qualifiedEnquiries: qualifiedMarkers.length,
        totalLeads: leadMarkers.length,
        totalSales: saleMarkers.length,
        countriesCovered: allCountries.size,
      });

      // Compute market opportunities by country
      const countryData = new Map<string, { enquiries: number; qualified: number; leads: number; sales: number }>();

      const addToCountry = (country: string, field: 'enquiries' | 'qualified' | 'leads' | 'sales') => {
        if (!country) return;
        const existing = countryData.get(country) || { enquiries: 0, qualified: 0, leads: 0, sales: 0 };
        existing[field]++;
        countryData.set(country, existing);
      };

      enquiries.forEach((e) => {
        addToCountry(e.location_country, 'enquiries');
        if (e.status === 'qualified') addToCountry(e.location_country, 'qualified');
        if (e.status === 'lead') addToCountry(e.location_country, 'leads');
        if (e.status === 'sold' || e.status === 'closed_won') addToCountry(e.location_country, 'sales');
      });

      const opportunities: MarketRow[] = [];
      for (const [country, data] of countryData) {
        opportunities.push({
          country,
          enquiries: data.enquiries,
          qualified: data.qualified,
          leads: data.leads,
          sales: data.sales,
        });
      }
      opportunities.sort((a, b) => (b.qualified + b.sales + b.leads) - (a.qualified + a.sales + a.leads));
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
      if (m.type === 'enquiry' && !activeLayer.allEnquiries) return false;
      if (m.type === 'qualified' && !activeLayer.qualified) return false;
      if (m.type === 'lead' && !activeLayer.leads) return false;
      if (m.type === 'sale' && !activeLayer.sales) return false;
      return true;
    });
    setMarkers(filtered);
  }, [allMarkers, activeLayer]);

  const toggleLayer = (layer: keyof ActiveLayers) => {
    setActiveLayer((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const getStatusBadge = (row: MarketRow) => {
    if (row.sales > 0) {
      return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Hot</span>;
    }
    if (row.leads > 0 || row.qualified > 0) {
      return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">Warm</span>;
    }
    return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Cold</span>;
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
          Enquiry pipeline: from first contact to sale — visualized geographically.
        </p>
      </div>

      {/* Layer Toggles */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => toggleLayer('allEnquiries')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeLayer.allEnquiries
              ? 'bg-blue-300 text-white'
              : 'border border-blue-300 text-blue-400 bg-white'
          }`}
        >
          All Enquiries ({stats.totalEnquiries})
        </button>
        <button
          onClick={() => toggleLayer('qualified')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeLayer.qualified
              ? 'bg-blue-600 text-white'
              : 'border border-blue-600 text-blue-600 bg-white'
          }`}
        >
          Qualified ({stats.qualifiedEnquiries})
        </button>
        <button
          onClick={() => toggleLayer('leads')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeLayer.leads
              ? 'bg-orange-500 text-white'
              : 'border border-orange-500 text-orange-500 bg-white'
          }`}
        >
          Leads ({stats.totalLeads})
        </button>
        <button
          onClick={() => toggleLayer('sales')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeLayer.sales
              ? 'bg-[#c9a96e] text-white'
              : 'border border-[#c9a96e] text-[#c9a96e] bg-white'
          }`}
        >
          Sales ({stats.totalSales})
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">All Enquiries</p>
            <p className="mt-1 text-2xl font-semibold text-blue-400">{stats.totalEnquiries}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Qualified</p>
            <p className="mt-1 text-2xl font-semibold text-blue-600">{stats.qualifiedEnquiries}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Leads</p>
            <p className="mt-1 text-2xl font-semibold text-orange-500">{stats.totalLeads}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Sales</p>
            <p className="mt-1 text-2xl font-semibold text-[#c9a96e]">{stats.totalSales}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-500">Countries</p>
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
          { label: 'All Enquiries', color: '#93c5fd', count: allMarkers.filter(m => m.type === 'enquiry').length },
          { label: 'Qualified', color: '#2563eb', count: allMarkers.filter(m => m.type === 'qualified').length },
          { label: 'Leads', color: '#f97316', count: allMarkers.filter(m => m.type === 'lead').length },
          { label: 'Sales', color: '#c9a96e', count: allMarkers.filter(m => m.type === 'sale').length },
        ]}
      />

      {/* Market Opportunities */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Market Opportunities by Country</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Enquiries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Qualified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Leads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Sales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {marketOpportunities.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                      No market data available.
                    </td>
                  </tr>
                ) : (
                  marketOpportunities.map((row) => (
                    <tr key={row.country} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {row.country}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-blue-400">
                        {row.enquiries}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-blue-600 font-medium">
                        {row.qualified}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-orange-500 font-medium">
                        {row.leads}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[#c9a96e] font-medium">
                        {row.sales}
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
