// ---------------------------------------------------------------------------
// NOA Inventory -- Viewing Room Form
// Create / edit a viewing room with artwork selection.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { supabase } from '../../lib/supabase';
import { sanitizeFilterTerm } from '../../lib/utils';
import { generateSlug } from '../../hooks/useViewingRooms';
import type {
  ViewingRoomRow,
  ViewingRoomInsert,
  ViewingRoomUpdate,
  ViewingRoomVisibility,
  ArtworkRow,
} from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ViewingRoomFormProps {
  initialData?: ViewingRoomRow | null;
  onSubmit: (data: ViewingRoomInsert | ViewingRoomUpdate) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Visibility options
// ---------------------------------------------------------------------------

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'link_only', label: 'Link Only' },
  { value: 'password', label: 'Password Protected' },
];

// ---------------------------------------------------------------------------
// Lightweight artwork record for the picker
// ---------------------------------------------------------------------------

interface PickerArtwork {
  id: string;
  title: string;
  reference_code: string;
  medium: string | null;
  year: number | null;
  imageUrl: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ViewingRoomForm({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: ViewingRoomFormProps) {
  // ---- Form state -----------------------------------------------------------

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [visibility, setVisibility] = useState<ViewingRoomVisibility>(
    initialData?.visibility ?? 'link_only',
  );
  const [password, setPassword] = useState('');
  const [contact, setContact] = useState('');

  // ---- Artwork picker state -------------------------------------------------

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<PickerArtwork[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialData?.artwork_ids ?? [],
  );
  const [selectedArtworks, setSelectedArtworks] = useState<PickerArtwork[]>([]);

  // ---- Validation -----------------------------------------------------------

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ---- Auto-generate slug from title ----------------------------------------

  useEffect(() => {
    if (!slugManuallyEdited && !initialData) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited, initialData]);

  // ---- Fetch pre-selected artworks on mount ---------------------------------

  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelectedArtworks([]);
      return;
    }

    const fetchSelected = async () => {
      try {
        const { data, error } = await supabase
          .from('artworks')
          .select('id, title, reference_code, medium, year')
          .in('id', selectedIds);

        if (error) throw error;

        // Fetch primary images
        const { data: images } = await supabase
          .from('artwork_images')
          .select('artwork_id, storage_path')
          .in('artwork_id', selectedIds)
          .eq('is_primary', true);

        const imageMap = new Map<string, string>();
        if (images) {
          const urlPromises = images.map(async (img) => {
            const { data: urlData } = await supabase.storage
              .from('artwork-images')
              .createSignedUrl(img.storage_path, 3600);
            return { artworkId: img.artwork_id, url: urlData?.signedUrl ?? null };
          });
          const urls = await Promise.all(urlPromises);
          for (const { artworkId, url } of urls) {
            if (url) imageMap.set(artworkId, url);
          }
        }

        // Preserve order from selectedIds
        const artworkMap = new Map<string, ArtworkRow>();
        for (const a of (data as ArtworkRow[]) ?? []) {
          artworkMap.set(a.id, a);
        }

        const ordered: PickerArtwork[] = selectedIds
          .map((id) => {
            const a = artworkMap.get(id);
            if (!a) return null;
            return {
              id: a.id,
              title: a.title,
              reference_code: a.reference_code,
              medium: a.medium,
              year: a.year,
              imageUrl: imageMap.get(a.id) ?? null,
            };
          })
          .filter((a): a is PickerArtwork => a !== null);

        setSelectedArtworks(ordered);
      } catch {
        // Silently fail; selected artworks will show without details
      }
    };

    fetchSelected();
    // Only run on mount / when initialData changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.artwork_ids]);

  // ---- Artwork search -------------------------------------------------------

  const searchArtworks = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);

    try {
      const wildcard = `%${sanitizeFilterTerm(term)}%`;
      const { data, error } = await supabase
        .from('artworks')
        .select('id, title, reference_code, medium, year')
        .or(
          `title.ilike.${wildcard},reference_code.ilike.${wildcard},inventory_number.ilike.${wildcard}`,
        )
        .order('title', { ascending: true })
        .limit(20);

      if (error) throw error;

      // Fetch primary images for results
      const artworkIds = (data ?? []).map((a) => a.id);
      const imageMap = new Map<string, string>();

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
              .createSignedUrl(img.storage_path, 3600);
            return { artworkId: img.artwork_id, url: urlData?.signedUrl ?? null };
          });
          const urls = await Promise.all(urlPromises);
          for (const { artworkId, url } of urls) {
            if (url) imageMap.set(artworkId, url);
          }
        }
      }

      setSearchResults(
        (data ?? []).map((a) => ({
          id: a.id,
          title: a.title,
          reference_code: a.reference_code,
          medium: (a as ArtworkRow).medium ?? null,
          year: (a as ArtworkRow).year ?? null,
          imageUrl: imageMap.get(a.id) ?? null,
        })),
      );
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchArtworks(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchArtworks]);

  // ---- Selection helpers ----------------------------------------------------

  const toggleArtwork = useCallback(
    (artwork: PickerArtwork) => {
      setSelectedIds((prev) => {
        if (prev.includes(artwork.id)) {
          return prev.filter((id) => id !== artwork.id);
        }
        return [...prev, artwork.id];
      });

      setSelectedArtworks((prev) => {
        if (prev.some((a) => a.id === artwork.id)) {
          return prev.filter((a) => a.id !== artwork.id);
        }
        return [...prev, artwork];
      });
    },
    [],
  );

  const removeArtwork = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    setSelectedArtworks((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const moveArtwork = useCallback((index: number, direction: 'up' | 'down') => {
    setSelectedIds((prev) => {
      const next = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });

    setSelectedArtworks((prev) => {
      const next = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }, []);

  // ---- Merge search results and selected artworks ---------------------------

  const displayedSearchResults = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return searchResults.filter((a) => !selectedSet.has(a.id));
  }, [searchResults, selectedIds]);

  // ---- Submit ---------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!slug.trim()) newErrors.slug = 'Slug is required';
    if (visibility === 'password' && !password && !initialData?.password_hash) {
      newErrors.password = 'Password is required for password-protected rooms';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const formData: ViewingRoomInsert | ViewingRoomUpdate = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      artwork_ids: selectedIds,
      visibility,
      ...(visibility === 'password' && password
        ? { password_hash: btoa(password) }
        : {}),
      ...(visibility !== 'password' ? { password_hash: null } : {}),
    };

    await onSubmit(formData);
  };

  // ---- Render ---------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ---- Title ---- */}
      <Input
        label="Title"
        placeholder="e.g. Spring Collection 2026"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        required
      />

      {/* ---- Slug ---- */}
      <div>
        <Input
          label="Slug"
          placeholder="spring-collection-2026"
          value={slug}
          onChange={(e) => {
            setSlugManuallyEdited(true);
            setSlug(
              e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/--+/g, '-'),
            );
          }}
          error={errors.slug}
          required
        />
        <p className="mt-1 text-xs text-primary-400">
          URL preview: <span className="font-medium text-primary-600">/view/{slug || '...'}</span>
        </p>
      </div>

      {/* ---- Description ---- */}
      <div className="w-full">
        <label
          htmlFor="description"
          className="mb-1 block text-sm font-medium text-primary-700"
        >
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          placeholder="Optional description shown at the top of the viewing room..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 transition-colors focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
      </div>

      {/* ---- Visibility ---- */}
      <Select
        label="Visibility"
        value={visibility}
        onChange={(e) => setVisibility(e.target.value as ViewingRoomVisibility)}
        options={VISIBILITY_OPTIONS}
      />

      {/* ---- Password (conditional) ---- */}
      {visibility === 'password' && (
        <Input
          label="Password"
          type="password"
          placeholder={
            initialData?.password_hash
              ? 'Leave blank to keep current password'
              : 'Enter a password for this room'
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          helperText={
            initialData?.password_hash
              ? 'A password is already set. Enter a new value to change it.'
              : undefined
          }
        />
      )}

      {/* ---- Contact note ---- */}
      <Input
        label="Contact Note"
        placeholder="e.g. For John Smith - Gallery XYZ"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        helperText="Internal reference only. Not shown publicly."
      />

      {/* ---- Artwork Picker ---- */}
      <div>
        <label className="mb-1 block text-sm font-medium text-primary-700">
          Artworks
        </label>

        {/* Selected artworks list */}
        {selectedArtworks.length > 0 && (
          <div className="mb-3 rounded-lg border border-primary-200 bg-primary-50/50">
            <div className="px-3 py-2 border-b border-primary-100">
              <span className="text-xs font-medium text-primary-600 uppercase tracking-wide">
                Selected ({selectedArtworks.length})
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-primary-100">
              {selectedArtworks.map((artwork, index) => (
                <div
                  key={artwork.id}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  {/* Order number */}
                  <span className="flex-shrink-0 text-xs font-medium text-primary-400 w-5 text-right">
                    {index + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-primary-100">
                    {artwork.imageUrl ? (
                      <img
                        src={artwork.imageUrl}
                        alt={artwork.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg
                          className="h-4 w-4 text-primary-300"
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
                    <p className="text-sm font-medium text-primary-900 truncate">
                      {artwork.title}
                    </p>
                    <p className="text-xs text-primary-400">
                      {artwork.reference_code}
                    </p>
                  </div>

                  {/* Reorder + remove buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => moveArtwork(index, 'up')}
                      disabled={index === 0}
                      className="rounded p-1 text-primary-400 hover:bg-primary-100 hover:text-primary-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveArtwork(index, 'down')}
                      disabled={index === selectedArtworks.length - 1}
                      className="rounded p-1 text-primary-400 hover:bg-primary-100 hover:text-primary-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeArtwork(artwork.id)}
                      className="rounded p-1 text-primary-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Remove"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search input */}
        <Input
          placeholder="Search artworks by title or reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <p className="mt-1.5 text-xs text-primary-500">
          {selectedIds.length} artwork{selectedIds.length !== 1 ? 's' : ''} selected
        </p>

        {/* Search results */}
        <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-primary-100">
          {searchLoading && (
            <div className="px-3 py-4 text-center text-sm text-primary-400">
              Searching...
            </div>
          )}

          {!searchLoading && search.trim() !== '' && displayedSearchResults.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-primary-400">
              No artworks found
            </div>
          )}

          {!searchLoading && search.trim() === '' && (
            <div className="px-3 py-4 text-center text-sm text-primary-400">
              Type to search for artworks
            </div>
          )}

          {displayedSearchResults.map((artwork) => (
            <label
              key={artwork.id}
              className="flex items-center gap-3 px-3 py-2 hover:bg-primary-50 cursor-pointer transition-colors border-b border-primary-50 last:border-b-0"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(artwork.id)}
                onChange={() => toggleArtwork(artwork)}
                className="h-4 w-4 rounded border-primary-300 text-accent focus:ring-accent"
              />

              {/* Thumbnail */}
              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-primary-100">
                {artwork.imageUrl ? (
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <svg
                      className="h-4 w-4 text-primary-300"
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

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary-900 truncate">
                  {artwork.title}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-primary-400">
                  <span>{artwork.reference_code}</span>
                  {artwork.medium && (
                    <>
                      <span className="text-primary-300">&middot;</span>
                      <span>{artwork.medium}</span>
                    </>
                  )}
                  {artwork.year && (
                    <>
                      <span className="text-primary-300">&middot;</span>
                      <span>{artwork.year}</span>
                    </>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ---- Actions ---- */}
      <div className="flex justify-end gap-3 pt-2 border-t border-primary-100">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!title.trim() || !slug.trim()}
        >
          {initialData ? 'Save Changes' : 'Create Viewing Room'}
        </Button>
      </div>
    </form>
  );
}
