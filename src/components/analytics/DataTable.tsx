// ---------------------------------------------------------------------------
// DataTable — Sortable analytics table
// ---------------------------------------------------------------------------

import { useState, useMemo, type ReactNode } from 'react';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render: (row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
  title?: string;
  subtitle?: string;
  columns: DataTableColumn<T>[];
  data: T[];
  /** Function to extract a unique key from each row */
  rowKey: (row: T) => string;
  /** Default sort column key */
  defaultSort?: string;
  defaultSortDir?: 'asc' | 'desc';
  /** Extract numeric value for sorting */
  sortValue?: (row: T, key: string) => number | string;
  /** Max rows to display (default: all) */
  maxRows?: number;
  className?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  title,
  subtitle,
  columns,
  data,
  rowKey,
  defaultSort,
  defaultSortDir = 'desc',
  sortValue,
  maxRows,
  className,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState(defaultSort ?? '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);

  const sorted = useMemo(() => {
    if (!sortKey || !sortValue) return data;
    const copy = [...data];
    copy.sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va);
      const sb = String(vb);
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return copy;
  }, [data, sortKey, sortDir, sortValue]);

  const display = maxRows ? sorted.slice(0, maxRows) : sorted;

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      {(title || subtitle) && (
        <div className="border-b border-primary-100 px-5 py-4">
          {title && (
            <h3 className="font-display text-sm font-semibold text-primary-900">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-0.5 text-xs text-primary-400">{subtitle}</p>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary-100 bg-primary-50/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-xs font-medium uppercase tracking-wider text-primary-400',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.align !== 'right' && col.align !== 'center' && 'text-left',
                    col.sortable && 'cursor-pointer select-none hover:text-primary-600',
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
                        {sortDir === 'asc' ? (
                          <path d="M6 3L10 8H2L6 3Z" />
                        ) : (
                          <path d="M6 9L2 4H10L6 9Z" />
                        )}
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-50">
            {display.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-primary-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              display.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  className="transition-colors hover:bg-primary-50/50"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-primary-700',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                      )}
                    >
                      {col.render(row, i)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
