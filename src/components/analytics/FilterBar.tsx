// ---------------------------------------------------------------------------
// FilterBar — Shared filter bar for analytics dashboards
// ---------------------------------------------------------------------------

import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterBarSelect {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export interface FilterBarProps {
  /** Date range: [from, to] as ISO date strings */
  dateRange?: [string, string];
  onDateRangeChange?: (range: [string, string]) => void;
  /** Select dropdowns */
  selects?: FilterBarSelect[];
  /** Optional extra content on the right */
  extra?: ReactNode;
  className?: string;
}

const selectStyles =
  'rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm text-primary-700 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

const dateStyles =
  'rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm text-primary-700 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

export function FilterBar({
  dateRange,
  onDateRangeChange,
  selects,
  extra,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3',
        className,
      )}
    >
      {/* Date range */}
      {dateRange && onDateRangeChange && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-primary-400 whitespace-nowrap">From</span>
          <input
            type="date"
            value={dateRange[0]}
            onChange={(e) => onDateRangeChange([e.target.value, dateRange[1]])}
            className={dateStyles}
          />
          <span className="text-xs text-primary-400">to</span>
          <input
            type="date"
            value={dateRange[1]}
            onChange={(e) => onDateRangeChange([dateRange[0], e.target.value])}
            className={dateStyles}
          />
        </div>
      )}

      {/* Select filters */}
      {selects?.map((s) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <span className="text-xs text-primary-400 whitespace-nowrap">{s.label}</span>
          <select
            value={s.value}
            onChange={(e) => s.onChange(e.target.value)}
            className={selectStyles}
          >
            <option value="">All</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {/* Extra content */}
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  );
}
