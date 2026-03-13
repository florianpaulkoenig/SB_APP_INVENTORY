import { ARTWORK_STATUSES } from '../../lib/constants';
import type { ArtworkStatus } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkStatusSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map status value to its dot color class (bg-* only, for the indicator). */
function getDotColor(statusValue: string): string {
  switch (statusValue) {
    case 'available':
      return 'bg-emerald-500';
    case 'sold':
      return 'bg-red-500';
    case 'reserved':
      return 'bg-amber-500';
    case 'in_production':
      return 'bg-blue-500';
    case 'in_transit':
      return 'bg-purple-500';
    case 'on_consignment':
      return 'bg-sky-500';
    case 'paid':
      return 'bg-emerald-600';
    case 'pending_sale':
      return 'bg-orange-500';
    case 'archived':
      return 'bg-gray-400';
    case 'destroyed':
      return 'bg-red-700';
    case 'donated':
      return 'bg-violet-500';
    default:
      return 'bg-primary-400';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A specialised status select for artworks that renders a coloured dot next
 * to the currently selected value. Uses a native <select> under the hood for
 * accessibility and simplicity, wrapped in a custom container that shows the
 * dot indicator.
 */
export function ArtworkStatusSelect({
  value,
  onChange,
  className,
}: ArtworkStatusSelectProps) {
  const currentStatus = ARTWORK_STATUSES.find((s) => s.value === value);

  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-primary-700">
        Status
      </label>

      <div className="relative">
        {/* Colour dot indicator */}
        <span
          className={`pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${getDotColor(value)}`}
          aria-hidden="true"
        />

        <select
          value={value}
          onChange={(e) => onChange(e.target.value as ArtworkStatus)}
          className="w-full appearance-none rounded-md border border-primary-200 bg-white py-2 pl-8 pr-8 text-sm text-primary-900 transition-colors focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          aria-label={`Status: ${currentStatus?.label ?? value}`}
        >
          {ARTWORK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Chevron icon */}
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-400"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}
