// ---------------------------------------------------------------------------
// OpenInvoicesTable -- Small table showing overdue / open invoices
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { Card } from '../ui/Card';
import { formatCurrency, formatDate } from '../../lib/utils';

export interface OpenInvoicesTableProps {
  invoices: {
    id: string;
    invoice_number: string;
    total: number;
    currency: string;
    due_date: string | null;
    contact_name: string | null;
  }[];
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function OpenInvoicesTable({ invoices }: OpenInvoicesTableProps) {
  const sorted = useMemo(
    () =>
      [...invoices].sort((a, b) => {
        // Overdue first, then by due date ascending
        const aOverdue = isOverdue(a.due_date);
        const bOverdue = isOverdue(b.due_date);
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }),
    [invoices],
  );

  const hasData = sorted.length > 0;

  return (
    <Card className="p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-primary-900">
        Open Invoices
      </h3>

      {!hasData ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-primary-400">No open invoices</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-primary-100">
                <th className="pb-2 pr-4 text-xs font-medium uppercase tracking-wider text-primary-400">
                  Invoice #
                </th>
                <th className="pb-2 pr-4 text-xs font-medium uppercase tracking-wider text-primary-400">
                  Contact
                </th>
                <th className="pb-2 pr-4 text-right text-xs font-medium uppercase tracking-wider text-primary-400">
                  Amount
                </th>
                <th className="pb-2 pr-4 text-xs font-medium uppercase tracking-wider text-primary-400">
                  Due Date
                </th>
                <th className="pb-2 text-xs font-medium uppercase tracking-wider text-primary-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((inv) => {
                const overdue = isOverdue(inv.due_date);
                return (
                  <tr
                    key={inv.id}
                    className={`border-b border-primary-50 ${
                      overdue ? 'bg-red-50/50' : ''
                    }`}
                  >
                    <td className="py-2.5 pr-4">
                      <a
                        href={`/invoices/${inv.id}`}
                        className="font-medium text-accent hover:text-accent-dark underline-offset-2 hover:underline"
                      >
                        {inv.invoice_number}
                      </a>
                    </td>
                    <td className="py-2.5 pr-4 text-primary-700">
                      {inv.contact_name ?? '\u2014'}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium text-primary-900">
                      {formatCurrency(inv.total, inv.currency)}
                    </td>
                    <td className="py-2.5 pr-4 text-primary-600">
                      {inv.due_date ? formatDate(inv.due_date) : '\u2014'}
                    </td>
                    <td className="py-2.5">
                      {overdue ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          Overdue
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Open
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
