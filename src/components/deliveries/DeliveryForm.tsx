import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { GallerySelect } from '../galleries/GallerySelect';
import { DELIVERY_STATUSES, DOC_PREFIXES } from '../../lib/constants';
import { useDocumentNumber } from '../../hooks/useDocumentNumber';
import type {
  DeliveryRow,
  DeliveryInsert,
  DeliveryUpdate,
  DeliveryStatus,
} from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DeliveryFormProps {
  /** Pass an existing delivery to pre-fill for editing */
  delivery?: DeliveryRow;
  onSubmit: (data: DeliveryInsert | DeliveryUpdate) => Promise<void>;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Section header helper (matches InvoiceForm / ArtworkForm pattern)
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

export function DeliveryForm({
  delivery,
  onSubmit,
  loading = false,
}: DeliveryFormProps) {
  const isEdit = Boolean(delivery);
  const { generateNumber } = useDocumentNumber();

  // ---- Form state ---------------------------------------------------------

  const [deliveryNumber, setDeliveryNumber] = useState(delivery?.delivery_number ?? '');
  const [recipientName, setRecipientName] = useState(delivery?.recipient_name ?? '');
  const [recipientAddress, setRecipientAddress] = useState(delivery?.recipient_address ?? '');
  const [galleryId, setGalleryId] = useState<string | null>(delivery?.gallery_id ?? null);
  const [deliveryDate, setDeliveryDate] = useState(
    delivery?.delivery_date ?? new Date().toISOString().split('T')[0],
  );
  const [status, setStatus] = useState<string>(delivery?.status ?? 'draft');
  const [notes, setNotes] = useState(delivery?.notes ?? '');

  // ---- Auto-generate delivery number for new deliveries -------------------

  useEffect(() => {
    if (isEdit) return;

    async function generate() {
      const num = await generateNumber(DOC_PREFIXES.delivery);
      if (num) setDeliveryNumber(num);
    }

    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // ---- Validation ---------------------------------------------------------

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!deliveryNumber.trim()) {
      next.deliveryNumber = 'Delivery number is required';
    }

    if (!recipientName.trim()) {
      next.recipientName = 'Recipient name is required';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ---- Submit -------------------------------------------------------------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data: DeliveryInsert | DeliveryUpdate = {
      delivery_number: deliveryNumber.trim(),
      recipient_name: recipientName.trim(),
      recipient_address: recipientAddress.trim() || null,
      gallery_id: galleryId,
      delivery_date: deliveryDate || null,
      status: status as DeliveryStatus,
      notes: notes.trim() || null,
    };

    await onSubmit(data);
  }

  // ---- Render -------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Delivery Details                                        */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeader>Delivery Details</SectionHeader>

        <div className="space-y-4">
          <Input
            label="Delivery Number *"
            value={deliveryNumber}
            onChange={(e) => setDeliveryNumber(e.target.value)}
            error={errors.deliveryNumber}
            readOnly={!isEdit && !!deliveryNumber}
            disabled={!isEdit && !!deliveryNumber}
            helperText={isEdit ? undefined : 'Auto-generated'}
            maxLength={50}
          />

          <Select
            label="Status"
            options={DELIVERY_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />

          <Input
            label="Delivery Date"
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Recipient & Gallery                                     */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeader>Recipient &amp; Gallery</SectionHeader>

        <div className="space-y-4">
          <Input
            label="Recipient Name *"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            error={errors.recipientName}
            placeholder="Name of the recipient"
            maxLength={256}
          />

          <Textarea
            label="Recipient Address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            placeholder="Street, city, country..."
            maxLength={1000}
          />

          <GallerySelect value={galleryId} onChange={setGalleryId} />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Notes                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeader>Notes</SectionHeader>

        <Textarea
          placeholder="Any additional notes for this delivery..."
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
          {isEdit ? 'Save Changes' : 'Create Delivery'}
        </Button>
      </div>
    </form>
  );
}
