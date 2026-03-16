import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
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

// Lazy-load MapView to avoid pulling 1.7MB mapbox-gl into this chunk
const MapView = React.lazy(() =>
  import('../components/maps/MapView').then((m) => ({ default: m.MapView })),
);
import { getCoordinates } from '../lib/geocoding';
import { CatalogueArtworkPicker } from '../components/catalogues/CatalogueArtworkPicker';
import { TaskList } from '../components/crm/TaskList';
import { useExhibitionImages } from '../hooks/useExhibitionImages';

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

interface LinkedProductionOrder {
  id: string;
  exhibition_id: string;
  production_order_id: string;
  production_orders: {
    id: string;
    title: string;
    order_number: string;
    status: string | null;
    deadline: string | null;
  };
}

interface ProductionOrderOption {
  id: string;
  title: string;
  order_number: string;
  deadline: string | null;
}

export function ExhibitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exhibition, setExhibition] = useState<Exhibition | null>(null);
  const [loading, setLoading] = useState(true);
  const [artworks, setArtworks] = useState<ExhibitionArtwork[]>([]);
  const [galleryOptions, setGalleryOptions] = useState<GalleryOption[]>([]);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const { galleries, loading: galleriesLoading, linkGallery, unlinkGallery } = useExhibitionGalleries(id!);

  const [addGalleryOpen, setAddGalleryOpen] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState('');
  const [boothNumber, setBoothNumber] = useState('');

  const [artworkPickerOpen, setArtworkPickerOpen] = useState(false);
  const [selectedArtworkIds, setSelectedArtworkIds] = useState<string[]>([]);
  const [artworkSaving, setArtworkSaving] = useState(false);
  const initialArtworkIdsRef = useRef<string[]>([]);

  // Exhibition images
  const {
    images: exhibitionImages,
    loading: imagesLoading,
    uploadImage: uploadExhibitionImage,
    deleteImage: deleteExhibitionImage,
    updateCaption: updateImageCaption,
  } = useExhibitionImages(id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editingCaptionText, setEditingCaptionText] = useState('');

  const [linkedPOs, setLinkedPOs] = useState<LinkedProductionOrder[]>([]);
  const [poModalOpen, setPOModalOpen] = useState(false);
  const [poOptions, setPOOptions] = useState<ProductionOrderOption[]>([]);
  const [poSearch, setPOSearch] = useState('');
  const [poLoading, setPOLoading] = useState(false);

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
        const coords = getCoordinates(data.city, data.country);
        if (coords) setCoordinates(coords);
      }
    } catch {
      toast({ title: 'Failed to load exhibition', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  const fetchArtworks = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('exhibition_artworks')
        .select('*, artworks(id, title, medium, year, price, currency, status)')
        .eq('exhibition_id', id);
      if (error) throw error;
      const list = (data || []) as ExhibitionArtwork[];
      setArtworks(list);
      const ids = list.map((ea) => ea.artwork_id);
      setSelectedArtworkIds(ids);
      initialArtworkIdsRef.current = ids;
    } catch {
      toast({ title: 'Failed to load artworks', variant: 'error' });
    }
  }, [id, toast]);

  const fetchLinkedPOs = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('exhibition_production_orders')
        .select('*, production_orders(id, title, order_number, status, deadline)')
        .eq('exhibition_id', id);
      if (error) throw error;
      setLinkedPOs((data || []) as LinkedProductionOrder[]);
    } catch {
      // table may not exist yet — ignore silently
    }
  }, [id]);

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
    fetchLinkedPOs();
    fetchGalleryOptions();
  }, [fetchExhibition, fetchArtworks, fetchLinkedPOs, fetchGalleryOptions]);

  const handleLinkGallery = useCallback(async () => {
    if (!selectedGalleryId) {
      toast({ title: 'Select a gallery', variant: 'error' });
      return;
    }
    try {
      await linkGallery({ gallery_id: selectedGalleryId, booth_number: boothNumber || null } as never);
      toast({ title: 'Gallery linked', variant: 'success' });
      setAddGalleryOpen(false);
      setSelectedGalleryId('');
      setBoothNumber('');
    } catch {
      toast({ title: 'Failed to link gallery', variant: 'error' });
    }
  }, [selectedGalleryId, boothNumber, linkGallery, toast]);

  const handleUnlinkGallery = useCallback(async (galleryLinkId: string) => {
    if (!confirm('Remove this gallery from the exhibition?')) return;
    try {
      await unlinkGallery(galleryLinkId);
      toast({ title: 'Gallery removed', variant: 'success' });
    } catch {
      toast({ title: 'Failed to remove gallery', variant: 'error' });
    }
  }, [unlinkGallery, toast]);

  const handleSaveArtworks = useCallback(async () => {
    if (!id) return;
    setArtworkSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const uid = session.user.id;

      const prev = new Set(initialArtworkIdsRef.current);
      const next = new Set(selectedArtworkIds);

      // Artworks to add (in next but not in prev)
      const toAdd = selectedArtworkIds.filter((aid) => !prev.has(aid));
      // Artworks to remove (in prev but not in next)
      const toRemove = initialArtworkIdsRef.current.filter((aid) => !next.has(aid));

      // Remove de-selected
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('exhibition_artworks')
          .delete()
          .eq('exhibition_id', id)
          .in('artwork_id', toRemove);
        if (error) throw error;
      }

      // Add newly selected
      if (toAdd.length > 0) {
        const rows = toAdd.map((artwork_id) => ({
          exhibition_id: id,
          artwork_id,
          user_id: uid,
        }));
        const { error } = await supabase
          .from('exhibition_artworks')
          .insert(rows as never);
        if (error) throw error;
      }

      toast({ title: 'Artworks updated', variant: 'success' });
      setArtworkPickerOpen(false);
      fetchArtworks();
    } catch {
      toast({ title: 'Failed to update artworks', variant: 'error' });
    } finally {
      setArtworkSaving(false);
    }
  }, [id, selectedArtworkIds, fetchArtworks, toast]);

  const openPOModal = useCallback(async () => {
    setPOModalOpen(true);
    setPOLoading(true);
    try {
      const { data, error } = await supabase
        .from('production_orders')
        .select('id, title, order_number, deadline');
      if (error) throw error;
      setPOOptions((data || []) as ProductionOrderOption[]);
    } catch {
      toast({ title: 'Failed to load production orders', variant: 'error' });
    } finally {
      setPOLoading(false);
    }
  }, [toast]);

  const handleAddPO = useCallback(async (poId: string) => {
    if (!id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { error } = await supabase
        .from('exhibition_production_orders')
        .insert({ exhibition_id: id, production_order_id: poId, user_id: session.user.id } as never);
      if (error) throw error;
      toast({ title: 'Production order linked', variant: 'success' });
      setPOModalOpen(false);
      fetchLinkedPOs();
    } catch {
      toast({ title: 'Failed to link production order', variant: 'error' });
    }
  }, [id, fetchLinkedPOs, toast]);

  const handleRemovePO = useCallback(async (linkId: string) => {
    if (!confirm('Remove this production order?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { error } = await supabase.from('exhibition_production_orders').delete().eq('id', linkId);
      if (error) throw error;
      toast({ title: 'Production order removed', variant: 'success' });
      fetchLinkedPOs();
    } catch {
      toast({ title: 'Failed to remove production order', variant: 'error' });
    }
  }, [fetchLinkedPOs, toast]);

  // ---- Photo handlers -------------------------------------------------------

  const handlePhotoFiles = useCallback(async (files: FileList | File[]) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 20 * 1024 * 1024;
    const fileArr = Array.from(files).filter((f) => allowed.includes(f.type) && f.size <= maxSize);
    if (fileArr.length === 0) return;
    setUploadingPhoto(true);
    for (const file of fileArr) {
      await uploadExhibitionImage(file);
    }
    setUploadingPhoto(false);
  }, [uploadExhibitionImage]);

  const handleSaveCaption = useCallback(async (imageId: string) => {
    await updateImageCaption(imageId, editingCaptionText);
    setEditingCaptionId(null);
    setEditingCaptionText('');
  }, [editingCaptionText, updateImageCaption]);

  const filteredPOOptions = poOptions.filter((p) =>
    (p.title || p.order_number || '').toLowerCase().includes(poSearch.toLowerCase())
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
            <Input label="Booth #" value={boothNumber} onChange={(e) => setBoothNumber(e.target.value)} maxLength={50} />
            <Button variant="primary" onClick={handleLinkGallery}>Link</Button>
            <Button variant="primary" onClick={() => setAddGalleryOpen(false)}>Cancel</Button>
          </div>
        )}
      </Card>

      {/* Artworks in Exhibition */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Artworks in Exhibition</h2>
          <Button
            variant="primary"
            onClick={() => {
              setSelectedArtworkIds(initialArtworkIdsRef.current);
              setArtworkPickerOpen(true);
            }}
          >
            {artworks.length > 0 ? 'Edit Artworks' : 'Add Artworks'}
          </Button>
        </div>

        {artworkPickerOpen ? (
          <div className="space-y-4">
            <CatalogueArtworkPicker
              selectedIds={selectedArtworkIds}
              onSelectionChange={setSelectedArtworkIds}
            />
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <Button
                variant="primary"
                onClick={() => {
                  setSelectedArtworkIds(initialArtworkIdsRef.current);
                  setArtworkPickerOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveArtworks} disabled={artworkSaving}>
                {artworkSaving ? 'Saving...' : 'Save Selection'}
              </Button>
            </div>
          </div>
        ) : artworks.length === 0 ? (
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

      {/* Exhibition Photos */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Photos</h2>
          <span className="text-sm text-gray-500">{exhibitionImages.length} image{exhibitionImages.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Photo grid */}
        {imagesLoading ? (
          <LoadingSpinner />
        ) : exhibitionImages.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {exhibitionImages.map((img) => (
              <div key={img.id} className="group relative rounded-lg overflow-hidden border border-gray-200">
                {img.signedUrl ? (
                  <img src={img.signedUrl} alt={img.caption || img.file_name} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-xs text-gray-400">No preview</div>
                )}
                {/* Caption overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  {editingCaptionId === img.id ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={editingCaptionText}
                        onChange={(e) => setEditingCaptionText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCaption(img.id); }}
                        className="flex-1 bg-white/20 text-white text-xs rounded px-1 py-0.5 placeholder-white/50 focus:outline-none"
                        placeholder="Caption..."
                        autoFocus
                      />
                      <button onClick={() => handleSaveCaption(img.id)} className="text-xs text-green-300 hover:text-green-100">&#10003;</button>
                      <button onClick={() => setEditingCaptionId(null)} className="text-xs text-red-300 hover:text-red-100">&#10005;</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingCaptionId(img.id); setEditingCaptionText(img.caption || ''); }}
                      className="text-xs text-white/80 hover:text-white w-full text-left truncate"
                      title="Click to edit caption"
                    >
                      {img.caption || 'Add caption...'}
                    </button>
                  )}
                </div>
                {/* Delete button */}
                <button
                  onClick={() => deleteExhibitionImage(img.id, img.storage_path)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-opacity hover:bg-red-600"
                  title="Delete image"
                >
                  &#10005;
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4 mb-4">No photos uploaded yet.</p>
        )}

        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDraggingPhoto(true); }}
          onDragLeave={() => setIsDraggingPhoto(false)}
          onDrop={(e) => { e.preventDefault(); setIsDraggingPhoto(false); handlePhotoFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
            isDraggingPhoto ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) handlePhotoFiles(e.target.files); e.target.value = ''; }}
          />
          {uploadingPhoto ? (
            <p className="text-sm text-gray-500">Uploading...</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-600">Drop images here or click to browse</p>
              <p className="mt-1 text-xs text-gray-400">JPEG, PNG, WebP (max 20 MB each)</p>
            </>
          )}
        </div>
      </Card>

      {/* Linked Production Orders */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Linked Production Orders</h2>
          <Button variant="primary" onClick={openPOModal}>Add Production Order</Button>
        </div>
        {linkedPOs.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No production orders linked yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {linkedPOs.map((lpo) => (
                  <tr key={lpo.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{lpo.production_orders.title || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{lpo.production_orders.order_number || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {lpo.production_orders.status ? <Badge variant="default">{lpo.production_orders.status}</Badge> : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lpo.production_orders.deadline ? formatDate(lpo.production_orders.deadline) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button variant="primary" onClick={() => handleRemovePO(lpo.id)}>Remove</Button>
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
          <Suspense fallback={<div className="flex items-center justify-center h-[200px]"><LoadingSpinner size="sm" /></div>}>
            <MapView
              markers={[{ lat: coordinates.lat, lng: coordinates.lng, label: exhibition.venue || location }]}
              height="200px"
            />
          </Suspense>
        </Card>
      )}

      {/* Related Tasks */}
      <Card>
        <TaskList exhibitionId={id} compact />
      </Card>

      {/* Production Order Selector Modal */}
      <Modal isOpen={poModalOpen} onClose={() => setPOModalOpen(false)} title="Add Production Order">
        <div className="space-y-4">
          <Input
            label="Search Production Orders"
            value={poSearch}
            onChange={(e) => setPOSearch(e.target.value)}
          />
          {poLoading ? (
            <LoadingSpinner />
          ) : filteredPOOptions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No production orders found.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-200">
              {filteredPOOptions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleAddPO(p.id)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-gray-900">{p.title || p.order_number}</span>
                  <span className="text-xs text-gray-500">
                    {p.deadline ? formatDate(p.deadline) : ''}
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
