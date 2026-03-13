import { useState, useMemo } from 'react';
import { formatCurrency } from '../../lib/utils';
import { GALLERY_TYPES } from '../../lib/constants';
import type { GalleryRow } from '../../types/database';
import type { GalleryStats } from './GalleryCard';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GalleryTableProps {
  galleries: GalleryRow[];
  galleryStats: Record<string, GalleryStats>;
  onGalleryClick: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------

type SortKey =
  | 'name'
  | 'type'
  | 'city'
  | 'country'
  | 'total'
  | 'onConsignment'
  | 'sold'
  | 'revenueSold'
  | 'revenuePotential';

const COLUMNS: { key: SortKey; label: string; align?: 'right'; hiddenBelow?: 'sm' | 'md' | 'lg' }[] = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type / Category', hiddenBelow: 'md' },
  { key: 'city', label: 'City', hiddenBelow: 'lg' },
  { key: 'country', label: 'Country', hiddenBelow: 'lg' },
  { key: 'total', label: 'Artworks', align: 'right' },
  { key: 'onConsignment', label: 'On Consignment', align: 'right', hiddenBelow: 'md' },
  { key: 'sold', label: 'Sold', align: 'right', hiddenBelow: 'sm' },
  { key: 'revenueSold', label: 'Revenue (Sold)', align: 'right', hiddenBelow: 'md' },
  { key: 'revenuePotential', label: 'Revenue (Potential)', align: 'right', hiddenBelow: 'lg' },
];

function getGalleryTypeLabel(type: string | null | undefined): string {
  if (!type) return '\u2014';
  const found = GALLERY_TYPES.find((gt) => gt.value === type);
  return found ? found.label : type;
}

function getStat(stats: Record<string, GalleryStats>, id: string, key: keyof GalleryStats): number {
  return stats[id]?.[key] ?? 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GalleryTable({ galleries, galleryStats, onGalleryClick }: GalleryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  const sorted = useMemo(() => {
    const copy = [...galleries];
    const dir = sortAsc ? 1 : -1;

    copy.sort((a, b) => {
      let av: string | number;
      let bv: string | number;

      switch (sortKey) {
        case 'name':
          av = (a.name ?? '').toLowerCase();
          bv = (b.name ?? '').toLowerCase();
          break;
        case 'type':
          av = getGalleryTypeLabel(a.type).toLowerCase();
          bv = getGalleryTypeLabel(b.type).toLowerCase();
          break;
        case 'city':
          av = (a.city ?? '').toLowerCase();
          bv = (b.city ?? '').toLowerCase();
          break;
        case 'country':
          av = (a.country ?? '').toLowerCase();
          bv = (b.country ?? '').toLowerCase();
          break;
        case 'total':
        case 'onConsignment':
        case 'sold':
        case 'revenueSold':
        case 'revenuePotential':
          av = getStat(galleryStats, a.id, sortKey);
          bv = getStat(galleryStats, b.id, sortKey);
          break;
        default:
          return 0;
      }

      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return copy;
  }, [galleries, galleryStats, sortKey, sortAsc]);

  const hiddenClass = (col: typeof COLUMNS[number]) => {
    if (!col.hiddenBelow) return '';
    return col.hiddenBelow === 'sm'
      ? 'hidden sm:table-cell'
      : col.hiddenBelow === 'md'
        ? 'hidden md:table-cell'
        : 'hidden lg:table-cell';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className={`cursor-pointer select-none whitespace-nowrap px-2 py-2 text-xs font-medium uppercase tracking-wider text-primary-400 sm:px-4 sm:py-3 ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                } ${hiddenClass(col)}`}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key && (
                    <svg
                      className={`h-3 w-3 transition-transform ${sortAsc ? '' : 'rotate-180'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                    </svg>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sorted.map((gallery) => {
            const s = galleryStats[gallery.id];
            return (
              <tr
                key={gallery.id}
                onClick={() => onGalleryClick(gallery.id)}
                className="cursor-pointer border-b border-primary-100 transition-colors hover:bg-primary-50"
              >
                {/* Name with status dot */}
                <td className="px-2 py-2 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-2">
                    {gallery.status_color && (
                      <span
                        className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${
                          gallery.status_color === 'green'
                            ? 'bg-green-500'
                            : gallery.status_color === 'yellow'
                              ? 'bg-yellow-400'
                              : 'bg-red-500'
                        }`}
                      />
                    )}
                    <span className="text-sm font-medium text-primary-800 truncate max-w-[200px]">
                      {gallery.name}
                    </span>
                  </div>
                </td>

                {/* Type */}
                <td className={`px-2 py-2 text-sm text-primary-600 sm:px-4 sm:py-3 hidden md:table-cell`}>
                  {getGalleryTypeLabel(gallery.type)}
                </td>

                {/* City */}
                <td className="hidden px-2 py-2 text-sm text-primary-600 lg:table-cell sm:px-4 sm:py-3">
                  {gallery.city ?? '\u2014'}
                </td>

                {/* Country */}
                <td className="hidden px-2 py-2 text-sm text-primary-600 lg:table-cell sm:px-4 sm:py-3">
                  {gallery.country ?? '\u2014'}
                </td>

                {/* Artworks */}
                <td className="px-2 py-2 text-right text-sm font-medium text-primary-800 sm:px-4 sm:py-3">
                  {s?.total ?? 0}
                </td>

                {/* On Consignment */}
                <td className="hidden px-2 py-2 text-right text-sm text-blue-600 md:table-cell sm:px-4 sm:py-3">
                  {s?.onConsignment ?? 0}
                </td>

                {/* Sold */}
                <td className="hidden px-2 py-2 text-right text-sm text-red-600 sm:table-cell sm:px-4 sm:py-3">
                  {s?.sold ?? 0}
                </td>

                {/* Revenue (Sold) */}
                <td className="hidden px-2 py-2 text-right text-sm font-medium text-primary-700 md:table-cell sm:px-4 sm:py-3">
                  {s?.revenueSold ? formatCurrency(Math.round(s.revenueSold), 'CHF') : '\u2014'}
                </td>

                {/* Revenue (Potential) */}
                <td className="hidden px-2 py-2 text-right text-sm font-medium text-amber-600 lg:table-cell sm:px-4 sm:py-3">
                  {s?.revenuePotential ? formatCurrency(Math.round(s.revenuePotential), 'CHF') : '\u2014'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sorted.length === 0 && (
        <div className="py-12 text-center text-sm text-primary-400">
          No galleries found.
        </div>
      )}
    </div>
  );
}
