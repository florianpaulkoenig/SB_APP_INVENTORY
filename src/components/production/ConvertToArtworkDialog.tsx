import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { generateArtworkRefCode } from '../../lib/utils';
import { useDocumentNumber } from '../../hooks/useDocumentNumber';
import { supabase } from '../../lib/supabase';
import { generateAndUploadThumbnail } from '../../lib/imageThumbnails';
import {
  ARTWORK_CATEGORIES,
  ARTWORK_MOTIFS,
  ARTWORK_SERIES,
  ARTWORK_COLORS,
  EDITION_TYPES,
  CURRENCIES,
  DOC_PREFIXES,
} from '../../lib/constants';
import type {
  ProductionOrderItemRow,
  ArtworkStatus,
  ArtworkCategory,
  ArtworkMotif,
  ArtworkSeries,
  ArtworkColor,
  EditionType,
  Currency,
  DimensionUnit,
} from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ConvertToArtworkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: ProductionOrderItemRow;
  /** Gallery of the parent production order — pre-selected as the artwork's gallery */
  galleryId?: string | null;
  onConverted: (artworkId: string) => void;
}

// ---------------------------------------------------------------------------
// Artwork status options (subset relevant to conversion)
// ---------------------------------------------------------------------------

const ARTWORK_STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'in_production', label: 'In Production' },
  { value: 'reserved', label: 'Reserved' },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConvertToArtworkDialog({
  isOpen,
  onClose,
  item,
  galleryId,
  onConverted,
}: ConvertToArtworkDialogProps) {
  const { generateNumber } = useDocumentNumber();

  // ---- Form state (pre-filled from production item) -----------------------

  const [inventoryNumber, setInventoryNumber] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [title, setTitle] = useState(item.description);
  const [medium, setMedium] = useState(item.medium ?? '');
  const [year, setYear] = useState(
    item.year != null ? String(item.year) : String(new Date().getFullYear()),
  );

  // Dimensions
  const [height, setHeight] = useState(
    item.height != null ? String(item.height) : '',
  );
  const [width, setWidth] = useState(
    item.width != null ? String(item.width) : '',
  );
  const [depth, setDepth] = useState(
    item.depth != null ? String(item.depth) : '',
  );
  const [dimensionUnit, setDimensionUnit] = useState<string>(
    item.dimension_unit ?? 'cm',
  );

  // Framed dimensions
  const [framedHeight, setFramedHeight] = useState(
    item.framed_height != null ? String(item.framed_height) : '',
  );
  const [framedWidth, setFramedWidth] = useState(
    item.framed_width != null ? String(item.framed_width) : '',
  );
  const [framedDepth, setFramedDepth] = useState(
    item.framed_depth != null ? String(item.framed_depth) : '',
  );
  const [weight, setWeight] = useState(
    item.weight != null ? String(item.weight) : '',
  );

  // Edition
  const [editionType, setEditionType] = useState<string>(
    item.edition_type ?? 'unique',
  );
  const [editionNumber, setEditionNumber] = useState(
    item.edition_number != null ? String(item.edition_number) : '',
  );
  const [editionTotal, setEditionTotal] = useState(
    item.edition_total != null ? String(item.edition_total) : '',
  );

  // Price
  const [price, setPrice] = useState(
    item.price != null ? String(item.price) : '',
  );
  const [currency, setCurrency] = useState(item.currency ?? 'EUR');

  // Classification
  const [category, setCategory] = useState(item.category ?? '');
  const [motif, setMotif] = useState(item.motif ?? '');
  const [series, setSeries] = useState(item.series ?? '');
  const [color, setColor] = useState(item.color ?? '');

  // Notes
  const [notes, setNotes] = useState(item.notes ?? '');

  // Gallery (pre-filled from the production order)
  const [gallery, setGallery] = useState(galleryId ?? '');
  const [galleryOptions, setGalleryOptions] = useState<{ value: string; label: string }[]>([]);

  const [status, setStatus] = useState<string>('available');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ---- Auto-generate inventory number & reference code --------------------

  useEffect(() => {
    if (!isOpen) return;

    // Reset form when dialog opens with new item
    setTitle(item.description);
    setMedium(item.medium ?? '');
    setYear(item.year != null ? String(item.year) : String(new Date().getFullYear()));
    setHeight(item.height != null ? String(item.height) : '');
    setWidth(item.width != null ? String(item.width) : '');
    setDepth(item.depth != null ? String(item.depth) : '');
    setDimensionUnit(item.dimension_unit ?? 'cm');
    setFramedHeight(item.framed_height != null ? String(item.framed_height) : '');
    setFramedWidth(item.framed_width != null ? String(item.framed_width) : '');
    setFramedDepth(item.framed_depth != null ? String(item.framed_depth) : '');
    setWeight(item.weight != null ? String(item.weight) : '');
    setEditionType(item.edition_type ?? 'unique');
    setEditionNumber(item.edition_number != null ? String(item.edition_number) : '');
    setEditionTotal(item.edition_total != null ? String(item.edition_total) : '');
    setPrice(item.price != null ? String(item.price) : '');
    setCurrency(item.currency ?? 'EUR');
    setCategory(item.category ?? '');
    setMotif(item.motif ?? '');
    setSeries(item.series ?? '');
    setColor(item.color ?? '');
    setNotes(item.notes ?? '');
    setGallery(galleryId ?? '');
    setStatus('available');
    setErrors({});

    // Load galleries for the gallery select
    supabase
      .from('galleries')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        setGalleryOptions(
          ((data ?? []) as { id: string; name: string }[]).map((g) => ({
            value: g.id,
            label: g.name,
          })),
        );
      });

    // Carry over the item's reference code — the piece keeps one code for life.
    // Only legacy items without a code get a freshly generated one.
    setReferenceCode(item.reference_code ?? generateArtworkRefCode());

    async function generateInvNumber() {
      const num = await generateNumber(DOC_PREFIXES.artwork);
      if (num) setInventoryNumber(num);
    }

    generateInvNumber();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item.id]);

  // ---- Validation ---------------------------------------------------------

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!title.trim()) {
      next.title = 'Title is required';
    }

    if (!inventoryNumber.trim()) {
      next.inventoryNumber = 'Inventory number is required';
    }

    if (!referenceCode.trim()) {
      next.referenceCode = 'Reference code is required';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ---- Submit: create artwork & link back to production item --------------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setErrors({ submit: 'You must be logged in' });
        return;
      }

      const parseNum = (v: string) => (v ? parseFloat(v) : null);
      const parseInt_ = (v: string) => (v ? parseInt(v, 10) : null);

      // 1. Create the artwork
      const { data: artwork, error: artworkError } = await supabase
        .from('artworks')
        .insert({
          user_id: session.user.id,
          inventory_number: inventoryNumber.trim(),
          reference_code: referenceCode.trim(),
          title: title.trim(),
          medium: medium.trim() || null,
          height: parseNum(height),
          width: parseNum(width),
          depth: parseNum(depth),
          dimension_unit: dimensionUnit as DimensionUnit,
          framed_height: parseNum(framedHeight),
          framed_width: parseNum(framedWidth),
          framed_depth: parseNum(framedDepth),
          weight: parseNum(weight),
          year: parseInt_(year),
          edition_type: editionType as EditionType,
          edition_number: parseInt_(editionNumber),
          edition_total: parseInt_(editionTotal),
          price: parseNum(price),
          currency: currency as Currency,
          category: (category || null) as ArtworkCategory | null,
          motif: (motif || null) as ArtworkMotif | null,
          series: (series || null) as ArtworkSeries | null,
          color: (color || null) as ArtworkColor | null,
          notes: notes.trim() || null,
          gallery_id: gallery || null,
          is_circular: item.is_circular,
          is_window: item.is_window,
          lamination_needed: item.lamination_needed,
          lamination_cost: item.lamination_cost,
          status: status as ArtworkStatus,
        } as never)
        .select('id')
        .single();

      if (artworkError) throw artworkError;

      // 2. Link the artwork_id back to the production order item
      const { error: linkError } = await supabase
        .from('production_order_items')
        .update({ artwork_id: artwork.id })
        .eq('id', item.id);

      if (linkError) throw linkError;

      // 3. Copy the item's reference photos over as artwork images
      //    (best effort — a failed photo copy must not block the conversion)
      try {
        const prefix = `${session.user.id}/production-orders/${item.production_order_id}/items/${item.id}`;
        const { data: files } = await supabase.storage
          .from('artwork-images')
          .list(prefix);
        const photos = (files ?? []).filter((f) => !f.name.startsWith('.'));

        let isPrimary = true;
        for (let i = 0; i < photos.length; i++) {
          const srcPath = `${prefix}/${photos[i].name}`;
          const destPath = `${session.user.id}/${artwork.id}/${photos[i].name}`;

          const { error: copyError } = await supabase.storage
            .from('artwork-images')
            .copy(srcPath, destPath);
          if (copyError) {
            console.warn('Failed to copy reference photo:', copyError.message);
            continue;
          }

          // Reference photos have no thumbs/ copy — generate one for grids
          const { data: blob } = await supabase.storage
            .from('artwork-images')
            .download(srcPath);
          if (blob) await generateAndUploadThumbnail('artwork-images', destPath, blob);

          const { error: imageInsertError } = await supabase
            .from('artwork_images')
            .insert({
              user_id: session.user.id,
              artwork_id: artwork.id,
              storage_path: destPath,
              file_name: photos[i].name,
              image_type: 'raw',
              is_primary: isPrimary,
              sort_order: i,
            } as never);
          if (imageInsertError) {
            console.warn('Failed to register reference photo:', imageInsertError.message);
            continue;
          }
          isPrimary = false;
        }
      } catch (err) {
        console.warn('Reference photo transfer failed:', err);
      }

      // 4. Auto-create certificate of authenticity
      try {
        const { data: certNumber } = await supabase.rpc('generate_document_number', {
          p_user_id: session.user.id,
          p_prefix: 'COA',
        });

        if (certNumber) {
          await supabase
            .from('certificates')
            .insert({
              user_id: session.user.id,
              artwork_id: artwork.id,
              certificate_number: certNumber,
              issue_date: new Date().toISOString().split('T')[0],
            } as never);
        }
      } catch {
        // Best-effort; don't block artwork conversion
      }

      onConverted(artwork.id);
      onClose();
    } catch (err: unknown) {
      setErrors({ submit: 'Failed to create artwork. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  // ---- Render -------------------------------------------------------------

  const categoryOptions = [
    { value: '', label: 'Select category...' },
    ...ARTWORK_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
  ];
  const motifOptions = [
    { value: '', label: 'Select motif...' },
    ...ARTWORK_MOTIFS.map((m) => ({ value: m.value, label: m.label })),
  ];
  const seriesOptions = [
    { value: '', label: 'Select series...' },
    ...ARTWORK_SERIES.map((s) => ({ value: s.value, label: s.label })),
  ];
  const colorOptions = [
    { value: '', label: 'Select color...' },
    ...ARTWORK_COLORS.map((c) => ({ value: c.value, label: c.label })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convert to Artwork" size="3xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {errors.submit && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {errors.submit}
          </div>
        )}

        {/* Auto-generated codes */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Inventory Number *"
            value={inventoryNumber}
            onChange={(e) => setInventoryNumber(e.target.value)}
            error={errors.inventoryNumber}
            readOnly={!!inventoryNumber}
            disabled={!!inventoryNumber}
            helperText="Auto-generated"
          />
          <Input
            label="Reference Code *"
            value={referenceCode}
            onChange={(e) => setReferenceCode(e.target.value)}
            error={errors.referenceCode}
            readOnly={!!referenceCode}
            disabled={!!referenceCode}
            helperText="Auto-generated"
          />
        </div>

        {/* Title & Medium & Year */}
        <Input
          label="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          placeholder="Artwork title"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Medium"
            value={medium}
            onChange={(e) => setMedium(e.target.value)}
            placeholder="e.g. Glass, acrylic"
          />
          <Input
            label="Year"
            type="number"
            min="1900"
            max="2100"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>

        {/* Dimensions (Unframed) */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Input label="Height" type="number" min="0" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} />
          <Input label="Width" type="number" min="0" step="0.1" value={width} onChange={(e) => setWidth(e.target.value)} />
          <Input label="Depth" type="number" min="0" step="0.1" value={depth} onChange={(e) => setDepth(e.target.value)} />
          <Select
            label="Unit"
            options={[{ value: 'cm', label: 'cm' }, { value: 'inches', label: 'inches' }]}
            value={dimensionUnit}
            onChange={(e) => setDimensionUnit(e.target.value)}
          />
        </div>

        {/* Dimensions (Framed) */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Input label="Framed H" type="number" min="0" step="0.1" value={framedHeight} onChange={(e) => setFramedHeight(e.target.value)} />
          <Input label="Framed W" type="number" min="0" step="0.1" value={framedWidth} onChange={(e) => setFramedWidth(e.target.value)} />
          <Input label="Framed D" type="number" min="0" step="0.1" value={framedDepth} onChange={(e) => setFramedDepth(e.target.value)} />
          <Input label="Weight (kg)" type="number" min="0" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>

        {/* Edition */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Edition Type"
            options={EDITION_TYPES.map((e) => ({ value: e.value, label: e.label }))}
            value={editionType}
            onChange={(e) => setEditionType(e.target.value)}
          />
          {editionType === 'numbered' && (
            <>
              <Input label="Edition #" type="number" min="1" step="1" value={editionNumber} onChange={(e) => setEditionNumber(e.target.value)} />
              <Input label="Edition Total" type="number" min="1" step="1" value={editionTotal} onChange={(e) => setEditionTotal(e.target.value)} />
            </>
          )}
        </div>

        {/* Price & Currency */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Price" type="number" min="0" step="0.01" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Select
            label="Currency"
            options={CURRENCIES.map((c) => ({ value: c.value, label: c.label }))}
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'EUR' | 'USD' | 'CHF' | 'GBP')}
          />
        </div>

        {/* Classification */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Category" options={categoryOptions} value={category} onChange={(e) => setCategory(e.target.value)} />
          <Select label="Motif" options={motifOptions} value={motif} onChange={(e) => setMotif(e.target.value)} />
          <Select label="Series" options={seriesOptions} value={series} onChange={(e) => setSeries(e.target.value)} />
          <Select label="Color" options={colorOptions} value={color} onChange={(e) => setColor(e.target.value)} />
        </div>

        {/* Notes */}
        <Textarea
          label="Notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes carried over from the production item"
        />

        {/* Gallery & Status */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Gallery"
            options={[{ value: '', label: 'No gallery' }, ...galleryOptions]}
            value={gallery}
            onChange={(e) => setGallery(e.target.value)}
          />
          <Select
            label="Artwork Status"
            options={[...ARTWORK_STATUS_OPTIONS]}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-primary-100 pt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Artwork
          </Button>
        </div>
      </form>
    </Modal>
  );
}
