import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { formatCurrency } from '../../lib/utils';
import type { InvoiceItemRow, InvoiceItemInsert } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InvoiceItemFormProps {
  /** Pass an existing item to pre-fill for editing */
  item?: InvoiceItemRow;
  /** Available artworks to select from */
  artworks: Array<{
    id: string;
    title: string;
    reference_code: string;
    price: number | null;
    currency: string;
  }>;
  onSubmit: (data: InvoiceItemInsert) => Promise<void>;
  onCancel: () => void;
  invoiceId: string;
  loading?: boolean;
  /** Currency code for display (defaults to 'CHF') */
  currency?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoiceItemForm({
  item,
  artworks,
  onSubmit,
  onCancel,
  invoiceId,
  loading = false,
  currency = 'CHF',
}: InvoiceItemFormProps) {
  // ---- Form state ---------------------------------------------------------

  const [artworkId, setArtworkId] = useState(item?.artwork_id ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [quantity, setQuantity] = useState(
    item?.quantity != null ? String(item.quantity) : '1',
  );
  const [unitPrice, setUnitPrice] = useState(
    item?.unit_price != null ? String(item.unit_price) : '',
  );

  // ---- Derived state ------------------------------------------------------

  const parsedQuantity = parseFloat(quantity) || 0;
  const parsedUnitPrice = parseFloat(unitPrice) || 0;
  const lineTotal = parsedQuantity * parsedUnitPrice;

  // ---- Artwork selection auto-fill ----------------------------------------

  function handleArtworkChange(selectedId: string) {
    setArtworkId(selectedId);

    if (!selectedId) return;

    const artwork = artworks.find((a) => a.id === selectedId);
    if (artwork) {
      setDescription(artwork.title);
      if (artwork.price != null) {
        setUnitPrice(String(artwork.price));
      }
    }
  }

  // ---- Validation ---------------------------------------------------------

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!description.trim()) {
      next.description = 'Description is required';
    }

    if (!unitPrice || parsedUnitPrice < 0) {
      next.unitPrice = 'Unit price is required and must be non-negative';
    }

    if (!quantity || parsedQuantity < 1) {
      next.quantity = 'Quantity must be at least 1';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ---- Submit -------------------------------------------------------------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data: InvoiceItemInsert = {
      invoice_id: invoiceId,
      artwork_id: artworkId || null,
      description: description.trim(),
      quantity: parsedQuantity,
      unit_price: parsedUnitPrice,
      total: lineTotal,
    };

    await onSubmit(data);
  }

  // ---- Render -------------------------------------------------------------

  const artworkOptions = [
    { value: '', label: 'No artwork (manual entry)' },
    ...artworks.map((a) => ({
      value: a.id,
      label: `${a.reference_code} -- ${a.title}`,
    })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Artwork"
        options={artworkOptions}
        value={artworkId}
        onChange={(e) => handleArtworkChange(e.target.value)}
      />

      <Input
        label="Description *"
        placeholder="e.g. Untitled Portrait No. 7"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
        maxLength={500}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Quantity *"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          error={errors.quantity}
        />
        <Input
          label="Unit Price *"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          error={errors.unitPrice}
        />
      </div>

      {/* Calculated total (read-only) */}
      <div>
        <p className="mb-1 text-sm font-medium text-primary-700">Line Total</p>
        <p className="text-lg font-semibold text-accent">
          {formatCurrency(lineTotal, currency)}
        </p>
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
