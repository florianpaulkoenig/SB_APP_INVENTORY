import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { GallerySelect } from '../galleries/GallerySelect';
import { PRODUCTION_STATUSES, CURRENCIES, DOC_PREFIXES } from '../../lib/constants';
import { useDocumentNumber } from '../../hooks/useDocumentNumber';
import { supabase } from '../../lib/supabase';
import type {
  ProductionOrderRow,
  ProductionOrderInsert,
  ProductionOrderUpdate,
  ProductionStatus,
  Currency,
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
  const [galleryId, setGalleryId] = useState<string | null>(productionOrder?.gallery_id ?? null);
  const [contactId, setContactId] = useState<string | null>(productionOrder?.contact_id ?? null);
  const [price, setPrice] = useState(productionOrder?.price != null ? String(productionOrder.price) : '');
  const [currency, setCurrency] = useState<string>(productionOrder?.currency ?? 'EUR');
  const [notes, setNotes] = useState(productionOrder?.notes ?? '');

  // ---- Fetch contacts for dropdown ------------------------------------------
  const [contacts, setContacts] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    async function fetchContacts() {
      const { data } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, company')
        .order('last_name', { ascending: true });

      if (data) {
        setContacts(
          data.map((c) => ({
            id: c.id,
            name: [c.first_name, c.last_name, c.company ? `(${c.company})` : '']
              .filter(Boolean)
              .join(' '),
          })),
        );
      }
    }

    fetchContacts();
  }, []);

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
      gallery_id: galleryId,
      contact_id: contactId,
      currency: currency as Currency,
      notes: notes.trim() || null,
      // Only set price on create; when editing it's auto-calculated from items
      ...(isEdit ? {} : { price: price !== '' ? parseFloat(price) : null }),
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
            maxLength={50}
          />

          <Input
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            placeholder="Production order title"
            maxLength={256}
          />

          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what needs to be produced..."
            maxLength={5000}
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
      {/* Section 3: Client & Gallery                                        */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeader>Client &amp; Gallery</SectionHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GallerySelect value={galleryId} onChange={setGalleryId} label="Gallery / Agent" />

          <Select
            label="Client"
            options={[
              { value: '', label: 'No client' },
              ...contacts.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={contactId ?? ''}
            onChange={(e) => setContactId(e.target.value === '' ? null : e.target.value)}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 4: Price                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeader>Price</SectionHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            readOnly={isEdit}
            disabled={isEdit}
            helperText={isEdit ? 'Auto-calculated from item prices' : undefined}
          />
          <Select
            label="Currency"
            options={CURRENCIES.map((c) => ({ value: c.value, label: `${c.label} (${c.symbol})` }))}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 5: Notes                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeader>Notes</SectionHeader>

        <Textarea
          placeholder="Any additional notes for this production order..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={5000}
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
