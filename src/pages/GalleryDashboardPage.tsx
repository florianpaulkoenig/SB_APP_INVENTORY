// ---------------------------------------------------------------------------
// NOA Inventory -- Gallery Dashboard Page
// Dashboard view for gallery-role users showing consigned artworks overview,
// revenue stats, and recent activity.
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatCurrency } from '../lib/utils';
import type { ArtworkRow, GalleryRow, DeliveryRow } from '../types/database';

// ---------------------------------------------------------------------------
// Status badge variant mapping
// ---------------------------------------------------------------------------

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'info' | 'danger'> = {
  available: 'success',
  sold: 'default',
  reserved: 'warning',
  in_production: 'info',
  in_transit: 'info',
  on_consignment: 'info',
  paid: 'success',
  pending_sale: 'warning',
  archived: 'default',
  destroyed: 'default',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleryDashboardPage() {
  const { profile } = useAuth();

  const [gallery, setGallery] = useState<GalleryRow | null>(null);
  const [artworks, setArtworks] = useState<ArtworkRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Revenue data
  const [salesRevenue, setSalesRevenue] = useState(0);
  const [pendingSaleRequests, setPendingSaleRequests] = useState(0);

  const galleryId = profile?.gallery_id;

  // ---- Fetch data ---------------------------------------------------------

  useEffect(() => {
    if (!galleryId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);

      // Fetch gallery details
      const { data: galleryData } = await supabase
        .from('galleries')
        .select('*')
        .eq('id', galleryId!)
        .single();

      if (galleryData) setGallery(galleryData as GalleryRow);

      // Fetch artworks consigned to this gallery
      const { data: artworkData } = await supabase
        .from('artworks')
        .select('*')
        .eq('gallery_id', galleryId!)
        .order('created_at', { ascending: false });

      if (artworkData) setArtworks(artworkData as ArtworkRow[]);

      // Fetch active deliveries for this gallery
      const { data: deliveryData } = await supabase
        .from('deliveries')
        .select('*')
        .eq('gallery_id', galleryId!)
        .neq('status', 'delivered')
        .order('created_at', { ascending: false });

      if (deliveryData) setDeliveries(deliveryData as DeliveryRow[]);

      // Fetch sales revenue for this gallery
      const { data: salesData } = await supabase
        .from('sales')
        .select('sale_price, currency')
        .eq('gallery_id', galleryId!);

      if (salesData) {
        const total = salesData.reduce((sum, s) => sum + (Number(s.sale_price) || 0), 0);
        setSalesRevenue(total);
      }

      // Fetch pending sale requests count
      const { count } = await supabase
        .from('sale_requests')
        .select('id', { count: 'exact', head: true })
        .eq('gallery_id', galleryId!)
        .eq('status', 'pending');

      setPendingSaleRequests(count ?? 0);

      setLoading(false);
    }

    fetchData();
  }, [galleryId]);

  // ---- Derived stats ------------------------------------------------------

  const totalConsigned = artworks.length;
  const totalSold = artworks.filter((a) => a.status === 'sold' || a.status === 'paid').length;
  const activeDeliveries = deliveries.length;

  // Potential revenue: price of unsold artworks
  const potentialRevenue = artworks
    .filter((a) => a.status !== 'sold' && a.status !== 'paid')
    .reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const recentArtworks = artworks.slice(0, 6);

  // ---- Render: no gallery configured --------------------------------------

  if (!loading && !galleryId) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-primary-900">
            Gallery Dashboard
          </h1>
        </div>
        <EmptyState
          icon={
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
              />
            </svg>
          }
          title="Your gallery profile is not configured yet"
          description="Please contact an administrator to link your account to a gallery."
        />
      </div>
    );
  }

  // ---- Render: loading ----------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ---- Render: dashboard --------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-primary-900">
          Gallery Dashboard
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          {gallery?.name ?? 'Gallery'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border border-primary-100 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
            Consigned
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-primary-900">
            {totalConsigned}
          </p>
        </div>

        <div className="rounded-lg border border-primary-100 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
            Sold
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-primary-900">
            {totalSold}
          </p>
        </div>

        <div className="rounded-lg border border-primary-100 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
            Deliveries
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-primary-900">
            {activeDeliveries}
          </p>
        </div>

        <div className="rounded-lg border border-primary-100 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
            Sales Revenue
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-700">
            {formatCurrency(salesRevenue, 'EUR')}
          </p>
        </div>

        <div className="rounded-lg border border-primary-100 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
            Potential Revenue
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-blue-700">
            {formatCurrency(potentialRevenue, 'EUR')}
          </p>
        </div>

        <div className="rounded-lg border border-primary-100 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-600">
            Pending Sales
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-amber-700">
            {pendingSaleRequests}
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Link to="/gallery/artworks">
          <Button variant="outline" size="sm">My Artworks</Button>
        </Link>
        <Link to="/gallery/deliveries">
          <Button variant="outline" size="sm">Deliveries</Button>
        </Link>
        <Link to="/gallery/certificates">
          <Button variant="outline" size="sm">Certificates</Button>
        </Link>
        <Link to="/gallery/media">
          <Button variant="outline" size="sm">Media Library</Button>
        </Link>
        <Link to="/gallery/news">
          <Button variant="outline" size="sm">News</Button>
        </Link>
      </div>

      {/* Recent artworks */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-primary-900">
          Recent Artworks
        </h2>
        <Link to="/gallery/artworks">
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </Link>
      </div>

      {recentArtworks.length === 0 ? (
        <EmptyState
          title="No artworks yet"
          description="Artworks consigned to your gallery will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentArtworks.map((artwork) => (
            <Card key={artwork.id} className="overflow-hidden">
              {/* Image placeholder */}
              <div className="flex h-40 items-center justify-center bg-primary-50">
                <svg
                  className="h-10 w-10 text-primary-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z"
                  />
                </svg>
              </div>

              {/* Card body */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-primary-900 truncate">
                  {artwork.title}
                </h3>
                <div className="mt-1 flex items-center justify-between">
                  <Badge variant={STATUS_BADGE_VARIANT[artwork.status] ?? 'default'}>
                    {artwork.status.replace(/_/g, ' ')}
                  </Badge>
                  {artwork.price != null && (
                    <span className="text-xs text-primary-500">
                      {formatCurrency(Number(artwork.price), artwork.currency ?? 'EUR')}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
