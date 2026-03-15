// ---------------------------------------------------------------------------
// NOA Inventory -- Gallery Available Works Page
// Gallery portal page for browsing artworks curated by NOA for partner galleries.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SaleRequestModal } from '../components/galleries/SaleRequestModal';
import { formatCurrency } from '../lib/utils';
import { ARTWORK_CATEGORIES } from '../lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvailableArtwork {
  id: string;
  title: string;
  medium: string | null;
  year: number | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  dimension_unit: string | null;
  price: number | null;
  currency: string | null;
  status: string;
  category: string | null;
  series: string | null;
  gallery_id: string | null;
}

interface ArtworkImage {
  artwork_id: string;
  storage_path: string;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleryAvailableWorksPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [artworks, setArtworks] = useState<AvailableArtwork[]>([]);
  const [images, setImages] = useState<ArtworkImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  // Sale request modal state
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<{ id: string; title: string } | null>(null);

  const galleryId = profile?.gallery_id;

  // ---- Fetch data ---------------------------------------------------------

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const [artworkRes, imageRes] = await Promise.all([
        supabase
          .from('artworks')
          .select('id, title, medium, year, height, width, depth, dimension_unit, price, currency, status, category, series, gallery_id')
          .eq('available_for_partners', true),
        supabase
          .from('artwork_images')
          .select('artwork_id, storage_path')
          .eq('is_primary', true),
      ]);

      if (artworkRes.data) {
        // Exclude artworks already at this gallery
        const filtered = (artworkRes.data as AvailableArtwork[]).filter(
          (a) => !a.gallery_id || a.gallery_id !== galleryId,
        );
        setArtworks(filtered);
      }

      if (imageRes.data) setImages(imageRes.data as ArtworkImage[]);
      setLoading(false);
    }

    fetchData();
  }, [galleryId]);

  // ---- Filtered artworks --------------------------------------------------

  const filtered = useMemo(() => {
    let list = artworks;
    if (category) list = list.filter((a) => a.category === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.medium && a.medium.toLowerCase().includes(q)) ||
          (a.series && a.series.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [artworks, category, search]);

  // ---- Image lookup -------------------------------------------------------

  const imageMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const img of images) map.set(img.artwork_id, img.storage_path);
    return map;
  }, [images]);

  // ---- Request consignment ------------------------------------------------

  const requestConsignment = useCallback(
    async (artworkId: string) => {
      if (!user || !galleryId) return;

      const { error } = await supabase.from('gallery_forwarding_orders').insert({
        artwork_id: artworkId,
        to_gallery_id: galleryId,
        status: 'draft',
        requested_by: user.id,
      } as never);

      if (error) {
        toast({ title: 'Failed to request consignment', variant: 'error' });
      } else {
        toast({ title: 'Consignment request created', variant: 'success' });
      }
    },
    [user, galleryId, toast],
  );

  // ---- Sale request submit ------------------------------------------------

  const handleSaleSubmit = useCallback(
    async (data: {
      artwork_id: string;
      realized_price: number;
      currency: string;
      buyer_name?: string;
      notes?: string;
    }) => {
      if (!user || !galleryId) return;

      const { error } = await supabase.from('sale_requests').insert({
        artwork_id: data.artwork_id,
        gallery_id: galleryId,
        requested_by: user.id,
        realized_price: data.realized_price,
        currency: data.currency,
        buyer_name: data.buyer_name,
        notes: data.notes,
        status: 'pending',
      } as never);

      if (error) {
        toast({ title: 'Failed to submit sale request', variant: 'error' });
        throw error;
      }

      // Update artwork status to pending_sale
      await supabase
        .from('artworks')
        .update({ status: 'pending_sale' } as never)
        .eq('id', data.artwork_id);

      toast({ title: 'Sale request submitted for approval', variant: 'success' });
    },
    [user, galleryId, toast],
  );

  // ---- Render: loading ----------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ---- Render: page -------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary-900">
          Available Works
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Artworks curated by NOA for partner galleries
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full sm:w-48"
          options={[{value: '', label: 'All Categories'}, ...ARTWORK_CATEGORIES]}
        />
        <Input
          type="text"
          placeholder="Search by title, medium, or series..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-primary-500">No available works at the moment.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((artwork) => (
            <Card key={artwork.id} className="overflow-hidden flex flex-col">
              {/* Image */}
              <div className="flex h-48 items-center justify-center bg-primary-50">
                {imageMap.has(artwork.id) ? (
                  <div className="h-full w-full bg-primary-100 flex items-center justify-center text-xs text-primary-400">
                    <svg className="h-10 w-10 text-primary-300" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
                    </svg>
                  </div>
                ) : (
                  <svg className="h-10 w-10 text-primary-300" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
                  </svg>
                )}
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-sm font-bold text-primary-900 truncate">{artwork.title}</h3>
                {artwork.medium && (
                  <p className="mt-0.5 text-xs text-primary-500">{artwork.medium}</p>
                )}
                {artwork.year && (
                  <p className="text-xs text-primary-400">{artwork.year}</p>
                )}
                {(artwork.height || artwork.width) && (
                  <p className="text-xs text-primary-400">
                    {artwork.height} &times; {artwork.width}
                    {artwork.depth ? ` × ${artwork.depth}` : ''}{' '}
                    {artwork.dimension_unit || 'cm'}
                  </p>
                )}
                {artwork.price != null && (
                  <p className="mt-1 text-sm font-medium text-primary-800">
                    {formatCurrency(artwork.price, artwork.currency || 'CHF')}
                  </p>
                )}
                <div className="mt-2">
                  <Badge>{artwork.status.replace(/_/g, ' ')}</Badge>
                </div>

                {/* Actions */}
                <div className="mt-auto flex gap-2 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => requestConsignment(artwork.id)}
                    className="flex-1"
                  >
                    Request Consignment
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedArtwork({ id: artwork.id, title: artwork.title });
                      setSaleModalOpen(true);
                    }}
                    className="flex-1"
                  >
                    Claim Sale
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Sale Request Modal */}
      {selectedArtwork && (
        <SaleRequestModal
          isOpen={saleModalOpen}
          onClose={() => {
            setSaleModalOpen(false);
            setSelectedArtwork(null);
          }}
          artworkId={selectedArtwork.id}
          artworkTitle={selectedArtwork.title}
          onSubmit={handleSaleSubmit}
        />
      )}
    </div>
  );
}
