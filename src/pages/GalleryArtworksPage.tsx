// ---------------------------------------------------------------------------
// NOA Inventory -- Gallery Artworks Page
// Full list of artworks consigned to the gallery user's gallery.
// Includes "Mark as Sold" functionality with admin approval flow.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSaleRequests } from '../hooks/useSaleRequests';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { SearchInput } from '../components/ui/SearchInput';
import { SaleRequestModal } from '../components/galleries/SaleRequestModal';
import { useToast } from '../components/ui/Toast';
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
  paid: 'success',
  pending_sale: 'warning',
  archived: 'default',
  destroyed: 'default',
};

// Statuses that allow "Mark as Sold"
const SELLABLE_STATUSES = new Set(['available', 'on_consignment']);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleryArtworksPage() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [artworks, setArtworks] = useState<ArtworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Sale request state
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [saleArtwork, setSaleArtwork] = useState<{ id: string; title: string } | null>(null);

  const galleryId = profile?.gallery_id;
  const { createRequest } = useSaleRequests({ galleryId: galleryId ?? undefined });

  // ---- Fetch artworks -----------------------------------------------------

  const fetchArtworks = useCallback(async () => {
    if (!galleryId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data } = await supabase
      .from('artworks')
      .select('*')
      .eq('gallery_id', galleryId!)
      .order('created_at', { ascending: false });

    if (data) setArtworks(data as ArtworkRow[]);
    setLoading(false);
  }, [galleryId]);

  useEffect(() => {
    fetchArtworks();
  }, [fetchArtworks]);

  // ---- Mark as Sold handler -----------------------------------------------

  function handleMarkAsSold(artwork: ArtworkRow) {
    setSaleArtwork({ id: artwork.id, title: artwork.title });
    setSaleModalOpen(true);
  }

  async function handleSaleSubmit(data: {
    artwork_id: string;
    realized_price: number;
    currency: string;
    buyer_name?: string;
    notes?: string;
  }) {
    const result = await createRequest(data);
    if (result) {
      setSaleModalOpen(false);
      setSaleArtwork(null);
      toast({
        title: 'Sale Request Submitted',
        description: 'An admin will review and approve your sale request.',
        variant: 'success',
      });
      // Refresh artworks to show updated status
      await fetchArtworks();
    }
  }

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
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Title
                </th>
                <th className="hidden sm:table-cell px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Reference
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Status
                </th>
                <th className="hidden md:table-cell px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Year
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                  Price
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50 bg-white">
              {filtered.map((artwork) => (
                <tr key={artwork.id} className="hover:bg-primary-50 transition-colors">
                  {/* Title */}
                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-sm font-medium text-primary-900">
                    {artwork.title}
                  </td>

                  {/* Reference code */}
                  <td className="hidden sm:table-cell whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-sm text-primary-600">
                    {artwork.reference_code}
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">
                    <Badge variant={STATUS_BADGE_VARIANT[artwork.status] ?? 'default'}>
                      {artwork.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>

                  {/* Year */}
                  <td className="hidden md:table-cell whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-sm text-primary-600">
                    {artwork.year ?? '\u2014'}
                  </td>

                  {/* Price */}
                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-right text-sm text-primary-600">
                    {artwork.price != null
                      ? formatCurrency(artwork.price, artwork.currency)
                      : '\u2014'}
                  </td>

                  {/* Actions */}
                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-right">
                    {SELLABLE_STATUSES.has(artwork.status) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsSold(artwork)}
                      >
                        Mark as Sold
                      </Button>
                    ) : artwork.status === 'pending_sale' ? (
                      <span className="text-xs text-amber-600 font-medium">
                        Pending Approval
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sale Request Modal */}
      {saleArtwork && (
        <SaleRequestModal
          isOpen={saleModalOpen}
          onClose={() => {
            setSaleModalOpen(false);
            setSaleArtwork(null);
          }}
          artworkId={saleArtwork.id}
          artworkTitle={saleArtwork.title}
          onSubmit={handleSaleSubmit}
        />
      )}
    </div>
  );
}
