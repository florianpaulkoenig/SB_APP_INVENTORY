import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { DOC_PREFIXES } from '../../lib/constants';
import { useDocumentNumber } from '../../hooks/useDocumentNumber';
import { supabase } from '../../lib/supabase';
import type {
  PackingListRow,
  PackingListInsert,
  PackingListUpdate,
} from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PackingListFormProps {
  /** Pass an existing packing list to pre-fill for editing */
  packingList?: PackingListRow;
  onSubmit: (data: PackingListInsert | PackingListUpdate) => Promise<void>;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Section header helper (matches other form patterns)
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-400 mb-3">
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Lightweight delivery record for the dropdown
// ---------------------------------------------------------------------------

interface DeliveryOption {
  id: string;
  delivery_number: string;
  recipient_name: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PackingListForm({
  packingList,
  onSubmit,
  loading = false,
}: PackingListFormProps) {
  const isEdit = Boolean(packingList);
  const { generateNumber } = useDocumentNumber();

  // ---- Delivery options ---------------------------------------------------

  const [deliveries, setDeliveries] = useState<DeliveryOption[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(true);

  useEffect(() => {
    async function fetchDeliveries() {
      setDeliveriesLoading(true);
      const { data } = await supabase
        .from('deliveries')
        .select('id, delivery_number, recipient_name')
        .order('delivery_number', { ascending: false });

      setDeliveries((data as DeliveryOption[]) ?? []);
      setDeliveriesLoading(false);
    }

    fetchDeliveries();
  }, []);

  // ---- Form state ---------------------------------------------------------

  const [packingNumber, setPackingNumber] = useState(packingList?.packing_number ?? '');
  const [recipientName, setRecipientName] = useState(packingList?.recipient_name ?? '');
  const [deliveryId, setDeliveryId] = useState<string>(packingList?.delivery_id ?? '');
  const [packingDate, setPackingDate] = useState(
    packingList?.packing_date ?? new Date().toISOString().split('T')[0],
  );
  const [notes, setNotes] = useState(packingList?.notes ?? '');

  // ---- Auto-generate packing number for new packing lists -----------------

  useEffect(() => {
    if (isEdit) return;

    async function generate() {
      const num = await generateNumber(DOC_PREFIXES.packing);
      if (num) setPackingNumber(num);
    }

    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // ---- Validation ---------------------------------------------------------

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!packingNumber.trim()) {
      next.packingNumber = 'Packing number is required';
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

    const data: PackingListInsert | PackingListUpdate = {
      packing_number: packingNumber.trim(),
      recipient_name: recipientName.trim(),
      delivery_id: deliveryId || null,
      packing_date: packingDate || null,
      notes: notes.trim() || null,
    };

    await onSubmit(data);
  }

  // ---- Render -------------------------------------------------------------

  const deliveryOptions = [
    { value: '', label: 'No linked delivery' },
    ...deliveries.map((d) => ({
      value: d.id,
      label: `${d.delivery_number} -- ${d.recipient_name}`,
    })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Packing List Details                                    */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeader>Packing List Details</SectionHeader>

        <div className="space-y-4">
          <Input
            label="Packing Number *"
            value={packingNumber}
            onChange={(e) => setPackingNumber(e.target.value)}
            error={errors.packingNumber}
            readOnly={!isEdit && !!packingNumber}
            disabled={!isEdit && !!packingNumber}
            helperText={isEdit ? undefined : 'Auto-generated'}
          />

          <Input
            label="Packing Date"
            type="date"
            value={packingDate}
            onChange={(e) => setPackingDate(e.target.value)}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Recipient & Delivery                                    */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeader>Recipient &amp; Delivery</SectionHeader>

        <div className="space-y-4">
          <Input
            label="Recipient Name *"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            error={errors.recipientName}
            placeholder="Name of the recipient"
          />

          <Select
            label="Linked Delivery"
            options={deliveryOptions}
            value={deliveryId}
            onChange={(e) => setDeliveryId(e.target.value)}
            disabled={deliveriesLoading}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Notes                                                   */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeader>Notes</SectionHeader>

        <Textarea
          placeholder="Any additional notes for this packing list..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Actions                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-end gap-3 border-t border-primary-100 pt-6">
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create Packing List'}
        </Button>
      </div>
    </form>
  );
}
