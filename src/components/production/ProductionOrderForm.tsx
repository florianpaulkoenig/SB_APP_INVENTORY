import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { PRODUCTION_STATUSES, DOC_PREFIXES } from '../../lib/constants';
import { useDocumentNumber } from '../../hooks/useDocumentNumber';
import type {
  ProductionOrderRow,
  ProductionOrderInsert,
  ProductionOrderUpdate,
  ProductionStatus,
} from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProductionOrderFormProps {
  /** Pass an existing production order to pre-fill for editing */
  productionOrder?: ProductionOrderRow;
  onSubmit: (data: ProductionOrderInsert | ProductionOrderUpdate) => Promise<void>;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Section header helper (matches DeliveryForm / InvoiceForm pattern)
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-400 mb-3">
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductionOrderForm({
  productionOrder,
  onSubmit,
  loading = false,
}: ProductionOrderFormProps) {
  const isEdit = Boolean(productionOrder);
  const { generateNumber } = useDocumentNumber();

  // ---- Form state ---------------------------------------------------------

  const [orderNumber, setOrderNumber] = useState(productionOrder?.order_number ?? '');
  const [title, setTitle] = useState(productionOrder?.title ?? '');
  const [description, setDescription] = useState(productionOrder?.description ?? '');
  const [status, setStatus] = useState<string>(productionOrder?.status ?? 'draft');
  const [orderedDate, setOrderedDate] = useState(
    productionOrder?.ordered_date ?? new Date().toISOString().split('T')[0],
  );
  const [deadline, setDeadline] = useState(productionOrder?.deadline ?? '');
  const [notes, setNotes] = useState(productionOrder?.notes ?? '');

  // ---- Auto-generate order number for new orders --------------------------

  useEffect(() => {
    if (isEdit) return;

    async function generate() {
      const num = await generateNumber(DOC_PREFIXES.production);
      if (num) setOrderNumber(num);
    }

    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // ---- Validation ---------------------------------------------------------

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!orderNumber.trim()) {
      next.orderNumber = 'Order number is required';
    }

    if (!title.trim()) {
      next.title = 'Title is required';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ---- Submit -------------------------------------------------------------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data: ProductionOrderInsert | ProductionOrderUpdate = {
      order_number: orderNumber.trim(),
      title: title.trim(),
      description: description.trim() || null,
      status: status as ProductionStatus,
      ordered_date: orderedDate || null,
      deadline: deadline || null,
      notes: notes.trim() || null,
    };

    await onSubmit(data);
  }

  // ---- Render -------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Order Details                                           */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeader>Order Details</SectionHeader>

        <div className="space-y-4">
          <Input
            label="Order Number *"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            error={errors.orderNumber}
            readOnly={!isEdit && !!orderNumber}
            disabled={!isEdit && !!orderNumber}
            helperText={isEdit ? undefined : 'Auto-generated'}
          />

          <Input
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            placeholder="Production order title"
          />

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what needs to be produced..."
          />

          <Select
            label="Status"
            options={PRODUCTION_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Dates                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeader>Dates</SectionHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Ordered Date"
            type="date"
            value={orderedDate}
            onChange={(e) => setOrderedDate(e.target.value)}
          />

          <Input
            label="Deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Notes                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeader>Notes</SectionHeader>

        <Textarea
          placeholder="Any additional notes for this production order..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Actions                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-end gap-3 border-t border-primary-100 pt-6">
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create Production Order'}
        </Button>
      </div>
    </form>
  );
}
