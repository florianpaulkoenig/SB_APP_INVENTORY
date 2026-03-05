import { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { supabase } from '../../lib/supabase';
import { IMAGE_TYPES } from '../../lib/constants';
import { generateShareToken } from '../../hooks/useShareLinks';
import type { ShareLinkRow, ArtworkRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ShareLinkGeneratorProps {
  open: boolean;
  onClose: () => void;
  onCreated: (link: ShareLinkRow) => void;
  preselectedArtworkIds?: string[];
}

// ---------------------------------------------------------------------------
// Expiry options
// ---------------------------------------------------------------------------

const EXPIRY_OPTIONS = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: 'none', label: 'No expiry' },
];

function computeExpiry(value: string): string | null {
  const now = new Date();
  switch (value) {
    case '24h':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case '30d':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    case '90d':
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareLinkGenerator({
  open,
  onClose,
  onCreated,
  preselectedArtworkIds = [],
}: ShareLinkGeneratorProps) {
  // ---- State ---------------------------------------------------------------

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ArtworkRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedImageTypes, setSelectedImageTypes] = useState<Set<string>>(
    new Set(IMAGE_TYPES.map((t) => t.value)),
  );
  const [expiry, setExpiry] = useState('7d');
  const [submitting, setSubmitting] = useState(false);

  // Success state
  const [createdLink, setCreatedLink] = useState<ShareLinkRow | null>(null);
  const [copied, setCopied] = useState(false);

  // ---- Pre-select artworks on open -----------------------------------------

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(preselectedArtworkIds));
      setCreatedLink(null);
      setCopied(false);
      setSearch('');
      setSearchResults([]);
      setExpiry('7d');
      setSelectedImageTypes(new Set(IMAGE_TYPES.map((t) => t.value)));
    }
  }, [open, preselectedArtworkIds]);

  // ---- Artwork search ------------------------------------------------------

  const searchArtworks = useCallback(async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);

    try {
      const wildcard = `%${term}%`;
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .or(
          `title.ilike.${wildcard},reference_code.ilike.${wildcard},inventory_number.ilike.${wildcard}`,
        )
        .order('title', { ascending: true })
        .limit(20);

      if (error) throw error;

      setSearchResults((data as ArtworkRow[]) ?? []);
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

  // ---- Preselected artworks display ----------------------------------------

  const [preselectedArtworks, setPreselectedArtworks] = useState<ArtworkRow[]>([]);

  useEffect(() => {
    if (preselectedArtworkIds.length === 0) {
      setPreselectedArtworks([]);
      return;
    }

    const fetchPreselected = async () => {
      try {
        const { data, error } = await supabase
          .from('artworks')
          .select('*')
          .in('id', preselectedArtworkIds);

        if (error) throw error;

        setPreselectedArtworks((data as ArtworkRow[]) ?? []);
      } catch {
        setPreselectedArtworks([]);
      }
    };

    fetchPreselected();
  }, [preselectedArtworkIds]);

  // ---- Selection helpers ---------------------------------------------------

  const toggleArtwork = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleImageType = useCallback((type: string) => {
    setSelectedImageTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // ---- Combined list of artworks to show -----------------------------------

  const displayedArtworks = useMemo(() => {
    const map = new Map<string, ArtworkRow>();

    // Add preselected artworks first
    for (const artwork of preselectedArtworks) {
      map.set(artwork.id, artwork);
    }

    // Add search results
    for (const artwork of searchResults) {
      map.set(artwork.id, artwork);
    }

    return Array.from(map.values());
  }, [preselectedArtworks, searchResults]);

  // ---- Submit --------------------------------------------------------------

  const shareUrl = createdLink
    ? `${window.location.origin}/SB_APP_INVENTORY/share/${createdLink.token}`
    : '';

  const handleSubmit = async () => {
    if (selectedIds.size === 0 || selectedImageTypes.size === 0) return;

    setSubmitting(true);

    try {
      const token = generateShareToken();
      const expiryDate = computeExpiry(expiry);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data: created, error: insertError } = await supabase
        .from('share_links')
        .insert({
          token,
          artwork_ids: Array.from(selectedIds),
          image_types: Array.from(selectedImageTypes),
          expiry: expiryDate,
          user_id: session.user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const link = created as ShareLinkRow;
      setCreatedLink(link);
      onCreated(link);
    } catch {
      // Error is handled silently; the modal stays open so user can retry
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Copy to clipboard ---------------------------------------------------

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select input text
    }
  };

  // ---- Render --------------------------------------------------------------

  // Success state
  if (createdLink) {
    return (
      <Modal isOpen={open} onClose={onClose} title="Link Created" size="md">
        <div className="space-y-4">
          <div className="flex items-center justify-center rounded-full bg-emerald-50 p-3 mx-auto w-12 h-12">
            <svg
              className="h-6 w-6 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>

          <p className="text-center text-sm text-primary-600">
            Your share link has been created. Copy it below and send it to the
            recipient.
          </p>

          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm text-primary-900 focus:outline-none"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              variant={copied ? 'secondary' : 'primary'}
              size="md"
              onClick={handleCopy}
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>

          <div className="text-xs text-primary-400 text-center">
            {selectedIds.size} artwork{selectedIds.size !== 1 ? 's' : ''} &middot;{' '}
            {Array.from(selectedImageTypes).join(', ')} &middot;{' '}
            {expiry === 'none'
              ? 'No expiry'
              : `Expires in ${EXPIRY_OPTIONS.find((o) => o.value === expiry)?.label}`}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Form state
  return (
    <Modal isOpen={open} onClose={onClose} title="Create Share Link" size="lg">
      <div className="space-y-5">
        {/* ---- Artwork picker ---- */}
        <div>
          <label className="mb-1 block text-sm font-medium text-primary-700">
            Select Artworks
          </label>

          <Input
            placeholder="Search artworks by title or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Selected count */}
          <p className="mt-1.5 text-xs text-primary-500">
            {selectedIds.size} artwork{selectedIds.size !== 1 ? 's' : ''} selected
          </p>

          {/* Results list */}
          <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-primary-100">
            {searchLoading && (
              <div className="px-3 py-4 text-center text-sm text-primary-400">
                Searching...
              </div>
            )}

            {!searchLoading && displayedArtworks.length === 0 && search.trim() !== '' && (
              <div className="px-3 py-4 text-center text-sm text-primary-400">
                No artworks found
              </div>
            )}

            {!searchLoading && displayedArtworks.length === 0 && search.trim() === '' && preselectedArtworks.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-primary-400">
                Type to search for artworks
              </div>
            )}

            {displayedArtworks.map((artwork) => (
              <label
                key={artwork.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-primary-50 cursor-pointer transition-colors border-b border-primary-50 last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(artwork.id)}
                  onChange={() => toggleArtwork(artwork.id)}
                  className="h-4 w-4 rounded border-primary-300 text-accent focus:ring-accent"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary-900 truncate">
                    {artwork.title}
                  </p>
                  <p className="text-xs text-primary-400">
                    {artwork.reference_code}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ---- Image type selector ---- */}
        <div>
          <label className="mb-1 block text-sm font-medium text-primary-700">
            Image Types
          </label>
          <div className="flex gap-4">
            {IMAGE_TYPES.map((type) => (
              <label
                key={type.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedImageTypes.has(type.value)}
                  onChange={() => toggleImageType(type.value)}
                  className="h-4 w-4 rounded border-primary-300 text-accent focus:ring-accent"
                />
                <span className="text-sm text-primary-700">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ---- Expiry selector ---- */}
        <Select
          label="Link Expiry"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          options={EXPIRY_OPTIONS}
        />

        {/* ---- Actions ---- */}
        <div className="flex justify-end gap-3 pt-2 border-t border-primary-100">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={selectedIds.size === 0 || selectedImageTypes.size === 0}
          >
            Create Link
          </Button>
        </div>
      </div>
    </Modal>
  );
}
