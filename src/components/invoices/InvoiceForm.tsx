import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Combobox } from '../ui/Combobox';
import { Textarea } from '../ui/Textarea';
import { GallerySelect } from '../galleries/GallerySelect';
import { INVOICE_STATUSES, CURRENCIES } from '../../lib/constants';
import { formatCurrency } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import type {
  InvoiceRow,
  InvoiceInsert,
  InvoiceUpdate,
  InvoiceStatus,
  Currency,
} from '../../types/database';

// ---------------------------------------------------------------------------
// Inline item type (local state only, no invoice_id yet)
// ---------------------------------------------------------------------------

export interface InlineInvoiceItem {
  _key: string; // local unique key for React
  artwork_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InvoiceFormProps {
  /** Pass an existing invoice to pre-fill for editing */
  invoice?: InvoiceRow;
  /** Pre-generated invoice number (from the parent page) */
  invoiceNumber?: string;
  onSubmit: (
    data: InvoiceInsert | InvoiceUpdate,
    items?: InlineInvoiceItem[],
  ) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// ---------------------------------------------------------------------------
// Section header helper (matches ArtworkForm pattern)
// ---------------------------------------------------------------------------

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wider text-primary-400 mb-3">
      {children}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// Lightweight contact record for the dropdown
// ---------------------------------------------------------------------------

interface ContactOption {
  id: string;
  first_name: string;
  last_name: string;
}

// ---------------------------------------------------------------------------
// Artwork option for the Combobox
// ---------------------------------------------------------------------------

interface ArtworkOption {
  id: string;
  title: string;
  reference_code: string;
  price: number | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoiceForm({
  invoice,
  invoiceNumber: invoiceNumberProp,
  onSubmit,
  onCancel,
  loading = false,
}: InvoiceFormProps) {
  const isEdit = Boolean(invoice);

  // ---- Contact options ----------------------------------------------------

  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);

  useEffect(() => {
    async function fetchContacts() {
      setContactsLoading(true);
      const { data } = await supabase
        .from('contacts')
        .select('id, first_name, last_name')
        .order('last_name', { ascending: true });

      setContacts((data as ContactOption[]) ?? []);
      setContactsLoading(false);
    }

    fetchContacts();
  }, []);

  // ---- Artwork options (only in create mode) ------------------------------

  const [artworks, setArtworks] = useState<ArtworkOption[]>([]);

  useEffect(() => {
    if (isEdit) return;

    async function fetchArtworks() {
      const { data } = await supabase
        .from('artworks')
        .select('id, title, reference_code, price')
        .order('title', { ascending: true });

      setArtworks((data as ArtworkOption[]) ?? []);
    }

    fetchArtworks();
  }, [isEdit]);

  // ---- Form state ---------------------------------------------------------

  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoice_number ?? invoiceNumberProp ?? '');
  const [contactId, setContactId] = useState(invoice?.contact_id ?? '');
  const [galleryId, setGalleryId] = useState<string | null>(invoice?.gallery_id ?? null);
  const [status, setStatus] = useState<string>(invoice?.status ?? 'draft');
  const [issueDate, setIssueDate] = useState(
    invoice?.issue_date ?? new Date().toISOString().split('T')[0],
  );
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? '');
  const [currency, setCurrency] = useState<string>(invoice?.currency ?? 'EUR');
  const [notes, setNotes] = useState(invoice?.notes ?? '');

  // ---- Inline items state (create mode only) ------------------------------

  const [inlineItems, setInlineItems] = useState<InlineInvoiceItem[]>([]);

  function addInlineItem() {
    setInlineItems((prev) => [
      ...prev,
      {
        _key: crypto.randomUUID(),
        artwork_id: null,
        description: '',
        quantity: 1,
        unit_price: 0,
      },
    ]);
  }

  function removeInlineItem(key: string) {
    setInlineItems((prev) => prev.filter((item) => item._key !== key));
  }

  function updateInlineItem(key: string, field: keyof Omit<InlineInvoiceItem, '_key'>, value: string | number | null) {
    setInlineItems((prev) =>
      prev.map((item) =>
        item._key === key ? { ...item, [field]: value } : item,
      ),
    );
  }

  function handleArtworkSelect(key: string, artworkId: string) {
    const artwork = artworks.find((a) => a.id === artworkId);
    setInlineItems((prev) =>
      prev.map((item) => {
        if (item._key !== key) return item;
        return {
          ...item,
          artwork_id: artworkId || null,
          description: artwork ? artwork.title : item.description,
          unit_price: artwork?.price != null ? artwork.price : item.unit_price,
        };
      }),
    );
  }

  const runningTotal = inlineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );

  // ---- Sync invoice number from parent prop --------------------------------

  useEffect(() => {
    if (!isEdit && invoiceNumberProp) {
      setInvoiceNumber(invoiceNumberProp);
    }
  }, [isEdit, invoiceNumberProp]);

  // ---- Validation ---------------------------------------------------------

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (!invoiceNumber.trim()) {
      next.invoiceNumber = 'Invoice number is required';
    }

    if (!issueDate) {
      next.issueDate = 'Issue date is required';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ---- Submit -------------------------------------------------------------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const data: InvoiceInsert | InvoiceUpdate = {
      invoice_number: invoiceNumber.trim(),
      contact_id: contactId || null,
      gallery_id: galleryId,
      status: status as InvoiceStatus,
      issue_date: issueDate,
      due_date: dueDate || null,
      currency: currency as Currency,
      notes: notes.trim() || null,
    };

    await onSubmit(data, isEdit ? undefined : inlineItems);
  }

  // ---- Render -------------------------------------------------------------

  const contactOptions = [
    { value: '', label: 'No contact' },
    ...contacts.map((c) => ({
      value: c.id,
      label: `${c.first_name} ${c.last_name}`,
    })),
  ];

  const artworkOptions = [
    { value: '', label: 'No artwork (manual entry)' },
    ...artworks.map((a) => ({
      value: a.id,
      label: `${a.reference_code} -- ${a.title}`,
    })),
  ];

  const currencySymbol = CURRENCIES.find((c) => c.value === currency)?.symbol ?? currency;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Invoice Details                                         */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeader>Invoice Details</SectionHeader>

        <div className="space-y-4">
          <Input
            label="Invoice Number *"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            error={errors.invoiceNumber}
            readOnly={!isEdit && !!invoiceNumber}
            disabled={!isEdit && !!invoiceNumber}
            helperText={isEdit ? undefined : 'Auto-generated'}
            maxLength={50}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Status"
              options={INVOICE_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            />
            <Select
              label="Currency"
              options={CURRENCIES.map((c) => ({
                value: c.value,
                label: `${c.label} (${c.symbol})`,
              }))}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Issue Date *"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              error={errors.issueDate}
            />
            <Input
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Contact & Gallery                                       */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <SectionHeader>Contact &amp; Gallery</SectionHeader>

        <div className="space-y-4">
          <Combobox
            label="Contact"
            options={contactOptions}
            value={contactId}
            onChange={setContactId}
            placeholder="Search contacts..."
            disabled={contactsLoading}
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
          placeholder="Any additional notes for this invoice..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={5000}
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 4: Invoice Items (create mode only)                        */}
      {/* ------------------------------------------------------------------ */}
      {!isEdit && (
        <section>
          <SectionHeader>Invoice Items</SectionHeader>

          {inlineItems.length > 0 && (
            <div className="space-y-3 mb-4">
              {inlineItems.map((item) => {
                const lineTotal = item.quantity * item.unit_price;
                return (
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
                          value={item.artwork_id ?? ''}
                          onChange={(val) => handleArtworkSelect(item._key, val)}
                          placeholder="Search artworks..."
                        />

                        <Input
                          label="Description"
                          value={item.description}
                          onChange={(e) =>
                            updateInlineItem(item._key, 'description', e.target.value)
                          }
                          placeholder="Item description"
                          maxLength={500}
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
                            label={`Unit Price (${currencySymbol})`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={String(item.unit_price)}
                            onChange={(e) =>
                              updateInlineItem(
                                item._key,
                                'unit_price',
                                Math.max(0, parseFloat(e.target.value) || 0),
                              )
                            }
                          />
                        </div>

                        <p className="text-xs text-primary-500">
                          Line total:{' '}
                          <span className="font-medium text-primary-700">
                            {formatCurrency(lineTotal, currency)}
                          </span>
                        </p>
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
                );
              })}

              {/* Running total */}
              <div className="flex items-center justify-end gap-2 border-t border-primary-100 pt-3">
                <span className="text-sm font-medium text-primary-600">Total:</span>
                <span className="text-base font-semibold text-accent">
                  {formatCurrency(runningTotal, currency)}
                </span>
              </div>
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
          {isEdit ? 'Save Changes' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}
