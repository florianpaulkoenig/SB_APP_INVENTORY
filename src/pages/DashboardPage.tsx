// ---------------------------------------------------------------------------
// DashboardPage -- artwork inventory dashboard with live stats
// All monetary values converted to CHF using daily exchange rates
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface DashboardStats {
  total: number;
  available: number;
  onConsignment: number;
  sold: number;
  reserved: number;
  inProduction: number;
  inTransit: number;
}

interface GalleryCount {
  id: string;
  name: string;
  count: number;
  onConsignment: number;
  sold: number;
  available: number;
}

interface GalleryRevenue {
  id: string;
  name: string;
  revenue: number; // already in CHF
}

interface GalleryPotential {
  id: string;
  name: string;
  potential: number; // already in CHF
}

// Raw data interfaces (before currency conversion)
interface RawArtwork {
  status: string;
  gallery_id: string | null;
  price: number | null;
  currency: string | null;
}

interface RawSale {
  sale_price: number | null;
  currency: string | null;
  gallery_id: string | null;
}

interface RawProdOrder {
  price: number | null;
  currency: string | null;
  status: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { toCHF, ready: ratesReady } = useExchangeRates();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [galleryCounts, setGalleryCounts] = useState<GalleryCount[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPotential, setTotalPotential] = useState(0);
  const [confirmedOrdersRevenue, setConfirmedOrdersRevenue] = useState(0);
  const [galleryRevenues, setGalleryRevenues] = useState<GalleryRevenue[]>([]);
  const [galleryPotentials, setGalleryPotentials] = useState<GalleryPotential[]>([]);
  const [loading, setLoading] = useState(true);

  // Store raw data so we can re-compute when exchange rates arrive
  const [rawArtworks, setRawArtworks] = useState<RawArtwork[]>([]);
  const [rawSales, setRawSales] = useState<RawSale[]>([]);
  const [rawProdOrders, setRawProdOrders] = useState<RawProdOrder[]>([]);
  const [galleryNameMap, setGalleryNameMap] = useState<Record<string, string>>({});

  // ---- Fetch raw data from Supabase (currency-agnostic) -------------------

  const fetchRawData = useCallback(async () => {
    // Fetch artworks
    const { data: artworks, error } = await supabase
      .from('artworks')
      .select('status, gallery_id, price, currency');

    if (error || !artworks) {
      setLoading(false);
      return;
    }

    setRawArtworks(artworks);

    // Stat counts (no currency needed)
    setStats({
      total: artworks.length,
      available: artworks.filter((a) => a.status === 'available').length,
      onConsignment: artworks.filter((a) => a.status === 'on_consignment').length,
      sold: artworks.filter((a) => a.status === 'sold').length,
      reserved: artworks.filter((a) => a.status === 'reserved').length,
      inProduction: artworks.filter((a) => a.status === 'in_production').length,
      inTransit: artworks.filter((a) => a.status === 'in_transit').length,
    });

    // Gallery counts (no currency needed)
    const galleryIdCounts: Record<string, number> = {};
    const galleryConsignment: Record<string, number> = {};
    const gallerySold: Record<string, number> = {};
    const galleryAvailable: Record<string, number> = {};
    for (const row of artworks) {
      if (row.gallery_id) {
        galleryIdCounts[row.gallery_id] = (galleryIdCounts[row.gallery_id] || 0) + 1;
        if (row.status === 'on_consignment') {
          galleryConsignment[row.gallery_id] = (galleryConsignment[row.gallery_id] || 0) + 1;
        } else if (row.status === 'sold') {
          gallerySold[row.gallery_id] = (gallerySold[row.gallery_id] || 0) + 1;
        } else if (row.status === 'available') {
          galleryAvailable[row.gallery_id] = (galleryAvailable[row.gallery_id] || 0) + 1;
        }
      }
    }

    // Fetch production orders
    const { data: prodOrders } = await supabase
      .from('production_orders')
      .select('price, currency, status')
      .not('status', 'in', '("draft","completed")');
    setRawProdOrders(prodOrders ?? []);

    // Fetch sales
    const { data: sales } = await supabase
      .from('sales')
      .select('sale_price, currency, gallery_id');
    setRawSales(sales ?? []);

    // Collect all gallery IDs
    const allGalleryIds = new Set<string>();
    for (const row of artworks) {
      if (row.gallery_id) allGalleryIds.add(row.gallery_id);
    }
    for (const sale of sales ?? []) {
      if (sale.gallery_id) allGalleryIds.add(sale.gallery_id);
    }

    // Fetch gallery names
    const galleryIds = Array.from(allGalleryIds);
    const nameMap: Record<string, string> = {};
    if (galleryIds.length > 0) {
      const { data: galleries } = await supabase
        .from('galleries')
        .select('id, name')
        .in('id', galleryIds);
      for (const g of galleries ?? []) {
        nameMap[g.id] = g.name;
      }
    }
    setGalleryNameMap(nameMap);

    // Set gallery counts
    const counts: GalleryCount[] = galleryIds
      .filter((gId) => galleryIdCounts[gId])
      .map((gId) => ({
        id: gId,
        name: nameMap[gId] || 'Unknown',
        count: galleryIdCounts[gId] || 0,
        onConsignment: galleryConsignment[gId] || 0,
        sold: gallerySold[gId] || 0,
        available: galleryAvailable[gId] || 0,
      }))
      .sort((a, b) => b.count - a.count);
    setGalleryCounts(counts);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRawData();
  }, [fetchRawData]);

  // ---- Re-compute monetary values when exchange rates are ready -----------

  useEffect(() => {
    if (!ratesReady || rawArtworks.length === 0 && rawSales.length === 0 && rawProdOrders.length === 0) return;

    // ---- Total potential revenue (unsold artworks → CHF) ----
    const unsold = rawArtworks.filter((a) => a.status !== 'sold' && a.price != null && a.price > 0);
    const potentialTotal = unsold.reduce(
      (sum, a) => sum + toCHF(a.price ?? 0, a.currency ?? 'EUR'),
      0,
    );
    setTotalPotential(potentialTotal);

    // Potential per gallery (CHF)
    const galleryPotentialMap: Record<string, number> = {};
    for (const row of unsold) {
      if (row.gallery_id) {
        galleryPotentialMap[row.gallery_id] =
          (galleryPotentialMap[row.gallery_id] || 0) + toCHF(row.price ?? 0, row.currency ?? 'EUR');
      }
    }

    const potentials: GalleryPotential[] = Object.entries(galleryPotentialMap)
      .map(([gId, pot]) => ({
        id: gId,
        name: galleryNameMap[gId] || 'Unknown',
        potential: pot,
      }))
      .sort((a, b) => b.potential - a.potential);
    setGalleryPotentials(potentials);

    // ---- Confirmed production orders revenue (CHF) ----
    const confirmedTotal = rawProdOrders.reduce(
      (sum, o) => sum + (o.price != null && o.price > 0 ? toCHF(o.price, o.currency ?? 'EUR') : 0),
      0,
    );
    setConfirmedOrdersRevenue(confirmedTotal);

    // ---- Sales revenue (CHF) ----
    const revenueTotal = rawSales.reduce(
      (sum, s) => sum + toCHF(s.sale_price ?? 0, s.currency ?? 'EUR'),
      0,
    );
    setTotalRevenue(revenueTotal);

    // Revenue per gallery (CHF)
    const galleryRevenueMap: Record<string, number> = {};
    for (const sale of rawSales) {
      if (sale.gallery_id) {
        galleryRevenueMap[sale.gallery_id] =
          (galleryRevenueMap[sale.gallery_id] || 0) + toCHF(sale.sale_price ?? 0, sale.currency ?? 'EUR');
      }
    }

    const revenues: GalleryRevenue[] = Object.entries(galleryRevenueMap)
      .map(([gId, rev]) => ({
        id: gId,
        name: galleryNameMap[gId] || 'Unknown',
        revenue: rev,
      }))
      .sort((a, b) => b.revenue - a.revenue);
    setGalleryRevenues(revenues);
  }, [ratesReady, toCHF, rawArtworks, rawSales, rawProdOrders, galleryNameMap]);

  // ---- Stat cards ---------------------------------------------------------

  const statCards = stats
    ? [
        { label: 'Total Artworks', value: stats.total, onClick: () => navigate('/artworks') },
        { label: 'Available', value: stats.available, color: 'text-emerald-600' },
        { label: 'On Consignment', value: stats.onConsignment, color: 'text-sky-600' },
        { label: 'Sold', value: stats.sold, color: 'text-red-600' },
        { label: 'Reserved', value: stats.reserved, color: 'text-amber-600' },
        { label: 'In Production', value: stats.inProduction, color: 'text-blue-600' },
      ]
    : [];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-primary-900">
          Welcome to NOA Inventory
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Your artwork management dashboard
        </p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((stat) => (
            <button
              key={stat.label}
              type="button"
              onClick={stat.onClick}
              className="rounded-lg border border-primary-100 bg-white p-6 text-left transition-shadow hover:shadow-md"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                {stat.label}
              </p>
              <p className={`mt-2 font-display text-3xl font-bold ${stat.color ?? 'text-primary-900'}`}>
                {stat.value}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Revenue Summary Cards */}
      {!loading && (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-primary-100 bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
              Total Revenue (Sales)
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-emerald-600">
              {formatCurrency(totalRevenue, 'CHF')}
            </p>
          </div>
          <div className="rounded-lg border border-primary-100 bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
              Total Potential Revenue
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-accent">
              {formatCurrency(totalPotential, 'CHF')}
            </p>
            <p className="mt-1 text-xs text-primary-400">
              Unsold artworks with prices
            </p>
          </div>
          <div
            className="cursor-pointer rounded-lg border border-primary-100 bg-white p-6 transition-shadow hover:shadow-md"
            onClick={() => navigate('/production')}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
              Confirmed Orders Revenue
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-blue-600">
              {formatCurrency(confirmedOrdersRevenue, 'CHF')}
            </p>
            <p className="mt-1 text-xs text-primary-400">
              Active production orders
            </p>
          </div>
        </div>
      )}

      {/* Artworks per Gallery */}
      {!loading && galleryCounts.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Artworks per Gallery
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {galleryCounts.map((gc) => (
              <button
                key={gc.id}
                type="button"
                onClick={() => navigate(`/galleries/${gc.id}`)}
                className="rounded-lg border border-primary-100 bg-white px-5 py-4 text-left transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="truncate font-display text-sm font-semibold text-primary-900">
                    {gc.name}
                  </span>
                  <span className="ml-3 flex-shrink-0 rounded-full bg-sky-50 px-3 py-1 font-display text-lg font-bold text-sky-600">
                    {gc.count}
                  </span>
                </div>
                <div className="mt-2 flex gap-3 text-xs">
                  {gc.onConsignment > 0 && (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
                      {gc.onConsignment} consignment
                    </span>
                  )}
                  {gc.sold > 0 && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                      {gc.sold} sold
                    </span>
                  )}
                  {gc.available > 0 && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                      {gc.available} available
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Revenue per Gallery */}
      {!loading && galleryRevenues.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Revenue per Gallery
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {galleryRevenues.map((gr) => (
              <button
                key={gr.id}
                type="button"
                onClick={() => navigate(`/galleries/${gr.id}`)}
                className="flex items-center justify-between rounded-lg border border-primary-100 bg-white px-5 py-4 text-left transition-shadow hover:shadow-md"
              >
                <span className="truncate font-display text-sm font-semibold text-primary-900">
                  {gr.name}
                </span>
                <span className="ml-3 flex-shrink-0 rounded-full bg-emerald-50 px-3 py-1 font-display text-sm font-bold text-emerald-600">
                  {formatCurrency(gr.revenue, 'CHF')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Potential Revenue per Gallery */}
      {!loading && galleryPotentials.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
            Potential Revenue per Gallery
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {galleryPotentials.map((gp) => (
              <button
                key={gp.id}
                type="button"
                onClick={() => navigate(`/galleries/${gp.id}`)}
                className="flex items-center justify-between rounded-lg border border-primary-100 bg-white px-5 py-4 text-left transition-shadow hover:shadow-md"
              >
                <span className="truncate font-display text-sm font-semibold text-primary-900">
                  {gp.name}
                </span>
                <span className="ml-3 flex-shrink-0 rounded-full bg-amber-50 px-3 py-1 font-display text-sm font-bold text-amber-600">
                  {formatCurrency(gp.potential, 'CHF')}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
