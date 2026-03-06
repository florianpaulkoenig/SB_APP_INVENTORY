// ---------------------------------------------------------------------------
// DashboardPage -- artwork inventory dashboard with live stats
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [galleryCounts, setGalleryCounts] = useState<GalleryCount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    // Fetch artworks with gallery_id
    const { data, error } = await supabase
      .from('artworks')
      .select('status, gallery_id');

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

    // Fetch gallery names
    const galleryIds = Object.keys(galleryIdCounts);
    if (galleryIds.length > 0) {
      const { data: galleries } = await supabase
        .from('galleries')
        .select('id, name')
        .in('id', galleryIds);

      if (galleries) {
        const counts: GalleryCount[] = galleries
          .map((g) => ({
            id: g.id,
            name: g.name,
            count: galleryIdCounts[g.id] || 0,
          }))
          .sort((a, b) => b.count - a.count);
        setGalleryCounts(counts);
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
    </div>
  );
}
