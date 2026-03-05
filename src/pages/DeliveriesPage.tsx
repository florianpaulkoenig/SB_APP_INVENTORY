import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDeliveries } from '../hooks/useDeliveries';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { GallerySelect } from '../components/galleries/GallerySelect';
import { DELIVERY_STATUSES } from '../lib/constants';
import { formatDate } from '../lib/utils';
import type { DeliveryStatus } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DeliveriesPage() {
  const navigate = useNavigate();

  // ---- Filters ------------------------------------------------------------

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [galleryFilter, setGalleryFilter] = useState<string | null>(null);

  const { deliveries, loading } = useDeliveries({
    filters: {
      search: search || undefined,
      status: (statusFilter || undefined) as DeliveryStatus | undefined,
      galleryId: galleryFilter || undefined,
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
            Deliveries
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Manage artwork deliveries and shipments.
          </p>
        </div>

        <Button onClick={() => navigate('/deliveries/new')}>
          New Delivery
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by delivery number or recipient..."
          className="max-w-md"
        />

        <div className="w-48">
          <Select
            options={[...DELIVERY_STATUSES]}
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            placeholder="All Statuses"
          />
        </div>

        <div className="w-48">
          <GallerySelect
            value={galleryFilter}
            onChange={setGalleryFilter}
            label="Gallery"
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
      {!loading && deliveries.length === 0 && (
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
                d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-3.375c0-.621-.504-1.125-1.125-1.125H18.75M6.75 12h-.008v.008H6.75V12zm0 3h-.008v.008H6.75V15zm0-6h-.008v.008H6.75V9zm12 3h.008v-.008H18.75V12zm0 3h.008v-.008H18.75V15zM9.348 4.602A3.375 3.375 0 0112.75 2.25h.008a3.375 3.375 0 013.402 2.352l.442 1.398H8.906l.442-1.398z"
              />
            </svg>
          }
          title={search || statusFilter || galleryFilter ? 'No deliveries found' : 'No deliveries yet'}
          description={
            search || statusFilter || galleryFilter
              ? 'Try adjusting your search terms or filters.'
              : 'Create your first delivery to start tracking shipments.'
          }
          action={
            !search && !statusFilter && !galleryFilter ? (
              <Button onClick={() => navigate('/deliveries/new')}>
                Create First Delivery
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Deliveries table */}
      {!loading && deliveries.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-primary-100">
          <table className="min-w-full divide-y divide-primary-100">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Delivery #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Recipient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Gallery
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50 bg-white">
              {deliveries.map((delivery) => (
                <tr
                  key={delivery.id}
                  className="cursor-pointer hover:bg-primary-50 transition-colors"
                  onClick={() => navigate(`/deliveries/${delivery.id}`)}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-primary-900">
                    {delivery.delivery_number}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {delivery.recipient_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {delivery.galleries?.name ?? '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {delivery.delivery_date ? formatDate(delivery.delivery_date) : '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={delivery.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/deliveries/${delivery.id}`);
                      }}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
