import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoices } from '../hooks/useInvoices';
import { InvoiceList } from '../components/invoices/InvoiceList';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Select';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { INVOICE_STATUSES } from '../lib/constants';
import type { InvoiceStatus } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function InvoicesPage() {
  const navigate = useNavigate();

  // ---- Filters ------------------------------------------------------------

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { invoices, loading } = useInvoices({
    filters: {
      search: search || undefined,
      status: (statusFilter || undefined) as InvoiceStatus | undefined,
    },
  });

  // ---- Handlers -----------------------------------------------------------

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Invoices
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Create and manage invoices for artwork sales.
          </p>
        </div>

        <Button onClick={() => navigate('/invoices/new')}>
          New Invoice
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by invoice number..."
          className="max-w-md"
        />

        <div className="w-full sm:w-48">
          <Select
            options={[...INVOICE_STATUSES]}
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            placeholder="All Statuses"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && invoices.length === 0 && (
        <EmptyState
          icon={
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          }
          title={search || statusFilter ? 'No invoices found' : 'No invoices yet'}
          description={
            search || statusFilter
              ? 'Try adjusting your search terms or filters.'
              : 'Create your first invoice to start billing.'
          }
          action={
            !search && !statusFilter ? (
              <Button onClick={() => navigate('/invoices/new')}>
                Create First Invoice
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Invoice list */}
      {!loading && invoices.length > 0 && (
        <InvoiceList
          invoices={invoices}
          onInvoiceClick={(invoice) => navigate(`/invoices/${invoice.id}`)}
        />
      )}
    </div>
  );
}
