import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { supabase } from '../../lib/supabase';
import { getSignedUrls } from '../../lib/signedUrlCache';
import { sanitizeStoragePath } from '../../lib/utils';
import {
  DIMENSION_UNITS,
  EDITION_TYPES,
  ARTWORK_CATEGORIES,
  ARTWORK_MOTIFS,
  ARTWORK_SERIES,
  ARTWORK_COLORS,
  CURRENCIES,
} from '../../lib/constants';
import type {
  ProductionOrderItemRow,
  ProductionOrderItemInsert,
  DimensionUnit,
  EditionType,
  Currency,
  ArtworkCategory,
  ArtworkMotif,
  ArtworkSeries,
  ArtworkColor,
} from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProductionItemEditorProps {
  /** Pass an existing item to pre-fill for editing */
  item?: ProductionOrderItemRow;
  onSubmit: (data: ProductionOrderItemInsert) => Promise<void>;
  onCancel: () => void;
  productionOrderId: string;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductionItemEditor({
  item,
  onSubmit,
  onCancel,
  productionOrderId,
  loading = false,
}: ProductionItemEditorProps) {
  // ---- Form state ---------------------------------------------------------

  const [description, setDescription] = useState(item?.description ?? '');
  const [medium, setMedium] = useState(item?.medium ?? '');
  const [year, setYear] = useState(
    item?.year != null ? String(item.year) : String(new Date().getFullYear()),
  );

  // Dimensions (unframed)
  const [isCircular, setIsCircular] = useState(false);
  const [height, setHeight] = useState(
    item?.height != null ? String(item.height) : '',
  );
  const [width, setWidth] = useState(
    item?.width != null ? String(item.width) : '',
  );
  const [depth, setDepth] = useState(
    item?.depth != null ? String(item.depth) : '',
  );
  const [dimensionUnit, setDimensionUnit] = useState<string>(
    item?.dimension_unit ?? 'cm',
  );

  // Dimensions (framed)
  const [framedHeight, setFramedHeight] = useState(
    item?.framed_height != null ? String(item.framed_height) : '',
  );
  const [framedWidth, setFramedWidth] = useState(
    item?.framed_width != null ? String(item.framed_width) : '',
  );
  const [framedDepth, setFramedDepth] = useState(
    item?.framed_depth != null ? String(item.framed_depth) : '',
  );
  const [weight, setWeight] = useState(
    item?.weight != null ? String(item.weight) : '',
  );

  // Edition
  const [editionType, setEditionType] = useState<string>(
    item?.edition_type ?? 'unique',
  );
  const [editionNumber, setEditionNumber] = useState(
    item?.edition_number != null ? String(item.edition_number) : '',
  );
  const [editionTotal, setEditionTotal] = useState(
    item?.edition_total != null ? String(item.edition_total) : '',
  );

  // Price
  const [price, setPrice] = useState(
    item?.price != null ? String(item.price) : '',
  );
  const [currency, setCurrency] = useState<string>(
    item?.currency ?? 'EUR',
  );

  // Classification
  const [category, setCategory] = useState<string>(item?.category ?? '');
  const [motif, setMotif] = useState<string>(item?.motif ?? '');
  const [series, setSeries] = useState<string>(item?.series ?? '');
  const [color, setColor] = useState<string>(item?.color ?? 'green');

  // Quantity & notes
  const [quantity, setQuantity] = useState(
    item?.quantity != null ? String(item.quantity) : '1',
  );
  const [notes, setNotes] = useState(item?.notes ?? '');

  // ---- Reference images state (multiple per item) --------------------------

  const { toast } = useToast();
  const refImageInputRef = useRef<HTMLInputElement>(null);
  const [refImages, setRefImages] = useState<Array<{ path: string; url: string }>>([]);
  const [refImageLoading, setRefImageLoading] = useState(false);
  const [refImageUploading, setRefImageUploading] = useState(false);

  const BUCKET = 'artwork-images';

  // Load existing reference images from storage folder on mount (edit mode)
  const loadRefImages = useCallback(async () => {
    if (!item?.id) return;
    setRefImageLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setRefImageLoading(false); return; }

    const prefix = `${session.user.id}/production-orders/${productionOrderId}/items/${item.id}`;
    const { data: files } = await supabase.storage.from(BUCKET).list(prefix);

    if (files && files.length > 0) {
      const validFiles = files.filter((f) => f.id); // skip subfolders
      const paths = validFiles.map((f) => `${prefix}/${f.name}`);
      const signedMap = await getSignedUrls(BUCKET, paths);
      const imgs = paths
        .map((path) => {
          const url = signedMap.get(path);
          return url ? { path, url } : null;
        })
        .filter((item): item is { path: string; url: string } => item !== null);
      setRefImages(imgs);
    } else {
      setRefImages([]);
    }
    setRefImageLoading(false);
  }, [item?.id, productionOrderId]);

  useEffect(() => {
    loadRefImages();
  }, [loadRefImages]);

  async function handleRefImageUpload(files: FileList | File[]) {
    if (!item?.id) return;

    const validFiles = Array.from(files).filter((file) => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const validExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
      const validMime = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
      return validExt && validMime;
    });
    if (validFiles.length === 0) {
      toast({ title: 'Invalid file type', description: 'Please use JPG, PNG, or WebP.', variant: 'error' });
      return;
    }

    setRefImageUploading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
      setRefImageUploading(false);
      return;
    }

    for (const file of validFiles) {
      const safeName = sanitizeStoragePath(file.name);
      const storagePath = `${session.user.id}/production-orders/${productionOrderId}/items/${item.id}/${safeName}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: true });

      if (error) {
        toast({ title: 'Upload failed', description: `Could not upload ${file.name}.`, variant: 'error' });
      }
    }

    toast({ title: `${validFiles.length} photo${validFiles.length > 1 ? 's' : ''} uploaded`, variant: 'success' });
    await loadRefImages();
    setRefImageUploading(false);
  }

  async function handleRefImageRemove(path: string) {
    if (!item?.id) return;

    setRefImageLoading(true);
    await supabase.storage.from(BUCKET).remove([path]);

    // Clear legacy DB column if it matches
    if (item.reference_image_path === path) {
      await supabase
        .from('production_order_items')
        .update({ reference_image_path: null } as never)
        .eq('id', item.id);
    }

    await loadRefImages();
    setRefImageLoading(false);
    toast({ title: 'Reference photo removed', variant: 'success' });
  }

  // ---- Validation ---------------------------------------------------------

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!description.trim()) {
      next.description = 'Title / description is required';
    }

    const parsedQuantity = parseInt(quantity, 10);
    if (!quantity || isNaN(parsedQuantity) || parsedQuantity < 1) {
      next.quantity = 'Quantity must be at least 1';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ---- Submit -------------------------------------------------------------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const parseNum = (v: string) => (v ? parseFloat(v) : null);
    const parseInt_ = (v: string) => (v ? parseInt(v, 10) : null);

    const data: ProductionOrderItemInsert = {
      production_order_id: productionOrderId,
      description: description.trim(),
      medium: medium.trim() || null,
      year: parseInt_(year),
      height: parseNum(height),
      width: isCircular ? parseNum(height) : parseNum(width),
      depth: parseNum(depth),
      dimension_unit: dimensionUnit as DimensionUnit,
      framed_height: parseNum(framedHeight),
      framed_width: parseNum(framedWidth),
      framed_depth: parseNum(framedDepth),
      weight: parseNum(weight),
      edition_type: editionType as EditionType,
      edition_number: parseInt_(editionNumber),
      edition_total: parseInt_(editionTotal),
      price: parseNum(price),
      currency: currency as Currency,
      category: (category || null) as ArtworkCategory | null,
      motif: (motif || null) as ArtworkMotif | null,
      series: (series || null) as ArtworkSeries | null,
      color: (color || null) as ArtworkColor | null,
      quantity: parseInt(quantity, 10) || 1,
      notes: notes.trim() || null,
    };

    await onSubmit(data);
  }

  // ---- Helpers for selects ------------------------------------------------

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
    ...ARTWORK_COLORS.map((c) => ({ value: c.value, label: c.label })),
  ];

  // ---- Presets ------------------------------------------------------------

  function applyPreset(preset: {
    height: string; width: string; depth: string;
    framedHeight: string; framedWidth: string; framedDepth: string;
    weight: string; medium: string; category: string; motif: string;
    series: string; currency: string; price: string;
  }) {
    setHeight(preset.height);
    setWidth(preset.width);
    setDepth(preset.depth);
    setFramedHeight(preset.framedHeight);
    setFramedWidth(preset.framedWidth);
    setFramedDepth(preset.framedDepth);
    setWeight(preset.weight);
    setMedium(preset.medium);
    setCategory(preset.category);
    setMotif(preset.motif);
    setSeries(preset.series);
    setCurrency(preset.currency);
    setPrice(preset.price);
    setDimensionUnit('cm');
    setEditionType('unique');
    setYear(String(new Date().getFullYear()));
  }

  const PRESETS = [
    {
      label: '100 × 100 cm — $25,000',
      values: {
        height: '100', width: '100', depth: '10',
        framedHeight: '', framedWidth: '', framedDepth: '',
        weight: '44', medium: 'Glass, acrylic', category: 'painting',
        motif: 'portrait', series: 'portrait', currency: 'USD', price: '25000',
      },
    },
    {
      label: '150 × 150 cm — $37,500',
      values: {
        height: '150', width: '150', depth: '15',
        framedHeight: '', framedWidth: '', framedDepth: '',
        weight: '100', medium: 'Glass, acrylic', category: 'painting',
        motif: 'portrait', series: 'portrait', currency: 'USD', price: '37500',
      },
    },
  ];

  // ---- Render -------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ---- Quick Presets ---- */}
      {!item && (
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-primary-400">
            Quick Presets
          </h3>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.values)}
                className="rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100 hover:border-primary-300"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- Basic Info ---- */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-primary-400">
          Basic Info
        </h3>
        <div className="space-y-4">
          <Input
            label="Title / Description *"
            placeholder="e.g. Portrait on glass, 120x80cm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={errors.description}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Medium"
              placeholder="e.g. Glass, acrylic, wood"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
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
        </div>
      </div>

      {/* ---- Dimensions (Unframed) ---- */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-primary-400">
          Dimensions (Unframed)
        </h3>
        <label className="mb-3 flex items-center gap-2 text-sm text-primary-700">
          <input
            type="checkbox"
            checked={isCircular}
            onChange={(e) => {
              const checked = e.target.checked;
              setIsCircular(checked);
              if (checked && height) setWidth(height);
            }}
            className="h-4 w-4 rounded border-primary-300 text-primary-900 focus:ring-primary-500"
          />
          Circular artwork
        </label>
        {isCircular ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Input
              label="Diameter"
              type="number"
              min="0"
              step="0.1"
              placeholder="0"
              value={height}
              onChange={(e) => { setHeight(e.target.value); setWidth(e.target.value); }}
            />
            <Input
              label="Depth"
              type="number"
              min="0"
              step="0.1"
              placeholder="0"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
            />
            <Select
              label="Unit"
              options={DIMENSION_UNITS.map((u) => ({ value: u.value, label: u.label }))}
              value={dimensionUnit}
              onChange={(e) => setDimensionUnit(e.target.value)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Input
              label="Height"
              type="number"
              min="0"
              step="0.1"
              placeholder="0"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
            <Input
              label="Width"
              type="number"
              min="0"
              step="0.1"
              placeholder="0"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
            <Input
              label="Depth"
              type="number"
              min="0"
              step="0.1"
              placeholder="0"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
            />
            <Select
              label="Unit"
              options={DIMENSION_UNITS.map((u) => ({ value: u.value, label: u.label }))}
              value={dimensionUnit}
              onChange={(e) => setDimensionUnit(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ---- Dimensions (Framed) ---- */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-primary-400">
          Dimensions (Framed)
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Input
            label="Framed Height"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            value={framedHeight}
            onChange={(e) => setFramedHeight(e.target.value)}
          />
          <Input
            label="Framed Width"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            value={framedWidth}
            onChange={(e) => setFramedWidth(e.target.value)}
          />
          <Input
            label="Framed Depth"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            value={framedDepth}
            onChange={(e) => setFramedDepth(e.target.value)}
          />
          <Input
            label="Weight (kg)"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
      </div>

      {/* ---- Edition ---- */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-primary-400">
          Edition
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Edition Type"
            options={EDITION_TYPES.map((e) => ({ value: e.value, label: e.label }))}
            value={editionType}
            onChange={(e) => setEditionType(e.target.value)}
          />
          {editionType === 'numbered' && (
            <>
              <Input
                label="Edition Number"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 1"
                value={editionNumber}
                onChange={(e) => setEditionNumber(e.target.value)}
              />
              <Input
                label="Edition Total"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 10"
                value={editionTotal}
                onChange={(e) => setEditionTotal(e.target.value)}
              />
            </>
          )}
        </div>
      </div>

      {/* ---- Price ---- */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-primary-400">
          Price (per piece)
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Select
            label="Currency"
            options={CURRENCIES.map((c) => ({ value: c.value, label: c.label }))}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
      </div>

      {/* ---- Classification ---- */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-primary-400">
          Classification
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Category"
            options={categoryOptions}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <Select
            label="Motif"
            options={motifOptions}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
          />
          <Select
            label="Series"
            options={seriesOptions}
            value={series}
            onChange={(e) => setSeries(e.target.value)}
          />
          <Select
            label="Color"
            options={colorOptions}
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
      </div>

      {/* ---- Quantity & Notes ---- */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-primary-400">
          Production
        </h3>
        <Input
          label="Quantity *"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          error={errors.quantity}
        />

        <div className="mt-4">
          <Textarea
            label="Notes"
            placeholder="Any notes about this item..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* ---- Reference Photos (edit mode only, multiple) ---- */}
      {item?.id && (
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-primary-400">
            Reference Photos
          </h3>

          {refImageLoading ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Image grid */}
              {refImages.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {refImages.map((img) => (
                    <div key={img.path} className="group relative overflow-hidden rounded-lg border border-primary-100">
                      <img src={img.url} alt="Reference" className="h-32 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRefImageRemove(img.path)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-red-600 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        title="Remove"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload area */}
              <div
                onClick={() => refImageInputRef.current?.click()}
                className={`cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors
                  ${refImageUploading ? 'pointer-events-none opacity-60' : 'border-primary-200 hover:border-primary-300'}
                `}
              >
                {refImageUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <LoadingSpinner />
                    <p className="text-sm text-primary-500">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="h-8 w-8 text-primary-300" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    <p className="text-sm text-primary-500">
                      {refImages.length > 0 ? 'Add more reference photos' : 'Upload reference photos'}
                    </p>
                    <p className="text-xs text-primary-400">JPG, PNG, WebP</p>
                  </div>
                )}
              </div>
            </>
          )}

          <input
            ref={refImageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleRefImageUpload(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-primary-100 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {item ? 'Update Item' : 'Add Item'}
        </Button>
      </div>
    </form>
  );
}
