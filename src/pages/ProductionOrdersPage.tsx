import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductionOrders } from '../hooks/useProductionOrders';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { PRODUCTION_STATUSES } from '../lib/constants';
import { formatDate } from '../lib/utils';
import type { ProductionStatus } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ProductionOrdersPage() {
  const navigate = useNavigate();

  // ---- Filters ------------------------------------------------------------

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { productionOrders, loading } = useProductionOrders({
    filters: {
      search: search || undefined,
      status: (statusFilter || undefined) as ProductionStatus | undefined,
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
            Production Orders
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Manage production orders and track manufacturing progress.
          </p>
        </div>

        <Button onClick={() => navigate('/production/new')}>
          New Production Order
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by order number or title..."
          className="max-w-md"
        />

        <div className="w-48">
          <Select
            options={[...PRODUCTION_STATUSES]}
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
      {!loading && productionOrders.length === 0 && (
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
                d="M11.42 15.17l-5.25-3.03a.75.75 0 010-1.28l5.25-3.03a.75.75 0 01.75 0l5.25 3.03a.75.75 0 010 1.28l-5.25 3.03a.75.75 0 01-.75 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 10.5v6l7.5 4.33 7.5-4.33v-6"
              />
            </svg>
          }
          title={search || statusFilter ? 'No production orders found' : 'No production orders yet'}
          description={
            search || statusFilter
              ? 'Try adjusting your search terms or filters.'
              : 'Create your first production order to start tracking manufacturing.'
          }
          action={
            !search && !statusFilter ? (
              <Button onClick={() => navigate('/production/new')}>
                Create First Production Order
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Production orders table */}
      {!loading && productionOrders.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-primary-100">
          <table className="min-w-full divide-y divide-primary-100">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Order #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Ordered Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Deadline
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50 bg-white">
              {productionOrders.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer hover:bg-primary-50 transition-colors"
                  onClick={() => navigate(`/production/${order.id}`)}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-primary-900">
                    {order.order_number}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {order.title}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {order.ordered_date ? formatDate(order.ordered_date) : '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {order.deadline ? formatDate(order.deadline) : '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/production/${order.id}`);
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
