import { useState, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { DIMENSION_UNITS } from '../../lib/constants';
import type {
  ProductionOrderItemRow,
  ProductionOrderItemInsert,
  DimensionUnit,
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
  const [quantity, setQuantity] = useState(
    item?.quantity != null ? String(item.quantity) : '1',
  );
  const [notes, setNotes] = useState(item?.notes ?? '');

  // ---- Validation ---------------------------------------------------------

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!description.trim()) {
      next.description = 'Description is required';
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

    const parsedHeight = height ? parseFloat(height) : null;
    const parsedWidth = width ? parseFloat(width) : null;
    const parsedDepth = depth ? parseFloat(depth) : null;
    const parsedQuantity = parseInt(quantity, 10) || 1;

    const data: ProductionOrderItemInsert = {
      production_order_id: productionOrderId,
      description: description.trim(),
      medium: medium.trim() || null,
      height: parsedHeight,
      width: parsedWidth,
      depth: parsedDepth,
      dimension_unit: dimensionUnit as DimensionUnit,
      quantity: parsedQuantity,
      notes: notes.trim() || null,
    };

    await onSubmit(data);
  }

  // ---- Render -------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Description *"
        placeholder="e.g. Portrait on glass, 120x80cm"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.description}
      />

      <Input
        label="Medium"
        placeholder="e.g. Glass, acrylic, wood"
        value={medium}
        onChange={(e) => setMedium(e.target.value)}
      />

      {/* Dimensions row */}
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

      <Input
        label="Quantity *"
        type="number"
        min="1"
        step="1"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        error={errors.quantity}
      />

      <Textarea
        label="Notes"
        placeholder="Any notes about this item..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

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
