import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { GallerySelect } from '../galleries/GallerySelect';
import { INVOICE_STATUSES, CURRENCIES, DOC_PREFIXES } from '../../lib/constants';
import { useDocumentNumber } from '../../hooks/useDocumentNumber';
import { supabase } from '../../lib/supabase';
import type {
  InvoiceRow,
  InvoiceInsert,
  InvoiceUpdate,
  InvoiceStatus,
  Currency,
} from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InvoiceFormProps {
  /** Pass an existing invoice to pre-fill for editing */
  invoice?: InvoiceRow;
  onSubmit: (data: InvoiceInsert | InvoiceUpdate) => Promise<void>;
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
// Component
// ---------------------------------------------------------------------------

export function InvoiceForm({
  invoice,
  onSubmit,
  loading = false,
}: InvoiceFormProps) {
  const isEdit = Boolean(invoice);
  const { generateNumber } = useDocumentNumber();

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

  // ---- Form state ---------------------------------------------------------

  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoice_number ?? '');
  const [contactId, setContactId] = useState(invoice?.contact_id ?? '');
  const [galleryId, setGalleryId] = useState<string | null>(invoice?.gallery_id ?? null);
  const [status, setStatus] = useState<string>(invoice?.status ?? 'draft');
  const [issueDate, setIssueDate] = useState(
    invoice?.issue_date ?? new Date().toISOString().split('T')[0],
  );
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? '');
  const [currency, setCurrency] = useState<string>(invoice?.currency ?? 'EUR');
  const [notes, setNotes] = useState(invoice?.notes ?? '');

  // ---- Auto-generate invoice number for new invoices ----------------------

  useEffect(() => {
    if (isEdit) return;

    async function generate() {
      const num = await generateNumber(DOC_PREFIXES.invoice);
      if (num) setInvoiceNumber(num);
    }

    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

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

    await onSubmit(data);
  }

  // ---- Render -------------------------------------------------------------

  const contactOptions = [
    { value: '', label: 'No contact' },
    ...contacts.map((c) => ({
      value: c.id,
      label: `${c.first_name} ${c.last_name}`,
    })),
  ];

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
          <Select
            label="Contact"
            options={contactOptions}
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
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
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Actions                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-end gap-3 border-t border-primary-100 pt-6">
        <Button type="submit" loading={loading}>
          {isEdit ? 'Save Changes' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}
