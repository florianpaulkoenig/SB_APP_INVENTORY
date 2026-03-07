import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../ui/Button';
import type { InvoiceRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InvoiceListProps {
  invoices: Array<InvoiceRow & { contact_name?: string; gallery_name?: string }>;
  onView: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InvoiceList({ invoices, onView }: InvoiceListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        {/* Header */}
        <thead>
          <tr>
            <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-400 sm:px-4 sm:py-3">
              Invoice #
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-400 sm:px-4 sm:py-3">
              Contact
            </th>
            <th className="hidden px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-400 md:table-cell sm:px-4 sm:py-3">
              Gallery
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-400 sm:px-4 sm:py-3">
              Status
            </th>
            <th className="hidden px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-400 sm:table-cell sm:px-4 sm:py-3">
              Issue Date
            </th>
            <th className="hidden px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-400 md:table-cell sm:px-4 sm:py-3">
              Due Date
            </th>
            <th className="px-2 py-2 text-right text-xs font-medium uppercase tracking-wider text-primary-400 sm:px-4 sm:py-3">
              Total
            </th>
            <th className="hidden px-2 py-2 text-right text-xs font-medium uppercase tracking-wider text-primary-400 lg:table-cell sm:px-4 sm:py-3">
              Actions
            </th>
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              onClick={() => onView(invoice.id)}
              className="cursor-pointer border-b border-primary-100 transition-colors hover:bg-primary-50"
            >
              {/* Invoice # */}
              <td className="px-2 py-2 font-mono text-xs text-primary-700 sm:px-4 sm:py-3">
                {invoice.invoice_number}
              </td>

              {/* Contact */}
              <td className="px-2 py-2 text-sm text-primary-800 sm:px-4 sm:py-3">
                {invoice.contact_name ?? '\u2014'}
              </td>

              {/* Gallery */}
              <td className="hidden px-2 py-2 text-sm text-primary-600 md:table-cell sm:px-4 sm:py-3">
                {invoice.gallery_name ?? '\u2014'}
              </td>

              {/* Status */}
              <td className="px-2 py-2 sm:px-4 sm:py-3">
                <InvoiceStatusBadge status={invoice.status} />
              </td>

              {/* Issue Date */}
              <td className="hidden px-2 py-2 text-sm text-primary-600 sm:table-cell sm:px-4 sm:py-3">
                {formatDate(invoice.issue_date)}
              </td>

              {/* Due Date */}
              <td className="hidden px-2 py-2 text-sm text-primary-600 md:table-cell sm:px-4 sm:py-3">
                {invoice.due_date ? formatDate(invoice.due_date) : '\u2014'}
              </td>

              {/* Total */}
              <td className="px-2 py-2 text-right text-sm font-medium text-primary-800 sm:px-4 sm:py-3">
                {formatCurrency(invoice.total, invoice.currency)}
              </td>

              {/* Actions */}
              <td className="hidden px-2 py-2 text-right lg:table-cell sm:px-4 sm:py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(invoice.id);
                  }}
                >
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Empty state */}
      {invoices.length === 0 && (
        <div className="py-12 text-center text-sm text-primary-400">
          No invoices found.
        </div>
      )}
    </div>
  );
}
