// ---------------------------------------------------------------------------
// NOA Inventory -- Catalogue Artwork Picker
// Allows selecting artworks to include in a generated catalogue PDF.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { SearchInput } from '../ui/SearchInput';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { GallerySelect } from '../galleries/GallerySelect';
import { ARTWORK_CATEGORIES, ARTWORK_STATUSES } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { formatCurrency, sanitizeFilterTerm } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CatalogueArtworkPickerProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

// ---------------------------------------------------------------------------
// Lightweight artwork record for the picker list
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
  imageUrl: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CatalogueArtworkPicker({
  selectedIds,
  onSelectionChange,
}: CatalogueArtworkPickerProps) {
  const [artworks, setArtworks] = useState<PickerArtwork[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [galleryFilter, setGalleryFilter] = useState<string | null>(null);

  // ---- Fetch artworks with filters ------------------------------------------

  const fetchArtworks = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('artworks')
      .select(
        'id, title, reference_code, medium, year, price, currency, status, category',
      )
      .order('title', { ascending: true });

    if (search) {
      const term = `%${sanitizeFilterTerm(search)}%`;
      query = query.or(
        `title.ilike.${term},reference_code.ilike.${term}`,
      );
    }

    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (galleryFilter) {
      query = query.eq('gallery_id', galleryFilter);
    }

    const { data, error } = await query;

    if (error) {
      setArtworks([]);
      setLoading(false);
      return;
    }

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
        // Generate signed URLs in parallel
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
      imageUrl: imageMap[a.id] ?? null,
    }));

    setArtworks(mapped);
    setLoading(false);
  }, [search, categoryFilter, statusFilter, galleryFilter]);

  useEffect(() => {
    fetchArtworks();
  }, [fetchArtworks]);

  // ---- Selection handlers ---------------------------------------------------

  const allSelected =
    artworks.length > 0 && artworks.every((a) => selectedIds.includes(a.id));

  function handleToggleAll() {
    if (allSelected) {
      // Deselect all currently visible artworks
      const visibleIds = new Set(artworks.map((a) => a.id));
      onSelectionChange(selectedIds.filter((id) => !visibleIds.has(id)));
    } else {
      // Select all currently visible artworks (merge with existing)
      const merged = new Set([...selectedIds, ...artworks.map((a) => a.id)]);
      onSelectionChange(Array.from(merged));
    }
  }

  function handleToggle(id: string) {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
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

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by title or reference code..."
      />

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        <GallerySelect
          value={galleryFilter}
          onChange={setGalleryFilter}
          label=""
        />
      </div>

      {/* Select All / Deselect All + Count */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleToggleAll}>
          {allSelected ? 'Deselect All' : 'Select All'}
        </Button>
        <span className="text-sm font-medium text-primary-700">
          {selectedIds.length} artwork{selectedIds.length !== 1 ? 's' : ''}{' '}
          selected
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
          No artworks found. Try adjusting your filters.
        </div>
      )}

      {/* Artwork list */}
      {!loading && artworks.length > 0 && (
        <div className="max-h-[480px] divide-y divide-primary-100 overflow-y-auto rounded-lg border border-primary-200">
          {artworks.map((artwork) => {
            const isSelected = selectedIds.includes(artwork.id);

            return (
              <label
                key={artwork.id}
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-primary-50 ${
                  isSelected ? 'bg-accent/5' : ''
                }`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(artwork.id)}
                  className="h-4 w-4 rounded border-primary-300 text-accent focus:ring-accent"
                />

                {/* Thumbnail */}
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-primary-100">
                  {artwork.imageUrl ? (
                    <img
                      src={artwork.imageUrl}
                      alt={artwork.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg
                        className="h-5 w-5 text-primary-300"
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
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-medium text-primary-900">
                      {artwork.title}
                    </span>
                    <span className="flex-shrink-0 text-xs text-primary-400">
                      {artwork.reference_code}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-primary-500">
                    {artwork.medium && <span>{artwork.medium}</span>}
                    {artwork.medium && artwork.year && (
                      <span className="text-primary-300">&middot;</span>
                    )}
                    {artwork.year && <span>{artwork.year}</span>}
                  </div>
                </div>

                {/* Price */}
                <div className="flex-shrink-0 text-right">
                  {artwork.price != null ? (
                    <span className="text-sm font-medium text-primary-700">
                      {formatCurrency(artwork.price, artwork.currency)}
                    </span>
                  ) : (
                    <span className="text-xs text-primary-300">No price</span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
