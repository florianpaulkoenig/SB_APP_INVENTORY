// ---------------------------------------------------------------------------
// TrendIndicator — Up/down arrow with percentage change
// ---------------------------------------------------------------------------

import { cn } from '../../lib/utils';

export interface TrendIndicatorProps {
  /** Percentage change (positive = up, negative = down, 0 = neutral) */
  value: number;
  /** Optional label shown after the percentage */
  label?: string;
  className?: string;
}

export function TrendIndicator({ value, label, className }: TrendIndicatorProps) {
  const isUp = value > 0;
  const isDown = value < 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isUp && 'text-emerald-600',
        isDown && 'text-red-600',
        !isUp && !isDown && 'text-primary-400',
        className,
      )}
    >
      {isUp && (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
          <path d="M6 2.5v7M6 2.5L3 5.5M6 2.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {isDown && (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
          <path d="M6 9.5v-7M6 9.5L3 6.5M6 9.5l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
      {label && <span className="text-primary-400 ml-0.5">{label}</span>}
    </span>
  );
}
