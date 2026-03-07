import { useState } from 'react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { formatCurrency, formatDate } from '../../lib/utils';
import type { InvoiceRow, InvoiceItemRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InvoiceDetailProps {
  invoice: InvoiceRow;
  contactName?: string | null;
  galleryName?: string | null;
  items: InvoiceItemRow[];
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onAddItem: () => void;
}

// ---------------------------------------------------------------------------
// Helper: info row (same pattern as ArtworkDetail)
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-primary-800">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoiceDetail({
  invoice,
  contactName,
  galleryName,
  items,
  onEdit,
  onDelete,
  onAddItem,
}: InvoiceDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compute invoice total from items
  const invoiceTotal = items.reduce((sum, item) => sum + item.total, 0);

  async function handleDelete() {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  async function handleCopyPaymentLink() {
    if (!invoice.stripe_payment_link) return;
    try {
      await navigator.clipboard.writeText(invoice.stripe_payment_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback -- ignore
    }
  }

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            {invoice.invoice_number}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <InvoiceStatusBadge status={invoice.status} />
            <span className="text-sm text-primary-500">
              Issued {formatDate(invoice.issue_date)}
            </span>
            {invoice.due_date && (
              <span className="text-sm text-primary-500">
                Due {formatDate(invoice.due_date)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
            loading={deleting}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Overview                                                          */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Overview
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Contact" value={contactName} />
          <InfoRow label="Gallery" value={galleryName} />
          <InfoRow label="Currency" value={invoice.currency} />
          {invoice.paid_date && (
            <InfoRow label="Paid Date" value={formatDate(invoice.paid_date)} />
          )}
        </dl>
        {!contactName && !galleryName && (
          <p className="text-sm text-primary-400">No contact or gallery assigned.</p>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Line Items                                                        */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-primary-900">
            Line Items
          </h2>
          <Button variant="outline" size="sm" onClick={onAddItem}>
            Add Item
          </Button>
        </div>

        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-400">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-400">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-400">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-primary-100"
                  >
                    <td className="px-4 py-3 text-sm text-primary-800">
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-primary-600">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-primary-600">
                      {formatCurrency(item.unit_price, invoice.currency)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-primary-800">
                      {formatCurrency(item.total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-primary-400">No line items yet.</p>
        )}

        {/* Total */}
        <div className="mt-6 flex justify-end border-t border-primary-100 pt-4">
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
              Total
            </p>
            <p className="mt-1 text-2xl font-semibold text-accent">
              {formatCurrency(invoiceTotal, invoice.currency)}
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Stripe Payment Link                                               */}
      {/* ----------------------------------------------------------------- */}
      {invoice.stripe_payment_link && (
        <section className="rounded-lg border border-primary-100 bg-white p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
            Payment Link
          </h2>
          <div className="flex items-center gap-3">
            <code className="flex-1 truncate rounded-md bg-primary-50 px-3 py-2 text-sm text-primary-700">
              {invoice.stripe_payment_link}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopyPaymentLink}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Notes                                                             */}
      {/* ----------------------------------------------------------------- */}
      {invoice.notes && (
        <section className="rounded-lg border border-primary-100 bg-white p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
            Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-primary-700">
            {invoice.notes}
          </p>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Confirm delete dialog                                             */}
      {/* ----------------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message={`Are you sure you want to delete invoice "${invoice.invoice_number}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
