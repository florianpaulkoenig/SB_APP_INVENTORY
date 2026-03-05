import { StatusBadge } from '../ui/StatusBadge';
import { formatCurrency, formatDimensions } from '../../lib/utils';
import type { ArtworkRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkTableProps {
  artworks: ArtworkRow[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort: (column: string) => void;
  onRowClick: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
}

const COLUMNS: Column[] = [
  { key: 'inventory_number', label: 'Inventory #', sortable: true },
  { key: 'reference_code', label: 'Ref Code', sortable: true },
  { key: 'title', label: 'Title', sortable: true },
  { key: 'medium', label: 'Medium', sortable: true },
  { key: 'year', label: 'Year', sortable: true },
  { key: 'dimensions', label: 'Dimensions', sortable: false },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'price', label: 'Price', sortable: true },
  { key: 'current_location', label: 'Location', sortable: true },
];

// ---------------------------------------------------------------------------
// Sort indicator
// ---------------------------------------------------------------------------

function SortIndicator({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  if (!active) {
    return (
      <svg
        className="ml-1 inline-block h-3 w-3 text-primary-300"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
      </svg>
    );
  }

  return order === 'asc' ? (
    <svg
      className="ml-1 inline-block h-3 w-3 text-primary-700"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  ) : (
    <svg
      className="ml-1 inline-block h-3 w-3 text-primary-700"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtworkTable({
  artworks,
  sortBy,
  sortOrder = 'asc',
  onSort,
  onRowClick,
}: ArtworkTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px]">
        {/* Header */}
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={
                  'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400' +
                  (col.sortable ? ' cursor-pointer select-none hover:text-primary-600' : '')
                }
                onClick={col.sortable ? () => onSort(col.key) : undefined}
              >
                <span className="inline-flex items-center">
                  {col.label}
                  {col.sortable && (
                    <SortIndicator
                      active={sortBy === col.key}
                      order={sortBy === col.key ? sortOrder : 'asc'}
                    />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {artworks.map((artwork) => {
            const dimensions = formatDimensions(
              artwork.height,
              artwork.width,
              artwork.depth,
              artwork.dimension_unit,
            );

            return (
              <tr
                key={artwork.id}
                onClick={() => onRowClick(artwork.id)}
                className="cursor-pointer border-b border-primary-100 transition-colors hover:bg-primary-50"
              >
                {/* Inventory # */}
                <td className="px-4 py-3 font-mono text-xs text-primary-700">
                  {artwork.inventory_number}
                </td>

                {/* Ref Code */}
                <td className="px-4 py-3 font-mono text-xs text-primary-500">
                  {artwork.reference_code}
                </td>

                {/* Title */}
                <td className="px-4 py-3 text-sm font-medium text-primary-900">
                  {artwork.title}
                </td>

                {/* Medium */}
                <td className="px-4 py-3 text-sm text-primary-600">
                  {artwork.medium ?? '\u2014'}
                </td>

                {/* Year */}
                <td className="px-4 py-3 text-sm text-primary-600">
                  {artwork.year ?? '\u2014'}
                </td>

                {/* Dimensions */}
                <td className="px-4 py-3 text-sm text-primary-600">
                  {dimensions || '\u2014'}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge status={artwork.status} />
                </td>

                {/* Price */}
                <td className="px-4 py-3 text-sm text-primary-800">
                  {artwork.price != null
                    ? formatCurrency(artwork.price, artwork.currency)
                    : '\u2014'}
                </td>

                {/* Location */}
                <td className="px-4 py-3 text-sm text-primary-600">
                  {artwork.current_location ?? '\u2014'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Empty state */}
      {artworks.length === 0 && (
        <div className="py-12 text-center text-sm text-primary-400">
          No artworks found.
        </div>
      )}
    </div>
  );
}
