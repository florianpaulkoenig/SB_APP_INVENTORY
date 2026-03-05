import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { generateArtworkRefCode } from '../../lib/utils';
import { useDocumentNumber } from '../../hooks/useDocumentNumber';
import { supabase } from '../../lib/supabase';
import {
  ARTWORK_CATEGORIES,
  CURRENCIES,
  DOC_PREFIXES,
} from '../../lib/constants';
import type {
  ProductionOrderItemRow,
  ArtworkStatus,
  ArtworkCategory,
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
  onConverted,
}: ConvertToArtworkDialogProps) {
  const { generateNumber } = useDocumentNumber();

  // ---- Form state (pre-filled from production item) -----------------------

  const [inventoryNumber, setInventoryNumber] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [title, setTitle] = useState(item.description);
  const [medium, setMedium] = useState(item.medium ?? '');
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
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<string>('available');

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ---- Auto-generate inventory number & reference code --------------------

  useEffect(() => {
    if (!isOpen) return;

    // Reset form when dialog opens with new item
    setTitle(item.description);
    setMedium(item.medium ?? '');
    setHeight(item.height != null ? String(item.height) : '');
    setWidth(item.width != null ? String(item.width) : '');
    setDepth(item.depth != null ? String(item.depth) : '');
    setDimensionUnit(item.dimension_unit ?? 'cm');
    setYear(String(new Date().getFullYear()));
    setPrice('');
    setCurrency('EUR');
    setCategory('');
    setStatus('available');
    setErrors({});

    // Generate codes
    setReferenceCode(generateArtworkRefCode());

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

      const parsedHeight = height ? parseFloat(height) : null;
      const parsedWidth = width ? parseFloat(width) : null;
      const parsedDepth = depth ? parseFloat(depth) : null;
      const parsedYear = year ? parseInt(year, 10) : null;
      const parsedPrice = price ? parseFloat(price) : null;

      // 1. Create the artwork
      const { data: artwork, error: artworkError } = await supabase
        .from('artworks')
        .insert({
          user_id: session.user.id,
          inventory_number: inventoryNumber.trim(),
          reference_code: referenceCode.trim(),
          title: title.trim(),
          medium: medium.trim() || null,
          height: parsedHeight,
          width: parsedWidth,
          depth: parsedDepth,
          dimension_unit: dimensionUnit as DimensionUnit,
          year: parsedYear,
          price: parsedPrice,
          currency: currency as Currency,
          category: (category || null) as ArtworkCategory | null,
          status: status as ArtworkStatus,
        })
        .select('id')
        .single();

      if (artworkError) throw artworkError;

      // 2. Link the artwork_id back to the production order item
      const { error: linkError } = await supabase
        .from('production_order_items')
        .update({ artwork_id: artwork.id })
        .eq('id', item.id);

      if (linkError) throw linkError;

      onConverted(artwork.id);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create artwork';
      setErrors({ submit: message });
    } finally {
      setLoading(false);
    }
  }

  // ---- Render -------------------------------------------------------------

  const categoryOptions = [
    { value: '', label: 'Select category...' },
    ...ARTWORK_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convert to Artwork" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* Title & Medium */}
        <Input
          label="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          placeholder="Artwork title"
        />

        <Input
          label="Medium"
          value={medium}
          onChange={(e) => setMedium(e.target.value)}
          placeholder="e.g. Glass, acrylic"
        />

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Input
            label="Height"
            type="number"
            min="0"
            step="0.1"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
          <Input
            label="Width"
            type="number"
            min="0"
            step="0.1"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          />
          <Input
            label="Depth"
            type="number"
            min="0"
            step="0.1"
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
          />
          <Select
            label="Unit"
            options={[
              { value: 'cm', label: 'cm' },
              { value: 'inches', label: 'inches' },
            ]}
            value={dimensionUnit}
            onChange={(e) => setDimensionUnit(e.target.value)}
          />
        </div>

        {/* Year, Price, Currency */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Year"
            type="number"
            min="1900"
            max="2100"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
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

        {/* Category & Status */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            options={categoryOptions}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <Select
            label="Status"
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
