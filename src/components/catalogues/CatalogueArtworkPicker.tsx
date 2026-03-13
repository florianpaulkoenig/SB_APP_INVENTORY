// ---------------------------------------------------------------------------
// NOA Inventory -- Catalogue Artwork Picker
// Grid-based artwork picker with thumbnails, search, filters, shift-click
// bulk selection, and pagination. Used by Catalogues, Sharing, Viewing Rooms.
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
// Props
// ---------------------------------------------------------------------------

export interface CatalogueArtworkPickerProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

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
  artist_name: string | null;
  imageUrl: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 24;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CatalogueArtworkPicker({
  selectedIds,
  onSelectionChange,
}: CatalogueArtworkPickerProps) {
  const [artworks, setArtworks] = useState<PickerArtwork[]>([]);
  const [loading, setLoading] = useState(true);
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

    // First get the total count for pagination
    let countQuery = supabase
      .from('artworks')
      .select('id', { count: 'exact', head: true });

    let query = supabase
      .from('artworks')
      .select(
        'id, title, reference_code, medium, year, price, currency, status, category, series, artist_name',
      )
      .order('title', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search) {
      const term = `%${sanitizeFilterTerm(search)}%`;
      const filter = `title.ilike.${term},reference_code.ilike.${term},artist_name.ilike.${term}`;
      query = query.or(filter);
      countQuery = countQuery.or(filter);
    }

    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
      countQuery = countQuery.eq('category', categoryFilter);
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter);
      countQuery = countQuery.eq('status', statusFilter);
    }

    if (seriesFilter) {
      query = query.eq('series', seriesFilter);
      countQuery = countQuery.eq('series', seriesFilter);
    }

    if (galleryFilter) {
      query = query.eq('gallery_id', galleryFilter);
      countQuery = countQuery.eq('gallery_id', galleryFilter);
    }

    const [{ data, error }, { count }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) {
      setArtworks([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setTotalCount(count ?? 0);

    // Fetch primary image URLs for all fetched artworks
    const artworkIds = (data ?? []).map((a) => a.id);

    let imageMap: Record<string, string> = {};

    if (artworkIds.length > 0) {
      const { data: images } = await supabase
        .from('artwork_images')
        .select('artwork_id, storage_path')
        .in('artwork_id', artworkIds)
        .eq('is_primary', true);

      if (images && images.length > 0) {
        const urlPromises = images.map(async (img) => {
          const { data: urlData } = await supabase.storage
            .from('artwork-images')
            .createSignedUrl(img.storage_path, 600);
          return {
            artworkId: img.artwork_id,
            url: urlData?.signedUrl ?? null,
          };
        });

        const urls = await Promise.all(urlPromises);
        imageMap = urls.reduce(
          (acc, { artworkId, url }) => {
            if (url) acc[artworkId] = url;
            return acc;
          },
          {} as Record<string, string>,
        );
      }
    }

    const mapped: PickerArtwork[] = (data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      reference_code: a.reference_code,
      medium: a.medium,
      year: a.year,
      price: a.price,
      currency: a.currency ?? 'EUR',
      status: a.status,
      category: a.category,
      series: a.series ?? null,
      artist_name: a.artist_name ?? null,
      imageUrl: imageMap[a.id] ?? null,
    }));

    setArtworks(mapped);
    setLoading(false);
  }, [search, categoryFilter, statusFilter, seriesFilter, galleryFilter, page]);

  useEffect(() => {
    fetchArtworks();
  }, [fetchArtworks]);

  // ---- Selection handlers ---------------------------------------------------

  const allVisibleSelected =
    artworks.length > 0 && artworks.every((a) => selectedIds.includes(a.id));

  function handleToggleAll() {
    if (allVisibleSelected) {
      const visibleIds = new Set(artworks.map((a) => a.id));
      onSelectionChange(selectedIds.filter((id) => !visibleIds.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...artworks.map((a) => a.id)]);
      onSelectionChange(Array.from(merged));
    }
  }

  function handleToggle(id: string, event?: React.MouseEvent) {
    // Shift-click: select range
    if (event?.shiftKey && lastClickedRef.current) {
      const lastIdx = artworks.findIndex(
        (a) => a.id === lastClickedRef.current,
      );
      const currentIdx = artworks.findIndex((a) => a.id === id);
      if (lastIdx !== -1 && currentIdx !== -1) {
        const start = Math.min(lastIdx, currentIdx);
        const end = Math.max(lastIdx, currentIdx);
        const rangeIds = artworks.slice(start, end + 1).map((a) => a.id);
        const merged = new Set([...selectedIds, ...rangeIds]);
        onSelectionChange(Array.from(merged));
        lastClickedRef.current = id;
        return;
      }
    }

    lastClickedRef.current = id;

    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
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
    return (
      ARTWORK_STATUSES.find((s) => s.value === status)?.label ??
      status.replace(/_/g, ' ')
    );
  }

  function getStatusColor(status: string) {
    return (
      ARTWORK_STATUSES.find((s) => s.value === status)?.color ??
      'bg-gray-100 text-gray-600'
    );
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
        placeholder="Search by title, reference code, or artist..."
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
                    {artwork.artist_name && ` \u00b7 ${artwork.artist_name}`}
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
    </div>
  );
}
