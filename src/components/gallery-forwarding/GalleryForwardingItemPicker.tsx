// ---------------------------------------------------------------------------
// NOA Inventory -- Gallery Forwarding Item Picker (Grid-based, Catalogue-style)
// Single-add artwork picker with thumbnails, search, filters, and pagination.
// Matches the CatalogueArtworkPicker grid layout.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { SearchInput } from '../ui/SearchInput';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { GallerySelect } from '../galleries/GallerySelect';
import {
  ARTWORK_CATEGORIES,
  ARTWORK_STATUSES,
  ARTWORK_SERIES,
} from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { sanitizeFilterTerm } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Lightweight artwork record for the picker grid
// ---------------------------------------------------------------------------

interface PickerArtwork {
  id: string;
  title: string;
  reference_code: string;
  medium: string | null;
  year: number | null;
  status: string;
  category: string | null;
  series: string | null;
  imageUrl: string | null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GalleryForwardingItemPickerProps {
  existingArtworkIds: string[];
  onAdd: (artworkId: string) => Promise<void>;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 24;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GalleryForwardingItemPicker({
  existingArtworkIds,
  onAdd,
  onClose: _onClose,
}: GalleryForwardingItemPickerProps) {
  const [artworks, setArtworks] = useState<PickerArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [galleryFilter, setGalleryFilter] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, categoryFilter, statusFilter, seriesFilter, galleryFilter]);

  // ---- Fetch artworks with filters ------------------------------------------

  const fetchArtworks = useCallback(async () => {
    setLoading(true);

    const applyFilters = (q: ReturnType<typeof supabase.from>) => {
      let query = q;

      if (search) {
        const term = `%${sanitizeFilterTerm(search)}%`;
        query = query.or(`title.ilike.${term},reference_code.ilike.${term}`) as typeof query;
      }
      if (categoryFilter) query = query.eq('category', categoryFilter) as typeof query;
      if (statusFilter) query = query.eq('status', statusFilter) as typeof query;
      if (seriesFilter) query = query.eq('series', seriesFilter) as typeof query;
      if (galleryFilter) query = query.eq('gallery_id', galleryFilter) as typeof query;

      if (existingArtworkIds.length > 0) {
        query = query.not('id', 'in', `(${existingArtworkIds.join(',')})`) as typeof query;
      }

      return query;
    };

    const countQuery = applyFilters(
      supabase.from('artworks').select('id', { count: 'exact', head: true }),
    );

    let dataQuery = applyFilters(
      supabase
        .from('artworks')
        .select('id, title, reference_code, medium, year, status, category, series')
        .order('title', { ascending: true }),
    );
    dataQuery = dataQuery.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const [{ data, error }, { count }] = await Promise.all([dataQuery, countQuery]);

    if (error) {
      setArtworks([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setTotalCount(count ?? 0);

    // Fetch primary image URLs
    const artworkIds = (data ?? []).map((a: { id: string }) => a.id);
    let imageMap: Record<string, string> = {};

    if (artworkIds.length > 0) {
      const { data: images } = await supabase
        .from('artwork_images')
        .select('artwork_id, storage_path')
        .in('artwork_id', artworkIds)
        .eq('is_primary', true);

      if (images && images.length > 0) {
        const urls = await Promise.all(
          images.map(async (img) => {
            const { data: urlData } = await supabase.storage
              .from('artwork-images')
              .createSignedUrl(img.storage_path, 600);
            return { artworkId: img.artwork_id, url: urlData?.signedUrl ?? null };
          }),
        );
        imageMap = urls.reduce(
          (acc, { artworkId, url }) => {
            if (url) acc[artworkId] = url;
            return acc;
          },
          {} as Record<string, string>,
        );
      }
    }

    const mapped: PickerArtwork[] = (data ?? []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      title: a.title as string,
      reference_code: a.reference_code as string,
      medium: (a.medium as string | null) ?? null,
      year: (a.year as number | null) ?? null,
      status: a.status as string,
      category: (a.category as string | null) ?? null,
      series: (a.series as string | null) ?? null,
      imageUrl: imageMap[a.id as string] ?? null,
    }));

    setArtworks(mapped);
    setLoading(false);
  }, [search, categoryFilter, statusFilter, seriesFilter, galleryFilter, page, existingArtworkIds]);

  useEffect(() => {
    fetchArtworks();
  }, [fetchArtworks]);

  // ---- Add handler ----------------------------------------------------------

  async function handleAdd(artworkId: string) {
    setAddingId(artworkId);
    try {
      await onAdd(artworkId);
    } finally {
      setAddingId(null);
    }
  }

  // ---- Clear filters --------------------------------------------------------

  function handleClearFilters() {
    setSearch('');
    setCategoryFilter('');
    setStatusFilter('');
    setSeriesFilter('');
    setGalleryFilter(null);
  }

  const hasActiveFilters =
    search || categoryFilter || statusFilter || seriesFilter || galleryFilter;

  // ---- Pagination -----------------------------------------------------------

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ---- Status badge helper --------------------------------------------------

  function getStatusLabel(status: string) {
    return ARTWORK_STATUSES.find((s) => s.value === status)?.label ?? status.replace(/_/g, ' ');
  }

  function getStatusColor(status: string) {
    return ARTWORK_STATUSES.find((s) => s.value === status)?.color ?? 'bg-gray-100 text-gray-600';
  }

  // ---- Filter options -------------------------------------------------------

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...ARTWORK_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...ARTWORK_STATUSES.map((s) => ({ value: s.value, label: s.label })),
  ];

  const seriesOptions = [
    { value: '', label: 'All Series' },
    ...ARTWORK_SERIES.map((s) => ({ value: s.value, label: s.label })),
  ];

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by title or reference code..."
      />

      {/* Filters row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select
          options={categoryOptions}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        />
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <Select
          options={seriesOptions}
          value={seriesFilter}
          onChange={(e) => setSeriesFilter(e.target.value)}
        />
        <GallerySelect
          value={galleryFilter}
          onChange={setGalleryFilter}
          label=""
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
        <span className="text-xs text-primary-400">
          {totalCount} artwork{totalCount !== 1 ? 's' : ''} available
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Empty */}
      {!loading && artworks.length === 0 && (
        <div className="py-12 text-center text-sm text-primary-400">
          {search.trim()
            ? 'No artworks found matching your search.'
            : 'No available artworks to add.'}
        </div>
      )}

      {/* Artwork grid */}
      {!loading && artworks.length > 0 && (
        <div className="grid max-h-[520px] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
          {artworks.map((artwork) => (
            <div
              key={artwork.id}
              className="group relative rounded-lg border-2 border-primary-200 bg-white p-2 transition-all hover:border-primary-300 hover:shadow-md"
            >
              {/* Thumbnail */}
              <div className="aspect-square w-full overflow-hidden rounded bg-primary-100">
                {artwork.imageUrl ? (
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg
                      className="h-8 w-8 text-primary-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="mt-2 space-y-1">
                <p className="truncate text-sm font-medium text-primary-900">
                  {artwork.title}
                </p>
                <p className="truncate text-xs text-primary-500">
                  {artwork.reference_code}
                </p>
                {artwork.year && (
                  <p className="text-xs text-primary-400">{artwork.year}</p>
                )}
                {/* Status badge */}
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(artwork.status)}`}
                >
                  {getStatusLabel(artwork.status)}
                </span>
              </div>

              {/* Add button */}
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleAdd(artwork.id)}
                  loading={addingId === artwork.id}
                  disabled={addingId !== null}
                >
                  Add
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-primary-100 pt-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-primary-600">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
