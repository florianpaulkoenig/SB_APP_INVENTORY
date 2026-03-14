// ---------------------------------------------------------------------------
// NOA Inventory -- Delivery Item Picker (Grid-based, Catalogue-style)
// Multi-select artwork picker with thumbnails, search, filters, shift-click
// bulk selection, and pagination. Filters out already-added items.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useRef } from 'react';
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
  price: number | null;
  currency: string;
  status: string;
  category: string | null;
  series: string | null;
  imageUrl: string | null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DeliveryItemPickerProps {
  deliveryId: string;
  existingItemIds: string[];
  onSubmit: (artworkIds: string[]) => Promise<void>;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 24;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeliveryItemPicker({
  deliveryId: _deliveryId,
  existingItemIds,
  onSubmit,
  onCancel,
}: DeliveryItemPickerProps) {
  const [artworks, setArtworks] = useState<PickerArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [seriesFilter, setSeriesFilter] = useState('');
  const [galleryFilter, setGalleryFilter] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);

  // Shift-click tracking
  const lastClickedRef = useRef<string | null>(null);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, categoryFilter, statusFilter, seriesFilter, galleryFilter]);

  // ---- Fetch artworks with filters ------------------------------------------

  const fetchArtworks = useCallback(async () => {
    setLoading(true);

    // Build base filters (shared between count and data queries)
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

      // Exclude already-added items
      if (existingItemIds.length > 0) {
        query = query.not('id', 'in', `(${existingItemIds.join(',')})`) as typeof query;
      }

      return query;
    };

    const countQuery = applyFilters(
      supabase.from('artworks').select('id', { count: 'exact', head: true }),
    );

    let dataQuery = applyFilters(
      supabase
        .from('artworks')
        .select('id, title, reference_code, medium, year, price, currency, status, category, series')
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
      price: (a.price as number | null) ?? null,
      currency: (a.currency as string) ?? 'EUR',
      status: a.status as string,
      category: (a.category as string | null) ?? null,
      series: (a.series as string | null) ?? null,
      imageUrl: imageMap[a.id as string] ?? null,
    }));

    setArtworks(mapped);
    setLoading(false);
  }, [search, categoryFilter, statusFilter, seriesFilter, galleryFilter, page, existingItemIds]);

  useEffect(() => {
    fetchArtworks();
  }, [fetchArtworks]);

  // ---- Selection handlers ---------------------------------------------------

  const allVisibleSelected =
    artworks.length > 0 && artworks.every((a) => selectedIds.includes(a.id));

  function handleToggleAll() {
    if (allVisibleSelected) {
      const visibleIds = new Set(artworks.map((a) => a.id));
      setSelectedIds(selectedIds.filter((id) => !visibleIds.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...artworks.map((a) => a.id)]);
      setSelectedIds(Array.from(merged));
    }
  }

  function handleToggle(id: string, event?: React.MouseEvent) {
    if (event?.shiftKey && lastClickedRef.current) {
      const lastIdx = artworks.findIndex((a) => a.id === lastClickedRef.current);
      const currentIdx = artworks.findIndex((a) => a.id === id);
      if (lastIdx !== -1 && currentIdx !== -1) {
        const start = Math.min(lastIdx, currentIdx);
        const end = Math.max(lastIdx, currentIdx);
        const rangeIds = artworks.slice(start, end + 1).map((a) => a.id);
        const merged = new Set([...selectedIds, ...rangeIds]);
        setSelectedIds(Array.from(merged));
        lastClickedRef.current = id;
        return;
      }
    }

    lastClickedRef.current = id;

    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((sid) => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  // ---- Submit handler -------------------------------------------------------

  async function handleSubmit() {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(selectedIds);
    } finally {
      setSubmitting(false);
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

      {/* Toolbar: Select All / Clear Filters / Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleToggleAll}>
            {allVisibleSelected ? 'Deselect All' : 'Select All'}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
              {selectedIds.length} selected
            </span>
          )}
          <span className="text-xs text-primary-400">
            {totalCount} artwork{totalCount !== 1 ? 's' : ''} total
          </span>
        </div>
      </div>

      {/* Shift-click hint */}
      {artworks.length > 0 && (
        <p className="text-xs text-primary-400">
          Tip: Hold Shift and click to select a range of artworks.
        </p>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Empty */}
      {!loading && artworks.length === 0 && (
        <div className="py-12 text-center text-sm text-primary-400">
          No artworks found. Try adjusting your filters.
        </div>
      )}

      {/* Artwork grid */}
      {!loading && artworks.length > 0 && (
        <div className="grid max-h-[520px] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
          {artworks.map((artwork) => {
            const isSelected = selectedIds.includes(artwork.id);

            return (
              <div
                key={artwork.id}
                role="button"
                tabIndex={0}
                onClick={(e) => handleToggle(artwork.id, e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle(artwork.id);
                  }
                }}
                className={`group relative cursor-pointer rounded-lg border-2 p-2 transition-all hover:shadow-md ${
                  isSelected
                    ? 'border-accent bg-accent/5 shadow-sm'
                    : 'border-primary-200 bg-white hover:border-primary-300'
                }`}
              >
                {/* Checkmark overlay */}
                {isSelected && (
                  <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white shadow-sm">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                )}

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
              </div>
            );
          })}
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

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 border-t border-primary-100 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={selectedIds.length === 0}
          loading={submitting}
        >
          Add {selectedIds.length > 0 ? `${selectedIds.length} ` : ''}Artwork{selectedIds.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
