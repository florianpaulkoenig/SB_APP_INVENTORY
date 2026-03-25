import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Combobox } from '../ui/Combobox';
import { Textarea } from '../ui/Textarea';
import { GallerySelect } from '../galleries/GallerySelect';
import { DELIVERY_STATUSES } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import type {
  DeliveryRow,
  DeliveryInsert,
  DeliveryUpdate,
  DeliveryStatus,
} from '../../types/database';

// ---------------------------------------------------------------------------
// Inline item type (local state only, no delivery_id yet)
// ---------------------------------------------------------------------------

export interface InlineDeliveryItem {
  _key: string; // local unique key for React
  artwork_id: string;
  quantity: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DeliveryFormProps {
  /** Pass an existing delivery to pre-fill for editing */
  delivery?: DeliveryRow;
  /** Pre-generated delivery number (from the parent page) */
  deliveryNumber?: string;
  onSubmit: (
    data: DeliveryInsert | DeliveryUpdate,
    items?: InlineDeliveryItem[],
  ) => Promise<void>;
  onCancel: () => void;
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
// Artwork option for the Combobox
// ---------------------------------------------------------------------------

interface ArtworkOption {
  id: string;
  title: string;
  reference_code: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeliveryForm({
  delivery,
  deliveryNumber: deliveryNumberProp,
  onSubmit,
  onCancel,
  loading = false,
}: DeliveryFormProps) {
  const isEdit = Boolean(delivery);

  // ---- Artwork options (only in create mode) ------------------------------

  const [artworks, setArtworks] = useState<ArtworkOption[]>([]);

  useEffect(() => {
    if (isEdit) return;

    async function fetchArtworks() {
      const { data } = await supabase
        .from('artworks')
        .select('id, title, reference_code')
        .order('title', { ascending: true });

      setArtworks((data as ArtworkOption[]) ?? []);
    }

    fetchArtworks();
  }, [isEdit]);

  // ---- Form state ---------------------------------------------------------

  const [deliveryNumber, setDeliveryNumber] = useState(delivery?.delivery_number ?? deliveryNumberProp ?? '');
  const [recipientName, setRecipientName] = useState(delivery?.recipient_name ?? '');
  const [recipientAddress, setRecipientAddress] = useState(delivery?.recipient_address ?? '');
  const [galleryId, setGalleryId] = useState<string | null>(delivery?.gallery_id ?? null);
  const [deliveryDate, setDeliveryDate] = useState(
    delivery?.delivery_date ?? new Date().toISOString().split('T')[0],
  );
  const [status, setStatus] = useState<string>(delivery?.status ?? 'draft');
  const [notes, setNotes] = useState(delivery?.notes ?? '');

  // ---- Inline items state (create mode only) ------------------------------

  const [inlineItems, setInlineItems] = useState<InlineDeliveryItem[]>([]);

  function addInlineItem() {
    setInlineItems((prev) => [
      ...prev,
      {
        _key: crypto.randomUUID(),
        artwork_id: '',
        quantity: 1,
        notes: '',
      },
    ]);
  }

  function removeInlineItem(key: string) {
    setInlineItems((prev) => prev.filter((item) => item._key !== key));
  }

  function updateInlineItem(key: string, field: keyof Omit<InlineDeliveryItem, '_key'>, value: string | number) {
    setInlineItems((prev) =>
      prev.map((item) =>
        item._key === key ? { ...item, [field]: value } : item,
      ),
    );
  }

  // ---- Sync delivery number from parent prop --------------------------------

  useEffect(() => {
    if (!isEdit && deliveryNumberProp) {
      setDeliveryNumber(deliveryNumberProp);
    }
  }, [isEdit, deliveryNumberProp]);

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

    await onSubmit(data, isEdit ? undefined : inlineItems);
  }

  // ---- Render -------------------------------------------------------------

  const artworkOptions = [
    { value: '', label: 'Select an artwork...' },
    ...artworks.map((a) => ({
      value: a.id,
      label: `${a.reference_code} -- ${a.title}`,
    })),
  ];

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
      {/* Section 4: Delivery Items (create mode only)                       */}
      {/* ------------------------------------------------------------------ */}
      {!isEdit && (
        <section>
          <SectionHeader>Delivery Items</SectionHeader>

          {inlineItems.length > 0 && (
            <div className="space-y-3 mb-4">
              {inlineItems.map((item, idx) => (
                <div
                  key={item._key}
                  className="rounded-md border border-primary-100 bg-primary-50/50 p-3"
                >
                  <div className="flex items-start gap-2">
                    {/* Main fields */}
                    <div className="flex-1 space-y-3">
                      <Combobox
                        label="Artwork"
                        options={artworkOptions}
                        value={item.artwork_id}
                        onChange={(val) => updateInlineItem(item._key, 'artwork_id', val)}
                        placeholder="Search artworks..."
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Quantity"
                          type="number"
                          min="1"
                          step="1"
                          value={String(item.quantity)}
                          onChange={(e) =>
                            updateInlineItem(
                              item._key,
                              'quantity',
                              Math.max(1, parseInt(e.target.value, 10) || 1),
                            )
                          }
                        />
                        <Input
                          label="Notes"
                          value={item.notes}
                          onChange={(e) =>
                            updateInlineItem(item._key, 'notes', e.target.value)
                          }
                          placeholder="Optional notes"
                          maxLength={500}
                        />
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeInlineItem(item._key)}
                      className="mt-6 rounded p-1 text-primary-400 hover:bg-primary-100 hover:text-red-500 transition-colors"
                      aria-label="Remove item"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addInlineItem}
          >
            <svg
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Add Item
          </Button>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Actions                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-end gap-3 border-t border-primary-100 pt-6">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create Delivery'}
        </Button>
      </div>
    </form>
  );
}
