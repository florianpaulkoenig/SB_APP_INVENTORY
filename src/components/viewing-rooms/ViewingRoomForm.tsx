// ---------------------------------------------------------------------------
// NOA Inventory -- Viewing Room Form
// Create / edit a viewing room with artwork selection.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { CatalogueArtworkPicker } from '../catalogues/CatalogueArtworkPicker';
import { supabase } from '../../lib/supabase';
import { hashPassword } from '../../lib/crypto';
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
// Lightweight artwork record for the selected list
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

  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialData?.artwork_ids ?? [],
  );
  const [selectedArtworks, setSelectedArtworks] = useState<PickerArtwork[]>([]);
  const [showPickerModal, setShowPickerModal] = useState(false);

  // Temporary selection inside the picker modal
  const [pickerSelectedIds, setPickerSelectedIds] = useState<string[]>([]);

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
              .createSignedUrl(img.storage_path, 600);
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

  // ---- Selection helpers ----------------------------------------------------

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

  // ---- Picker modal handlers ------------------------------------------------

  function handleOpenPicker() {
    setPickerSelectedIds([...selectedIds]);
    setShowPickerModal(true);
  }

  async function handlePickerConfirm() {
    // Merge new selections into existing list — keep order of existing, append new ones
    const existingSet = new Set(selectedIds);
    const newIds = pickerSelectedIds.filter((id) => !existingSet.has(id));
    const removedIds = new Set(selectedIds.filter((id) => !pickerSelectedIds.includes(id)));

    // Remove any that were unchecked
    const updatedIds = selectedIds.filter((id) => !removedIds.has(id));
    // Append newly added
    const finalIds = [...updatedIds, ...newIds];
    setSelectedIds(finalIds);

    // Fetch artwork details for any new IDs
    if (newIds.length > 0) {
      try {
        const { data } = await supabase
          .from('artworks')
          .select('id, title, reference_code, medium, year')
          .in('id', newIds);

        // Fetch primary images for new artworks
        const { data: images } = await supabase
          .from('artwork_images')
          .select('artwork_id, storage_path')
          .in('artwork_id', newIds)
          .eq('is_primary', true);

        const imageMap = new Map<string, string>();
        if (images) {
          const urlPromises = images.map(async (img) => {
            const { data: urlData } = await supabase.storage
              .from('artwork-images')
              .createSignedUrl(img.storage_path, 600);
            return { artworkId: img.artwork_id, url: urlData?.signedUrl ?? null };
          });
          const urls = await Promise.all(urlPromises);
          for (const { artworkId, url } of urls) {
            if (url) imageMap.set(artworkId, url);
          }
        }

        const newArtworks: PickerArtwork[] = (data ?? []).map((a) => ({
          id: a.id,
          title: a.title,
          reference_code: a.reference_code,
          medium: (a as ArtworkRow).medium ?? null,
          year: (a as ArtworkRow).year ?? null,
          imageUrl: imageMap.get(a.id) ?? null,
        }));

        // Build final ordered list
        const existingArtworks = selectedArtworks.filter((a) => !removedIds.has(a.id));
        setSelectedArtworks([...existingArtworks, ...newArtworks]);
      } catch {
        // Keep existing artworks at least
        setSelectedArtworks((prev) => prev.filter((a) => !removedIds.has(a.id)));
      }
    } else {
      // Just remove unchecked ones
      setSelectedArtworks((prev) => prev.filter((a) => !removedIds.has(a.id)));
    }

    setShowPickerModal(false);
  }

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
        ? { password_hash: await hashPassword(password) }
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
        maxLength={256}
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
          maxLength={256}
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
          maxLength={5000}
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
        maxLength={256}
      />

      {/* ---- Artwork Picker ---- */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-primary-700">
            Artworks
          </label>
          <Button type="button" size="sm" onClick={handleOpenPicker}>
            <svg
              className="mr-1.5 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            {selectedIds.length > 0 ? 'Add / Remove Artworks' : 'Select Artworks'}
          </Button>
        </div>

        <p className="mb-2 text-xs text-primary-500">
          {selectedIds.length} artwork{selectedIds.length !== 1 ? 's' : ''} selected
          {selectedIds.length > 1 && ' \u2014 use arrows to reorder'}
        </p>

        {/* Selected artworks list with reorder */}
        {selectedArtworks.length > 0 && (
          <div className="rounded-lg border border-primary-200 bg-primary-50/50">
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

        {selectedArtworks.length === 0 && (
          <div className="rounded-lg border border-dashed border-primary-200 px-4 py-8 text-center">
            <svg
              className="mx-auto h-8 w-8 text-primary-300"
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
            <p className="mt-2 text-sm text-primary-400">
              No artworks selected. Click &quot;Select Artworks&quot; to add artworks to this viewing room.
            </p>
          </div>
        )}
      </div>

      {/* ---- Artwork Picker Modal ---- */}
      <Modal
        isOpen={showPickerModal}
        onClose={() => setShowPickerModal(false)}
        title="Select Artworks"
        size="4xl"
      >
        <div className="space-y-4">
          <CatalogueArtworkPicker
            selectedIds={pickerSelectedIds}
            onSelectionChange={setPickerSelectedIds}
          />
          <div className="flex items-center justify-between border-t border-primary-100 pt-4">
            <span className="text-sm text-primary-500">
              {pickerSelectedIds.length} artwork{pickerSelectedIds.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPickerModal(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handlePickerConfirm}>
                Confirm Selection
              </Button>
            </div>
          </div>
        </div>
      </Modal>

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
