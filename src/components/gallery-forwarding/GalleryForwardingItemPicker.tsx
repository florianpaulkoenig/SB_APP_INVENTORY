import { useState, useEffect } from 'react';
import { SearchInput } from '../ui/SearchInput';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { StatusBadge } from '../ui/StatusBadge';
import { supabase } from '../../lib/supabase';

// ---------------------------------------------------------------------------
// Lightweight artwork record for the picker
// ---------------------------------------------------------------------------

interface ArtworkOption {
  id: string;
  title: string;
  reference_code: string;
  medium: string | null;
  status: string;
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
// Component
// ---------------------------------------------------------------------------

export function GalleryForwardingItemPicker({
  existingArtworkIds,
  onAdd,
  onClose,
}: GalleryForwardingItemPickerProps) {
  const [search, setSearch] = useState('');
  const [artworks, setArtworks] = useState<ArtworkOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  // ---- Fetch artworks -------------------------------------------------------

  useEffect(() => {
    async function fetchArtworks() {
      setLoading(true);

      let query = supabase
        .from('artworks')
        .select('id, title, reference_code, medium, status')
        .order('title', { ascending: true })
        .limit(100);

      if (search.trim()) {
        query = query.or(
          `title.ilike.%${search.trim()}%,reference_code.ilike.%${search.trim()}%`,
        );
      }

      const { data } = await query;

      const filtered = ((data as ArtworkOption[]) ?? []).filter(
        (a) => !existingArtworkIds.includes(a.id),
      );

      setArtworks(filtered);
      setLoading(false);
    }

    fetchArtworks();
  }, [search, existingArtworkIds]);

  // ---- Add handler ----------------------------------------------------------

  async function handleAdd(artworkId: string) {
    setAddingId(artworkId);
    try {
      await onAdd(artworkId);
    } finally {
      setAddingId(null);
    }
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-primary-900">
          Add Artwork
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-primary-400 hover:bg-primary-100 hover:text-primary-600 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search by title or reference code..."
      />

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : artworks.length > 0 ? (
        <div className="max-h-96 space-y-2 overflow-y-auto">
          {artworks.map((artwork) => (
            <div
              key={artwork.id}
              className="flex items-center justify-between rounded-lg border border-primary-100 bg-white p-4 transition-colors hover:bg-primary-50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary-900 truncate">
                  {artwork.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-primary-500">
                    {artwork.reference_code}
                  </span>
                  <StatusBadge status={artwork.status} />
                  {artwork.medium && (
                    <span className="text-xs text-primary-400">
                      {artwork.medium}
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAdd(artwork.id)}
                loading={addingId === artwork.id}
                disabled={addingId !== null}
              >
                Add
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-primary-400">
          {search.trim()
            ? 'No artworks found matching your search.'
            : 'No available artworks to add.'}
        </p>
      )}
    </div>
  );
}
