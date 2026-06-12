import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatDate, formatDimensions, downloadBlob } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { useExhibitionGalleries } from '../hooks/useExhibitionGalleries';
import { useExhibitionFloorPlans } from '../hooks/useExhibitionFloorPlans';
import { EXHIBITION_TYPES } from '../lib/constants';
import { ExhibitionDossierPDF } from '../components/pdf/ExhibitionDossierPDF';
import type { DossierProductionOrder } from '../components/pdf/ExhibitionDossierPDF';

// Lazy-load MapView to avoid pulling 1.7MB mapbox-gl into this chunk
const MapView = React.lazy(() =>
  import('../components/maps/MapView').then((m) => ({ default: m.MapView })),
);
import { getCoordinates } from '../lib/geocoding';
import { CatalogueArtworkPicker } from '../components/catalogues/CatalogueArtworkPicker';
import { TaskList } from '../components/crm/TaskList';
import { useExhibitionImages } from '../hooks/useExhibitionImages';
import type { ExhibitionPhotoType } from '../hooks/useExhibitionImages';
import { RichTextEditor } from '../components/ui/RichTextEditor';

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
  description_text: string | null;
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
  const { floorPlans, loading: floorPlansLoading, uploadFloorPlan, deleteFloorPlan, updateDescription: updateFloorPlanDesc, reorderFloorPlans } = useExhibitionFloorPlans(id);

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
    updatePhotoType: updateImagePhotoType,
    reorderImages,
  } = useExhibitionImages(id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [editingCaptionText, setEditingCaptionText] = useState('');
  const photoDragIndex = useRef<number | null>(null);
  const [photoDragOverIndex, setPhotoDragOverIndex] = useState<number | null>(null);
  const floorPlanDragIndex = useRef<number | null>(null);

  // ---- Exhibition text (dossier statement) --------------------------------
  const [descText, setDescText] = useState('');
  const [descSaving, setDescSaving] = useState(false);
  const [descSaved, setDescSaved] = useState(false);
  const descSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Floor plan upload + description editing ----------------------------
  const floorPlanInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFloorPlan, setUploadingFloorPlan] = useState(false);
  const [editingFPDescId, setEditingFPDescId] = useState<string | null>(null);
  const [editingFPDescText, setEditingFPDescText] = useState('');

  // ---- Dossier PDF download -----------------------------------------------
  const [downloadingDossier, setDownloadingDossier] = useState(false);
  const [dossierCreatedBy, setDossierCreatedBy] = useState(
    'Florian Paul Koenig, +41 76 511 92 94, florian.koenig@noacontemporary.com',
  );

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
      // Sync description text from DB
      setDescText(data.description_text ?? '');
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

  // ---- Debounced description_text save ------------------------------------

  function handleDescTextChange(value: string) {
    setDescText(value);
    setDescSaved(false);
    if (descSaveTimer.current) clearTimeout(descSaveTimer.current);
    descSaveTimer.current = setTimeout(async () => {
      if (!id) return;
      setDescSaving(true);
      await supabase
        .from('exhibitions')
        .update({ description_text: value } as never)
        .eq('id', id);
      setDescSaving(false);
      setDescSaved(true);
      setTimeout(() => setDescSaved(false), 2000);
    }, 900);
  }

  // ---- Floor plan upload --------------------------------------------------

  async function handleFloorPlanFiles(files: FileList | File[]) {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;
    setUploadingFloorPlan(true);
    for (const file of fileArr) {
      await uploadFloorPlan(file);
    }
    setUploadingFloorPlan(false);
  }

  // ---- Dossier PDF download -----------------------------------------------

  async function handleDownloadDossier() {
    if (!exhibition) return;
    setDownloadingDossier(true);

    try {
      // 1. Convert floor plans to image data URLs (preserve descriptions)
      const getImageOrientation = (dataUrl: string): Promise<boolean> =>
        new Promise((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve(img.naturalWidth > img.naturalHeight);
          img.onerror = () => resolve(false);
          img.src = dataUrl;
        });

      const floorPlanImages: Array<{ dataUrl: string; description?: string | null; isLandscape?: boolean }> = [];
      for (const fp of floorPlans) {
        const { data: blob } = await supabase.storage
          .from('media-files')
          .download(fp.storage_path);
        if (!blob) continue;

        const lowerName = fp.file_name.toLowerCase();
        if (lowerName.endsWith('.pdf')) {
          const { pdfBlobToDataUrls } = await import('../lib/pdfToDataUrls');
          const pages = await pdfBlobToDataUrls(blob, 2.0);
          for (const [pageIdx, dataUrl] of pages.entries()) {
            const desc = fp.description
              ? (pages.length > 1 ? `${fp.description} (${pageIdx + 1}/${pages.length})` : fp.description)
              : null;
            const isLandscape = await getImageOrientation(dataUrl);
            floorPlanImages.push({ dataUrl, description: desc, isLandscape });
          }
        } else {
          const { blobToDataUrl } = await import('../lib/pdfToDataUrls');
          const dataUrl = await blobToDataUrl(blob);
          const isLandscape = await getImageOrientation(dataUrl);
          floorPlanImages.push({ dataUrl, description: fp.description ?? null, isLandscape });
        }
      }

      // 2. Convert exhibition photos to JPEG data URLs, split by photo_type
      // blobToJpegDataUrl normalises WebP/HEIC/AVIF → JPEG which react-pdf supports
      const { blobToJpegDataUrl } = await import('../lib/pdfToDataUrls');
      const exhibitionPhotos: Array<{ dataUrl: string; caption?: string }> = [];
      const venuePhotos:      Array<{ dataUrl: string; caption?: string }> = [];
      for (const img of exhibitionImages) {
        const { data: imgBlob } = await supabase.storage
          .from('media-files')
          .download(img.storage_path);
        if (!imgBlob) continue;
        try {
          const dataUrl = await blobToJpegDataUrl(imgBlob);
          const entry = { dataUrl, caption: img.caption || undefined };
          if (img.photo_type === 'venue') venuePhotos.push(entry);
          else exhibitionPhotos.push(entry);
        } catch {
          // skip images that fail to convert
        }
      }

      // 4. Fetch items (+ ref images) for each linked production order
      const { data: { session: dossierSession } } = await supabase.auth.getSession();
      const dossierUserId = dossierSession?.user?.id;

      const ordersWithItems: DossierProductionOrder[] = await Promise.all(
        linkedPOs.map(async (lpo) => {
          const { data: items } = await supabase
            .from('production_order_items')
            .select('id, description, medium, height, width, depth, dimension_unit, is_circular, quantity')
            .eq('production_order_id', lpo.production_order_id)
            .order('sort_order', { ascending: true });

          // Fetch all notes for this production order once
          const { data: noteRows } = await supabase
            .from('production_order_image_notes')
            .select('storage_path, note')
            .eq('production_order_id', lpo.production_order_id);
          const noteMap: Record<string, string> = {};
          for (const n of noteRows ?? []) noteMap[n.storage_path] = n.note;

          const mappedItems = await Promise.all(
            (items ?? []).map(async (item) => {
              // Fetch reference photos from storage
              const refUrls: string[] = [];
              const refNotes: string[] = [];
              if (dossierUserId) {
                const prefix = `${dossierUserId}/production-orders/${lpo.production_order_id}/items/${item.id}`;
                const { data: files } = await supabase.storage.from('artwork-images').list(prefix);
                if (files && files.length > 0) {
                  const { blobToDataUrl } = await import('../lib/pdfToDataUrls');
                  for (const file of files) {
                    if (!file.id) continue;
                    const filePath = `${prefix}/${file.name}`;
                    const { data: blob } = await supabase.storage
                      .from('artwork-images')
                      .download(filePath);
                    if (blob) {
                      refUrls.push(await blobToDataUrl(blob));
                      refNotes.push(noteMap[filePath] ?? '');
                    }
                  }
                }
              }
              return {
                description: item.description,
                medium: item.medium,
                dimensions: formatDimensions(
                  item.height, item.width, item.depth,
                  (item.dimension_unit as string) ?? 'cm',
                  item.is_circular,
                ),
                quantity: item.quantity,
                referenceImageUrls: refUrls,
                referenceImageNotes: refNotes,
              };
            }),
          );

          return {
            order_number: lpo.production_orders.order_number,
            title: lpo.production_orders.title,
            status: lpo.production_orders.status ?? '',
            deadline: lpo.production_orders.deadline,
            items: mappedItems,
          };
        }),
      );

      // 5. Generate and download
      const blob = await pdf(
        <ExhibitionDossierPDF
          exhibition={{
            title: exhibition.title,
            type: exhibition.type,
            venue: exhibition.venue,
            city: exhibition.city,
            country: exhibition.country,
            start_date: exhibition.start_date,
            end_date: exhibition.end_date,
            description_text: exhibition.description_text ?? descText,
            notes: exhibition.notes,
          }}
          floorPlanImages={floorPlanImages}
          venuePhotos={venuePhotos}
          exhibitionPhotos={exhibitionPhotos}
          productionOrders={ordersWithItems}
          createdBy={dossierCreatedBy}
        />
      ).toBlob();

      downloadBlob(blob, `${exhibition.title.replace(/\s+/g, '_')}_Dossier.pdf`);
    } finally {
      setDownloadingDossier(false);
    }
  }

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
      <div className="flex items-center justify-between gap-4">
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
        <div className="flex flex-col items-end gap-2">
          <Button
            variant="primary"
            onClick={handleDownloadDossier}
            disabled={downloadingDossier}
          >
            {downloadingDossier ? (
              'Generating…'
            ) : (
              <>
                <svg className="h-4 w-4 mr-1.5 inline-block" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Dossier
              </>
            )}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 whitespace-nowrap">Created by:</span>
            <input
              type="text"
              value={dossierCreatedBy}
              onChange={(e) => setDossierCreatedBy(e.target.value)}
              className="w-64 rounded border border-gray-200 px-2 py-1 text-[11px] text-gray-700 focus:border-gray-400 focus:outline-none"
              placeholder="Name, phone, email…"
            />
          </div>
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

      {/* Exhibition Text (dossier statement) */}
      <Card>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Exhibition Text</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Erscheint im Dossier PDF. Leerzeile = neuer Absatz.
            Toolbar: <strong>B</strong> fett · <em>I</em> kursiv · Fn¹ Fussnote
          </p>
        </div>
        <RichTextEditor
          value={descText}
          onChange={handleDescTextChange}
          placeholder="Ausstellungstext, kuratorischen Text oder Künstlernotiz eingeben…"
          rows={12}
          saveStatus={descSaving ? 'saving' : descSaved ? 'saved' : 'idle'}
        />
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
            {exhibitionImages.map((img, i) => (
              <div
                key={img.id}
                draggable
                onDragStart={(e) => {
                  photoDragIndex.current = i;
                  e.dataTransfer.setData('application/x-photo-reorder', '1');
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                  setPhotoDragOverIndex(i);
                }}
                onDragLeave={() => { setPhotoDragOverIndex(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPhotoDragOverIndex(null);
                  if (photoDragIndex.current === null || photoDragIndex.current === i) return;
                  const next = [...exhibitionImages];
                  const [moved] = next.splice(photoDragIndex.current, 1);
                  next.splice(i, 0, moved);
                  photoDragIndex.current = null;
                  reorderImages(next);
                }}
                onDragEnd={() => { photoDragIndex.current = null; setPhotoDragOverIndex(null); }}
                className={`group relative rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
                  photoDragOverIndex === i ? 'border-black scale-105 shadow-lg' : 'border-gray-200'
                }`}>
                {img.signedUrl ? (
                  <img draggable={false} src={img.signedUrl} alt={img.caption || img.file_name} className="w-full aspect-square object-cover" />
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
                {/* Photo type toggle (top-left) */}
                <button
                  onClick={() => updateImagePhotoType(img.id, img.photo_type === 'venue' ? 'exhibition' : 'venue' as ExhibitionPhotoType)}
                  className={`absolute top-1 left-1 opacity-0 group-hover:opacity-100 text-white rounded px-1.5 py-0.5 text-[10px] font-medium transition-opacity ${
                    img.photo_type === 'venue' ? 'bg-blue-500/80 hover:bg-blue-600' : 'bg-gray-600/80 hover:bg-gray-700'
                  }`}
                  title={img.photo_type === 'venue' ? 'Venue photo — click to set as Exhibition photo' : 'Exhibition photo — click to set as Venue photo'}
                >
                  {img.photo_type === 'venue' ? 'Venue' : 'Exhibition'}
                </button>
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
          onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-photo-reorder')) return; e.preventDefault(); setIsDraggingPhoto(true); }}
          onDragLeave={() => setIsDraggingPhoto(false)}
          onDrop={(e) => { if (e.dataTransfer.types.includes('application/x-photo-reorder')) return; e.preventDefault(); setIsDraggingPhoto(false); handlePhotoFiles(e.dataTransfer.files); }}
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

      {/* Floor Plans */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Floor Plans</h2>
            <p className="text-xs text-gray-400 mt-0.5">Upload PDF or image files. Each page appears full-bleed in the Dossier PDF.</p>
          </div>
          <span className="text-xs text-gray-500">{floorPlans.length} file{floorPlans.length !== 1 ? 's' : ''}</span>
        </div>

        {floorPlansLoading ? (
          <LoadingSpinner />
        ) : floorPlans.length > 0 ? (
          <ul className="mb-4 divide-y divide-gray-100">
            {floorPlans.map((fp, idx) => (
              <li
                key={fp.id}
                draggable
                onDragStart={() => { floorPlanDragIndex.current = idx; }}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={() => {
                  if (floorPlanDragIndex.current === null || floorPlanDragIndex.current === idx) return;
                  const next = [...floorPlans];
                  const [moved] = next.splice(floorPlanDragIndex.current, 1);
                  next.splice(idx, 0, moved);
                  floorPlanDragIndex.current = idx;
                  reorderFloorPlans(next);
                }}
                onDragEnd={() => { floorPlanDragIndex.current = null; }}
                className="py-3 cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-3">
                  {/* Drag handle */}
                  <span className="text-gray-300 select-none">⠿</span>
                  {/* Icon: PDF or image */}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-500 uppercase">
                    {fp.file_name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMG'}
                  </span>
                  <span className="flex-1 truncate text-sm text-gray-800">{fp.file_name}</span>
                  <span className="text-xs text-gray-400 shrink-0">#{idx + 1}</span>
                  <button
                    onClick={() => deleteFloorPlan(fp.id, fp.storage_path)}
                    className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Description field */}
                {editingFPDescId === fp.id ? (
                  <div className="mt-2 flex items-center gap-2 pl-11">
                    <input
                      type="text"
                      value={editingFPDescText}
                      onChange={(e) => setEditingFPDescText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateFloorPlanDesc(fp.id, editingFPDescText);
                          setEditingFPDescId(null);
                        }
                        if (e.key === 'Escape') setEditingFPDescId(null);
                      }}
                      className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:border-gray-400 focus:outline-none"
                      placeholder="Caption shown in PDF…"
                      autoFocus
                    />
                    <button
                      onClick={() => { updateFloorPlanDesc(fp.id, editingFPDescText); setEditingFPDescId(null); }}
                      className="text-xs text-green-600 hover:text-green-700"
                    >Save</button>
                    <button onClick={() => setEditingFPDescId(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingFPDescId(fp.id); setEditingFPDescText(fp.description ?? ''); }}
                    className="mt-1 ml-11 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {fp.description ? fp.description : '+ Add caption'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-center py-3 mb-4 text-sm">No floor plans uploaded yet.</p>
        )}

        {/* Upload zone */}
        <div
          onClick={() => floorPlanInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 px-4 py-5 transition-colors hover:border-gray-400"
        >
          <input
            ref={floorPlanInputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) handleFloorPlanFiles(e.target.files); e.target.value = ''; }}
          />
          {uploadingFloorPlan ? (
            <p className="text-sm text-gray-500">Uploading…</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-600">Drop files here or click to browse</p>
              <p className="mt-1 text-xs text-gray-400">PDF, JPEG, PNG or WebP · max 50 MB</p>
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
