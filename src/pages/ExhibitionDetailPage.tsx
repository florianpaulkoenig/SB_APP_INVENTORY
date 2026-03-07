import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { useExhibitionGalleries } from '../hooks/useExhibitionGalleries';
import { EXHIBITION_TYPES } from '../lib/constants';
import { MapView } from '../components/maps/MapView';
import { getCoordinates } from '../lib/geocoding';

interface Exhibition {
  id: string;
  title: string;
  type: string;
  venue: string | null;
  city: string | null;
  country: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  budget_currency: string | null;
  catalogue_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ExhibitionArtwork {
  id: string;
  exhibition_id: string;
  artwork_id: string;
  artworks: {
    id: string;
    title: string;
    medium: string | null;
    year: number | null;
    price: number | null;
    currency: string | null;
    status: string | null;
  };
}

interface GalleryOption {
  id: string;
  name: string;
}

interface ArtworkOption {
  id: string;
  title: string;
  medium: string | null;
  year: number | null;
}

export function ExhibitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [loading, setLoading] = useState(true);
  const [artworks, setArtworks] = useState<ExhibitionArtwork[]>([]);
  const [galleryOptions, setGalleryOptions] = useState<GalleryOption[]>([]);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const { galleries, loading: galleriesLoading, linkGallery, unlinkGallery } = useExhibitionGalleries(id!);

  const [addGalleryOpen, setAddGalleryOpen] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState('');
  const [boothNumber, setBoothNumber] = useState('');

  const [artworkModalOpen, setArtworkModalOpen] = useState(false);
  const [artworkOptions, setArtworkOptions] = useState<ArtworkOption[]>([]);
  const [artworkSearch, setArtworkSearch] = useState('');
  const [artworkLoading, setArtworkLoading] = useState(false);

  const fetchExhibition = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exhibitions')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setExhibition(data as Exhibition);

      if (data.city || data.country) {
        const location = [data.city, data.country].filter(Boolean).join(', ');
        const coords = await getCoordinates(location);
        if (coords) setCoordinates(coords);
      }
    } catch {
      showError('Failed to load exhibition');
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  const fetchArtworks = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('exhibition_artworks')
        .select('*, artworks(id, title, medium, year, price, currency, status)')
        .eq('exhibition_id', id);
      if (error) throw error;
      setArtworks((data || []) as ExhibitionArtwork[]);
    } catch {
      showError('Failed to load artworks');
    }
  }, [id, showError]);

  const fetchGalleryOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('galleries').select('id, name');
      if (error) throw error;
      setGalleryOptions((data || []) as GalleryOption[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchExhibition();
    fetchArtworks();
    fetchGalleryOptions();
  }, [fetchExhibition, fetchArtworks, fetchGalleryOptions]);

  const handleLinkGallery = useCallback(async () => {
    if (!selectedGalleryId) {
      showError('Select a gallery');
      return;
    }
    try {
      await linkGallery({ gallery_id: selectedGalleryId, booth_number: boothNumber || null } as never);
      showSuccess('Gallery linked');
      setAddGalleryOpen(false);
      setSelectedGalleryId('');
      setBoothNumber('');
    } catch {
      showError('Failed to link gallery');
    }
  }, [selectedGalleryId, boothNumber, linkGallery, showSuccess, showError]);

  const handleUnlinkGallery = useCallback(async (galleryLinkId: string) => {
    if (!confirm('Remove this gallery from the exhibition?')) return;
    try {
      await unlinkGallery(galleryLinkId);
      showSuccess('Gallery removed');
    } catch {
      showError('Failed to remove gallery');
    }
  }, [unlinkGallery, showSuccess, showError]);

  const openArtworkModal = useCallback(async () => {
    setArtworkModalOpen(true);
    setArtworkLoading(true);
    try {
      const { data, error } = await supabase.from('artworks').select('id, title, medium, year');
      if (error) throw error;
      setArtworkOptions((data || []) as ArtworkOption[]);
    } catch {
      showError('Failed to load artworks');
    } finally {
      setArtworkLoading(false);
    }
  }, [showError]);

  const handleAddArtwork = useCallback(async (artworkId: string) => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from('exhibition_artworks')
        .insert({ exhibition_id: id, artwork_id: artworkId } as never);
      if (error) throw error;
      showSuccess('Artwork added to exhibition');
      setArtworkModalOpen(false);
      fetchArtworks();
    } catch {
      showError('Failed to add artwork');
    }
  }, [id, fetchArtworks, showSuccess, showError]);

  const filteredArtworkOptions = artworkOptions.filter((a) =>
    a.title?.toLowerCase().includes(artworkSearch.toLowerCase())
  );

  const getTypeBadge = (type: string) => {
    const found = EXHIBITION_TYPES.find((t) => t.value === type);
    return found ? <Badge variant="default">{found.label}</Badge> : null;
  };

  if (loading) return <LoadingSpinner />;
  if (!exhibition) return <p className="text-center text-gray-500 py-12">Exhibition not found.</p>;

  const location = [exhibition.city, exhibition.country].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="primary" onClick={() => navigate('/exhibitions')}>
          &larr; Back
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{exhibition.title}</h1>
            {exhibition.type && getTypeBadge(exhibition.type)}
          </div>
          {(exhibition.start_date || exhibition.end_date) && (
            <p className="text-sm text-gray-500 mt-1">
              {exhibition.start_date ? formatDate(exhibition.start_date) : ''}
              {exhibition.end_date ? ` — ${formatDate(exhibition.end_date)}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">Venue</p>
            <p className="text-sm font-medium">{exhibition.venue || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Location</p>
            <p className="text-sm font-medium">{location || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Budget</p>
            <p className="text-sm font-medium">
              {exhibition.budget ? formatCurrency(exhibition.budget, exhibition.budget_currency) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Catalogue Reference</p>
            <p className="text-sm font-medium">{exhibition.catalogue_reference || '—'}</p>
          </div>
        </div>
        {exhibition.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 uppercase mb-1">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{exhibition.notes}</p>
          </div>
        )}
      </Card>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-gray-500 uppercase">Artworks Shown</p>
          <p className="text-2xl font-bold">{artworks.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase">Galleries Participating</p>
          <p className="text-2xl font-bold">{galleries.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase">Direct Sales</p>
          <p className="text-2xl font-bold">0</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 uppercase">Revenue</p>
          <p className="text-2xl font-bold">CHF 0</p>
        </Card>
      </div>

      {/* Participating Galleries */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Participating Galleries</h2>
          <Button variant="primary" onClick={() => setAddGalleryOpen(true)}>Add Gallery</Button>
        </div>
        {galleriesLoading ? (
          <LoadingSpinner />
        ) : galleries.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No galleries linked yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gallery Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booth #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {galleries.map((g) => (
                  <tr key={g.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{g.gallery_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{g.booth_number || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{g.notes || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <Button variant="primary" onClick={() => handleUnlinkGallery(g.id)}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {addGalleryOpen && (
          <div className="mt-4 flex items-end gap-3 border-t pt-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Gallery</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                value={selectedGalleryId}
                onChange={(e) => setSelectedGalleryId(e.target.value)}
              >
                <option value="">Select gallery</option>
                {galleryOptions.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <Input label="Booth #" value={boothNumber} onChange={(e) => setBoothNumber(e.target.value)} />
            <Button variant="primary" onClick={handleLinkGallery}>Link</Button>
            <Button variant="primary" onClick={() => setAddGalleryOpen(false)}>Cancel</Button>
          </div>
        )}
      </Card>

      {/* Artworks in Exhibition */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Artworks in Exhibition</h2>
          <Button variant="primary" onClick={openArtworkModal}>Add Artwork</Button>
        </div>
        {artworks.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No artworks added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medium</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {artworks.map((ea) => (
                  <tr key={ea.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{ea.artworks.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ea.artworks.medium || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ea.artworks.year || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ea.artworks.price ? formatCurrency(ea.artworks.price, ea.artworks.currency) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {ea.artworks.status ? <Badge variant="default">{ea.artworks.status}</Badge> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Mini Map */}
      {coordinates && (exhibition.city || exhibition.country) && (
        <Card>
          <h2 className="text-lg font-semibold mb-3">Location</h2>
          <MapView
            markers={[{ lat: coordinates.lat, lng: coordinates.lng, label: exhibition.venue || location }]}
            height="200px"
          />
        </Card>
      )}

      {/* Artwork Selector Modal */}
      <Modal isOpen={artworkModalOpen} onClose={() => setArtworkModalOpen(false)} title="Add Artwork to Exhibition">
        <div className="space-y-4">
          <Input
            label="Search Artworks"
            value={artworkSearch}
            onChange={(e) => setArtworkSearch(e.target.value)}
          />
          {artworkLoading ? (
            <LoadingSpinner />
          ) : filteredArtworkOptions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No artworks found.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-200">
              {filteredArtworkOptions.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleAddArtwork(a.id)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-gray-900">{a.title}</span>
                  <span className="text-xs text-gray-500">
                    {[a.medium, a.year].filter(Boolean).join(' · ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
