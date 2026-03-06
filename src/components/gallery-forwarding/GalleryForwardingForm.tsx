import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { GallerySelect } from '../galleries/GallerySelect';
import { FORWARDING_STATUSES, CURRENCIES, DOC_PREFIXES } from '../../lib/constants';
import { useDocumentNumber } from '../../hooks/useDocumentNumber';
import { supabase } from '../../lib/supabase';
import type {
  GalleryForwardingOrderRow,
  GalleryForwardingOrderInsert,
  GalleryForwardingOrderUpdate,
  ForwardingStatus,
  Currency,
} from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GalleryForwardingFormProps {
  forwarding?: GalleryForwardingOrderRow;
  initialData?: GalleryForwardingOrderRow;
  onSubmit: (data: GalleryForwardingOrderInsert | GalleryForwardingOrderUpdate) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Section header
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

export function GalleryForwardingForm({
  forwarding: forwardingProp,
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}: GalleryForwardingFormProps) {
  const forwarding = forwardingProp ?? initialData;
  const isEdit = Boolean(forwarding);
  const { generateNumber } = useDocumentNumber();

  // ---- Form state -----------------------------------------------------------

  const [forwardingNumber, setForwardingNumber] = useState(forwarding?.forwarding_number ?? '');
  const [title, setTitle] = useState(forwarding?.title ?? '');
  const [description, setDescription] = useState(forwarding?.description ?? '');
  const [status, setStatus] = useState<string>(forwarding?.status ?? 'draft');
  const [fromGalleryId, setFromGalleryId] = useState<string | null>(forwarding?.from_gallery_id ?? null);
  const [toGalleryId, setToGalleryId] = useState<string | null>(forwarding?.to_gallery_id ?? null);
  const [contactId, setContactId] = useState<string | null>(forwarding?.contact_id ?? null);
  const [shippingDate, setShippingDate] = useState(forwarding?.shipping_date ?? '');
  const [estimatedArrival, setEstimatedArrival] = useState(forwarding?.estimated_arrival ?? '');
  const [trackingNumber, setTrackingNumber] = useState(forwarding?.tracking_number ?? '');
  const [shippingMethod, setShippingMethod] = useState(forwarding?.shipping_method ?? '');
  const [insuranceValue, setInsuranceValue] = useState(
    forwarding?.insurance_value != null ? String(forwarding.insurance_value) : '',
  );
  const [currency, setCurrency] = useState(forwarding?.currency ?? 'EUR');
  const [notes, setNotes] = useState(forwarding?.notes ?? '');

  // ---- Contacts dropdown ----------------------------------------------------

  const [contacts, setContacts] = useState<Array<{ id: string; label: string }>>([]);

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
            label: [c.first_name, c.last_name, c.company ? `(${c.company})` : '']
              .filter(Boolean)
              .join(' '),
          })),
        );
      }
    }

    fetchContacts();
  }, []);

  // ---- Auto-generate number -------------------------------------------------

  useEffect(() => {
    if (isEdit) return;

    async function generate() {
      const num = await generateNumber(DOC_PREFIXES.forwarding);
      if (num) setForwardingNumber(num);
    }

    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  // ---- Validation -----------------------------------------------------------

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!forwardingNumber.trim()) {
      next.forwardingNumber = 'Forwarding number is required';
    }
    if (!title.trim()) {
      next.title = 'Title is required';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ---- Submit ---------------------------------------------------------------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const parseNum = (v: string) => (v ? parseFloat(v) : null);

    const data: GalleryForwardingOrderInsert | GalleryForwardingOrderUpdate = {
      forwarding_number: forwardingNumber.trim(),
      title: title.trim(),
      description: description.trim() || null,
      status: status as ForwardingStatus,
      from_gallery_id: fromGalleryId,
      to_gallery_id: toGalleryId,
      contact_id: contactId,
      shipping_date: shippingDate || null,
      estimated_arrival: estimatedArrival || null,
      tracking_number: trackingNumber.trim() || null,
      shipping_method: shippingMethod.trim() || null,
      insurance_value: parseNum(insuranceValue),
      currency: (currency || 'EUR') as Currency,
      notes: notes.trim() || null,
    };

    await onSubmit(data);
  }

  // ---- Contact options for select -------------------------------------------

  const contactOptions = [
    { value: '', label: 'Select contact...' },
    ...contacts.map((c) => ({ value: c.id, label: c.label })),
  ];

  // ---- Render ---------------------------------------------------------------

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Order Details */}
      <section>
        <SectionHeader>Order Details</SectionHeader>
        <div className="space-y-4">
          <Input
            label="Forwarding Number *"
            value={forwardingNumber}
            onChange={(e) => setForwardingNumber(e.target.value)}
            error={errors.forwardingNumber}
            readOnly={!isEdit && !!forwardingNumber}
            disabled={!isEdit && !!forwardingNumber}
            helperText={isEdit ? undefined : 'Auto-generated'}
          />

          <Input
            label="Title *"
            placeholder="e.g. Transfer to Gallery XY"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
          />

          <Textarea
            label="Description"
            placeholder="Describe the forwarding purpose..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Select
            label="Status"
            options={FORWARDING_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>
      </section>

      {/* Galleries */}
      <section>
        <SectionHeader>From / To</SectionHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GallerySelect
            label="From Gallery"
            value={fromGalleryId}
            onChange={setFromGalleryId}
          />
          <GallerySelect
            label="To Gallery"
            value={toGalleryId}
            onChange={setToGalleryId}
          />
        </div>

        <div className="mt-4">
          <Select
            label="Contact"
            options={contactOptions}
            value={contactId ?? ''}
            onChange={(e) => setContactId(e.target.value || null)}
          />
        </div>
      </section>

      {/* Dates */}
      <section>
        <SectionHeader>Dates</SectionHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Shipping Date"
            type="date"
            value={shippingDate}
            onChange={(e) => setShippingDate(e.target.value)}
          />
          <Input
            label="Estimated Arrival"
            type="date"
            value={estimatedArrival}
            onChange={(e) => setEstimatedArrival(e.target.value)}
          />
        </div>
      </section>

      {/* Shipping */}
      <section>
        <SectionHeader>Shipping</SectionHeader>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Tracking Number"
            placeholder="e.g. DHL 1234567890"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />
          <Input
            label="Shipping Method"
            placeholder="e.g. DHL Express, Art Transport"
            value={shippingMethod}
            onChange={(e) => setShippingMethod(e.target.value)}
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Insurance Value"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={insuranceValue}
            onChange={(e) => setInsuranceValue(e.target.value)}
          />
          <Select
            label="Currency"
            options={CURRENCIES.map((c) => ({ value: c.value, label: c.label }))}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
      </section>

      {/* Notes */}
      <section>
        <SectionHeader>Notes</SectionHeader>
        <Textarea
          placeholder="Any additional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-primary-100 pt-6">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create Forwarding Order'}
        </Button>
      </div>
    </form>
  );
}
