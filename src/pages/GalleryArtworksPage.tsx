// ---------------------------------------------------------------------------
// NOA Inventory -- Gallery Artworks Page
// Full list of artworks consigned to the gallery user's gallery.
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { SearchInput } from '../components/ui/SearchInput';
import type { ArtworkRow } from '../types/database';

// ---------------------------------------------------------------------------
// Status badge variant mapping
// ---------------------------------------------------------------------------

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'info' | 'danger'> = {
  available: 'success',
  sold: 'default',
  reserved: 'warning',
  in_production: 'info',
  in_transit: 'info',
  on_consignment: 'info',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleryArtworksPage() {
  const { profile } = useAuth();

  const [artworks, setArtworks] = useState<ArtworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const galleryId = profile?.gallery_id;

  // ---- Fetch artworks -----------------------------------------------------

  useEffect(() => {
    if (!galleryId) {
      setLoading(false);
      return;
    }

    async function fetchArtworks() {
      setLoading(true);

      const { data } = await supabase
        .from('artworks')
        .select('*')
        .eq('gallery_id', galleryId!)
        .order('created_at', { ascending: false });

      if (data) setArtworks(data as ArtworkRow[]);
      setLoading(false);
    }

    fetchArtworks();
  }, [galleryId]);

  // ---- Filter by search ---------------------------------------------------

  const filtered = search
    ? artworks.filter((a) =>
        a.title.toLowerCase().includes(search.toLowerCase()),
      )
    : artworks;

  // ---- Render: no gallery configured --------------------------------------

  if (!loading && !galleryId) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Consigned Artworks
          </h1>
        </div>
        <EmptyState
          title="Your gallery profile is not configured yet"
          description="Please contact an administrator to link your account to a gallery."
        />
      </div>
    );
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">
          Consigned Artworks
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Artworks currently consigned to your gallery.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search artworks by title..."
          className="max-w-md"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
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
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z"
              />
            </svg>
          }
          title={search ? 'No artworks found' : 'No consigned artworks yet'}
          description={
            search
              ? 'Try adjusting your search criteria.'
              : 'Artworks consigned to your gallery will appear here.'
          }
        />
      )}

      {/* Artworks table */}
      {!loading && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-primary-100">
          <table className="min-w-full divide-y divide-primary-100">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Year
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                  Price
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50 bg-white">
              {filtered.map((artwork) => (
                <tr key={artwork.id} className="hover:bg-primary-50 transition-colors">
                  {/* Title */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-primary-900">
                    {artwork.title}
                  </td>

                  {/* Reference code */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {artwork.reference_code}
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge variant={STATUS_BADGE_VARIANT[artwork.status] ?? 'default'}>
                      {artwork.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>

                  {/* Year */}
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {artwork.year ?? '\u2014'}
                  </td>

                  {/* Price */}
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-primary-600">
                    {artwork.price != null
                      ? formatCurrency(artwork.price, artwork.currency)
                      : '\u2014'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
