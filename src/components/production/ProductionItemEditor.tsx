import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import {
  DIMENSION_UNITS,
  EDITION_TYPES,
  ARTWORK_CATEGORIES,
  ARTWORK_MOTIFS,
  ARTWORK_SERIES,
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

  // Quantity & notes
  const [quantity, setQuantity] = useState(
    item?.quantity != null ? String(item.quantity) : '1',
  );
  const [notes, setNotes] = useState(item?.notes ?? '');

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
      width: parseNum(width),
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
