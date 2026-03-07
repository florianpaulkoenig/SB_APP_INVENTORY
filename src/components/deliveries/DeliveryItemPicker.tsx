// ---------------------------------------------------------------------------
// NOA Inventory -- Delivery Item Picker (Multi-Select, Catalogue-style)
// Allows selecting multiple artworks to add to a delivery.
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
// Lightweight artwork record for the picker
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
// Props
// ---------------------------------------------------------------------------

export interface DeliveryItemPickerProps {
  deliveryId: string;
  existingItemIds: string[];
  onSubmit: (artworkIds: string[]) => Promise<void>;
  onCancel: () => void;
}

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

    // Filter out already-added artworks
    const existingSet = new Set(existingItemIds);
    const filtered = ((data ?? []) as Array<{
      id: string;
      title: string;
      reference_code: string;
      medium: string | null;
      year: number | null;
      price: number | null;
      currency: string;
      status: string;
      category: string | null;
    }>).filter((a) => !existingSet.has(a.id));

    // Fetch primary image URLs for all fetched artworks
    const artworkIds = filtered.map((a) => a.id);
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
            .createSignedUrl(img.storage_path, 600, {
              transform: { width: 200, height: 200, resize: 'cover' },
            });
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

    const mapped: PickerArtwork[] = filtered.map((a) => ({
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
  }, [search, categoryFilter, statusFilter, galleryFilter, existingItemIds]);

  useEffect(() => {
    fetchArtworks();
  }, [fetchArtworks]);

  // ---- Selection handlers ---------------------------------------------------

  const allSelected =
    artworks.length > 0 && artworks.every((a) => selectedIds.includes(a.id));

  function handleToggleAll() {
    if (allSelected) {
      const visibleIds = new Set(artworks.map((a) => a.id));
      setSelectedIds(selectedIds.filter((id) => !visibleIds.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...artworks.map((a) => a.id)]);
      setSelectedIds(Array.from(merged));
    }
  }

  function handleToggle(id: string) {
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
