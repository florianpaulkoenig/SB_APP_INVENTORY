import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGalleries } from '../hooks/useGalleries';
import { useExchangeRates } from '../hooks/useExchangeRates';
import { GalleryCard } from '../components/galleries/GalleryCard';
import { GalleryTable } from '../components/galleries/GalleryTable';
import type { GalleryStats } from '../components/galleries/GalleryCard';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { GALLERY_TYPES } from '../lib/constants';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 24;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleriesPage() {
  const navigate = useNavigate();
  const { toCHF, ready: ratesReady } = useExchangeRates();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try { return (localStorage.getItem('noa-gallery-view') as 'grid' | 'list') || 'grid'; } catch { return 'grid'; }
  });

  function handleViewMode(mode: 'grid' | 'list') {
    setViewMode(mode);
    try { localStorage.setItem('noa-gallery-view', mode); } catch { /* noop */ }
  }

  const { galleries, loading, totalCount } = useGalleries({
    filters: { search, sortBy, sortOrder: sortBy === 'status_color' ? 'desc' : 'asc' },
    page,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ---- Fetch category counts (unfiltered) -----------------------------------
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [totalGalleries, setTotalGalleries] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('galleries')
        .select('type');
      if (!data) return;
      setTotalGalleries(data.length);
      const counts: Record<string, number> = {};
      for (const row of data) {
        const t = row.type || 'unknown';
        counts[t] = (counts[t] || 0) + 1;
      }
      setCategoryCounts(counts);
    })();
  }, [galleries]); // refetch when galleries list changes

  // ---- Fetch per-gallery stats ----------------------------------------------
  const [galleryStats, setGalleryStats] = useState<Record<string, GalleryStats>>({});

  const fetchGalleryStats = useCallback(async () => {
    if (galleries.length === 0 || !ratesReady) {
      setGalleryStats({});
      return;
    }

    const galleryIds = galleries.map((g) => g.id);

    // Phase 1: Artworks + Sales + Production Orders in parallel
    const [artworksRes, salesRes, ordersRes] = await Promise.all([
      supabase
        .from('artworks')
        .select('id, gallery_id, status, price, currency')
        .in('gallery_id', galleryIds),
      supabase
        .from('sales')
        .select('sale_price, currency, gallery_id')
        .in('gallery_id', galleryIds),
      supabase
        .from('production_orders')
        .select('id, gallery_id, status')
        .in('gallery_id', galleryIds)
        .not('status', 'in', '("draft","in_production","completed")'),
    ]);

    const artworks = artworksRes.data ?? [];
    const sales = salesRes.data ?? [];
    const orders = ordersRes.data ?? [];

    // Phase 2: Fetch order items for active orders
    const activeOrderIds = orders.map((o) => o.id);
    let orderItems: { production_order_id: string; quantity: number; price: number | null; currency: string }[] = [];

    if (activeOrderIds.length > 0) {
      const { data } = await supabase
        .from('production_order_items')
        .select('production_order_id, quantity, price, currency')
        .in('production_order_id', activeOrderIds);
      orderItems = (data ?? []) as typeof orderItems;
    }

    // Build order→gallery map
    const orderGalleryMap = new Map<string, string>();
    for (const o of orders) {
      if (o.gallery_id) orderGalleryMap.set(o.id, o.gallery_id);
    }

    // Aggregate stats per gallery
    const stats: Record<string, GalleryStats> = {};

    const ensure = (gId: string) => {
      if (!stats[gId]) {
        stats[gId] = { total: 0, onConsignment: 0, sold: 0, ordered: 0, revenueSold: 0, revenuePotential: 0, revenueOrdered: 0 };
      }
    };

    // Artworks
    for (const a of artworks) {
      if (!a.gallery_id) continue;
      ensure(a.gallery_id);
      if (a.status === 'archived' || a.status === 'destroyed') continue; // Skip archived/destroyed from counts
      stats[a.gallery_id].total += 1;
      if (a.status === 'on_consignment') stats[a.gallery_id].onConsignment += 1;
      if (a.status === 'sold') stats[a.gallery_id].sold += 1;
      // Potential revenue: unsold artworks with price (exclude archived/destroyed)
      if (a.status !== 'sold' && a.status !== 'archived' && a.status !== 'destroyed' && a.price && a.price > 0) {
        stats[a.gallery_id].revenuePotential += toCHF(a.price, a.currency ?? 'EUR');
      }
    }

    // Sales revenue
    for (const s of sales) {
      if (!s.gallery_id) continue;
      ensure(s.gallery_id);
      stats[s.gallery_id].revenueSold += toCHF(s.sale_price ?? 0, s.currency ?? 'EUR');
    }

    // Order items → ordered count + ordered revenue
    for (const item of orderItems) {
      const gId = orderGalleryMap.get(item.production_order_id);
      if (!gId) continue;
      ensure(gId);
      stats[gId].ordered += item.quantity ?? 0;
      if (item.price && item.quantity) {
        stats[gId].revenueOrdered += toCHF(item.price * item.quantity, item.currency ?? 'EUR');
      }
    }

    setGalleryStats(stats);
  }, [galleries, ratesReady, toCHF]);

  useEffect(() => {
    fetchGalleryStats();
  }, [fetchGalleryStats]);

  // Reset to page 1 when search changes
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Galleries
            {!loading && totalGalleries > 0 && (
              <span className="ml-2 align-middle text-base font-normal text-primary-400">
                ({totalGalleries})
              </span>
            )}
          </h1>
          {!loading && totalGalleries > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {GALLERY_TYPES.map((gt) => {
                const count = categoryCounts[gt.value] || 0;
                if (count === 0) return null;
                return (
                  <span
                    key={gt.value}
                    className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-600"
                  >
                    {gt.label}
                    <span className="font-semibold text-primary-800">{count}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <Button onClick={() => navigate('/galleries/new')}>
          New Gallery
        </Button>
      </div>

      {/* Search & Sort */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search galleries by name, city, or country..."
          className="max-w-md"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-primary-400 whitespace-nowrap">Sort by</span>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm text-primary-700 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="name">Name</option>
            <option value="status_color">Color</option>
            <option value="type">Category</option>
          </select>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center rounded-md border border-primary-200 bg-white">
          <button
            type="button"
            onClick={() => handleViewMode('grid')}
            className={`p-1.5 ${viewMode === 'grid' ? 'bg-primary-100 text-primary-800' : 'text-primary-400 hover:text-primary-600'}`}
            title="Grid view"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleViewMode('list')}
            className={`p-1.5 ${viewMode === 'list' ? 'bg-primary-100 text-primary-800' : 'text-primary-400 hover:text-primary-600'}`}
            title="List view"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && galleries.length === 0 && (
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
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
              />
            </svg>
          }
          title={search ? 'No galleries found' : 'No galleries yet'}
          description={
            search
              ? 'Try adjusting your search terms.'
              : 'Add your first gallery to start tracking consignment partners.'
          }
          action={
            !search ? (
              <Button onClick={() => navigate('/galleries/new')}>
                Add First Gallery
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Gallery grid / list */}
      {!loading && galleries.length > 0 && (
        <>
          {viewMode === 'list' ? (
            <GalleryTable
              galleries={galleries}
              galleryStats={galleryStats}
              onGalleryClick={(id) => navigate(`/galleries/${id}`)}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galleries.map((gallery) => (
                <GalleryCard
                  key={gallery.id}
                  gallery={gallery}
                  stats={galleryStats[gallery.id]}
                  onClick={() => navigate(`/galleries/${gallery.id}`)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
