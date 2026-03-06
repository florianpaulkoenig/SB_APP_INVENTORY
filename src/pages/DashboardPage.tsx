// ---------------------------------------------------------------------------
// DashboardPage -- artwork inventory dashboard with live stats
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
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
}

interface GalleryRevenue {
  id: string;
  name: string;
  revenue: number;
  currency: string;
}

interface GalleryPotential {
  id: string;
  name: string;
  potential: number;
  currency: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [galleryCounts, setGalleryCounts] = useState<GalleryCount[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPotential, setTotalPotential] = useState(0);
  const [galleryRevenues, setGalleryRevenues] = useState<GalleryRevenue[]>([]);
  const [galleryPotentials, setGalleryPotentials] = useState<GalleryPotential[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    // Fetch artworks with gallery_id, price, currency, status
    const { data, error } = await supabase
      .from('artworks')
      .select('status, gallery_id, price, currency');

    if (error || !data) {
      setLoading(false);
      return;
    }

    setStats({
      total: data.length,
      available: data.filter((a) => a.status === 'available').length,
      onConsignment: data.filter((a) => a.status === 'on_consignment').length,
      sold: data.filter((a) => a.status === 'sold').length,
      reserved: data.filter((a) => a.status === 'reserved').length,
      inProduction: data.filter((a) => a.status === 'in_production').length,
      inTransit: data.filter((a) => a.status === 'in_transit').length,
    });

    // Count artworks per gallery
    const galleryIdCounts: Record<string, number> = {};
    for (const row of data) {
      if (row.gallery_id) {
        galleryIdCounts[row.gallery_id] = (galleryIdCounts[row.gallery_id] || 0) + 1;
      }
    }

    // ---- Total potential revenue (unsold artworks with prices) ----
    const unsold = data.filter((a) => a.status !== 'sold' && a.price != null && a.price > 0);
    const potentialTotal = unsold.reduce((sum, a) => sum + (a.price ?? 0), 0);
    setTotalPotential(potentialTotal);

    // Potential revenue per gallery
    const galleryPotentialMap: Record<string, number> = {};
    for (const row of unsold) {
      if (row.gallery_id) {
        galleryPotentialMap[row.gallery_id] = (galleryPotentialMap[row.gallery_id] || 0) + (row.price ?? 0);
      }
    }

    // ---- Fetch sales for revenue ----
    const { data: sales } = await supabase
      .from('sales')
      .select('sale_price, currency, gallery_id');

    const revenueTotal = (sales ?? []).reduce((sum, s) => sum + (s.sale_price ?? 0), 0);
    setTotalRevenue(revenueTotal);

    // Revenue per gallery
    const galleryRevenueMap: Record<string, number> = {};
    for (const sale of sales ?? []) {
      if (sale.gallery_id) {
        galleryRevenueMap[sale.gallery_id] = (galleryRevenueMap[sale.gallery_id] || 0) + (sale.sale_price ?? 0);
      }
    }

    // Collect all gallery IDs from counts, revenue, and potential
    const allGalleryIds = new Set([
      ...Object.keys(galleryIdCounts),
      ...Object.keys(galleryRevenueMap),
      ...Object.keys(galleryPotentialMap),
    ]);

    // Fetch gallery names
    const galleryIds = Array.from(allGalleryIds);
    if (galleryIds.length > 0) {
      const { data: galleries } = await supabase
        .from('galleries')
        .select('id, name')
        .in('id', galleryIds);

      if (galleries) {
        const galleryNameMap: Record<string, string> = {};
        for (const g of galleries) {
          galleryNameMap[g.id] = g.name;
        }

        // Artwork counts
        const counts: GalleryCount[] = galleries
          .filter((g) => galleryIdCounts[g.id])
          .map((g) => ({
            id: g.id,
            name: g.name,
            count: galleryIdCounts[g.id] || 0,
          }))
          .sort((a, b) => b.count - a.count);
        setGalleryCounts(counts);

        // Revenue per gallery
        const revenues: GalleryRevenue[] = Object.entries(galleryRevenueMap)
          .map(([gId, rev]) => ({
            id: gId,
            name: galleryNameMap[gId] || 'Unknown',
            revenue: rev,
            currency: 'EUR',
          }))
          .sort((a, b) => b.revenue - a.revenue);
        setGalleryRevenues(revenues);

        // Potential revenue per gallery
        const potentials: GalleryPotential[] = Object.entries(galleryPotentialMap)
          .map(([gId, pot]) => ({
            id: gId,
            name: galleryNameMap[gId] || 'Unknown',
            potential: pot,
            currency: 'EUR',
          }))
          .sort((a, b) => b.potential - a.potential);
        setGalleryPotentials(potentials);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-primary-100 bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
              Total Revenue (Sales)
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-emerald-600">
              {formatCurrency(totalRevenue, 'EUR')}
            </p>
          </div>
          <div className="rounded-lg border border-primary-100 bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
              Total Potential Revenue
            </p>
            <p className="mt-2 font-display text-3xl font-bold text-accent">
              {formatCurrency(totalPotential, 'EUR')}
            </p>
            <p className="mt-1 text-xs text-primary-400">
              Unsold artworks with prices
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
                className="flex items-center justify-between rounded-lg border border-primary-100 bg-white px-5 py-4 text-left transition-shadow hover:shadow-md"
              >
                <span className="truncate font-display text-sm font-semibold text-primary-900">
                  {gc.name}
                </span>
                <span className="ml-3 flex-shrink-0 rounded-full bg-sky-50 px-3 py-1 font-display text-lg font-bold text-sky-600">
                  {gc.count}
                </span>
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
                  {formatCurrency(gr.revenue, gr.currency)}
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
                  {formatCurrency(gp.potential, gp.currency)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
