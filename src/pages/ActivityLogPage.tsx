import { useState } from 'react';
import { format } from 'date-fns';
import { useActivityLog } from '../hooks/useActivityLog';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTITY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'artwork', label: 'Artwork' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'contact', label: 'Contact' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'sale', label: 'Sale' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'packing_list', label: 'Packing List' },
  { value: 'production_order', label: 'Production Order' },
] as const;

const ACTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
] as const;

const LIMITS = [50, 100, 250] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getActionBadgeVariant(action: string): 'success' | 'info' | 'danger' | 'default' {
  switch (action) {
    case 'create':
      return 'success';
    case 'update':
      return 'info';
    case 'delete':
      return 'danger';
    default:
      return 'default';
  }
}

function formatEntityType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ActivityLogPage() {
  // ---- Filter state -------------------------------------------------------

  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [entityIdSearch, setEntityIdSearch] = useState('');
  const [limit, setLimit] = useState<number>(50);

  // ---- Collapsible rows ---------------------------------------------------

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ---- Data ---------------------------------------------------------------

  const { entries, loading, error } = useActivityLog({
    entityType: entityType || undefined,
    action: action || undefined,
    entityId: entityIdSearch || undefined,
    limit,
  });

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">
          Activity Log
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Audit trail of all changes across the inventory.
        </p>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
        {/* Entity type */}
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-primary-400">
            Entity Type
          </label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-800 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Action */}
        <div className="w-full sm:w-36">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-primary-400">
            Action
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-800 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          >
            {ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* Entity ID search */}
        <div className="w-full sm:w-56">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-primary-400">
            Entity ID
          </label>
          <input
            type="text"
            value={entityIdSearch}
            onChange={(e) => setEntityIdSearch(e.target.value)}
            placeholder="Search by entity ID..."
            className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-800 placeholder:text-primary-300 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
        </div>

        {/* Limit */}
        <div className="w-full sm:w-28">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-primary-400">
            Limit
          </label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-800 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          >
            {LIMITS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load activity log. Please try again later.
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <svg
            className="h-12 w-12 text-primary-300"
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
          <p className="mt-3 text-sm font-medium text-primary-700">
            No activity log entries found
          </p>
          <p className="mt-1 text-sm text-primary-400">
            {entityType || action || entityIdSearch
              ? 'Try adjusting your filters.'
              : 'Activity will appear here as changes are made.'}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && entries.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-primary-100">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-primary-100 bg-primary-50">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-primary-500">
                  Date / Time
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-primary-500">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-primary-500">
                  Action
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-primary-500">
                  Entity Type
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-primary-500">
                  Entity ID
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-primary-500">
                  Changes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {entries.map((entry) => {
                const isExpanded = expandedRows.has(entry.id);
                const hasChanges =
                  entry.changes !== null &&
                  Object.keys(entry.changes).length > 0;

                return (
                  <tr
                    key={entry.id}
                    className="bg-white transition-colors hover:bg-primary-25"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-primary-700">
                      {format(new Date(entry.created_at), 'dd MMM yyyy, HH:mm')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-primary-500">
                      {entry.user_id.slice(0, 8)}...
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge variant={getActionBadgeVariant(entry.action)}>
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-primary-700">
                      {formatEntityType(entry.entity_type)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-primary-500">
                      {entry.entity_id ? `${entry.entity_id.slice(0, 8)}...` : '\u2014'}
                    </td>
                    <td className="px-4 py-3">
                      {hasChanges ? (
                        <button
                          type="button"
                          onClick={() => toggleRow(entry.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-800 transition-colors"
                        >
                          <svg
                            className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8.25 4.5l7.5 7.5-7.5 7.5"
                            />
                          </svg>
                          {isExpanded ? 'Hide' : 'View'}
                        </button>
                      ) : (
                        <span className="text-xs text-primary-300">{'\u2014'}</span>
                      )}
                      {isExpanded && hasChanges && (
                        <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-primary-100 bg-primary-50 p-3 text-xs text-primary-700">
                          {JSON.stringify(entry.changes, null, 2)}
                        </pre>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
