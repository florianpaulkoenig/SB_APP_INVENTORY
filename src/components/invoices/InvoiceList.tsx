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
      <table className="w-full min-w-[900px]">
        {/* Header */}
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
              Invoice #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
              Contact
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
              Gallery
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
              Issue Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
              Due Date
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-400">
              Total
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-400">
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
              <td className="px-4 py-3 font-mono text-xs text-primary-700">
                {invoice.invoice_number}
              </td>

              {/* Contact */}
              <td className="px-4 py-3 text-sm text-primary-800">
                {invoice.contact_name ?? '\u2014'}
              </td>

              {/* Gallery */}
              <td className="px-4 py-3 text-sm text-primary-600">
                {invoice.gallery_name ?? '\u2014'}
              </td>

              {/* Status */}
              <td className="px-4 py-3">
                <InvoiceStatusBadge status={invoice.status} />
              </td>

              {/* Issue Date */}
              <td className="px-4 py-3 text-sm text-primary-600">
                {formatDate(invoice.issue_date)}
              </td>

              {/* Due Date */}
              <td className="px-4 py-3 text-sm text-primary-600">
                {invoice.due_date ? formatDate(invoice.due_date) : '\u2014'}
              </td>

              {/* Total */}
              <td className="px-4 py-3 text-right text-sm font-medium text-primary-800">
                {formatCurrency(invoice.total, invoice.currency)}
              </td>

              {/* Actions */}
              <td className="px-4 py-3 text-right">
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
