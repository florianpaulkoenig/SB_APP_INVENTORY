import { type ReactNode } from 'react';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';
import { PLATFORM_MAP, addMonths, fmtPct, fmtSigned } from '../../lib/socialMedia';
import type { SocialMediaPlatform } from '../../types/database';

// Small building blocks shared by the social media and website views


export function PlatformDot({ platform, className }: { platform: SocialMediaPlatform; className?: string }) {
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', className)}
      style={{ backgroundColor: PLATFORM_MAP[platform]?.color }}
    />
  );
}

export function Delta({ value, pct, invert = false }: { value?: number | null; pct?: number | null; invert?: boolean }) {
  const v = pct ?? value;
  if (v == null) return <span className="text-primary-300">—</span>;
  const up = invert ? v < 0 : v > 0;
  const down = invert ? v > 0 : v < 0;
  return (
    <span className={cn('tabular-nums', up && 'text-emerald-600', down && 'text-red-500', !up && !down && 'text-primary-400')}>
      {pct != null ? fmtPct(pct) : fmtSigned(value)}
    </span>
  );
}

export function KpiTile({ label, value, sub, hint }: { label: string; value: string; sub?: ReactNode; hint?: string }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-xs text-primary-400" title={hint}>{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-primary-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-primary-400">{sub}</p>}
    </Card>
  );
}

export function MonthStepper({ month, onChange, max }: { month: string; onChange: (m: string) => void; max?: string }) {
  const arrow = 'rounded p-1.5 text-primary-400 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={arrow} onClick={() => onChange(addMonths(month, -1))} aria-label="Vorheriger Monat">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5l-5 5 5 5" /></svg>
      </button>
      <input
        type="month"
        value={month}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="rounded border border-primary-200 bg-white px-2 py-1 text-sm text-primary-800"
      />
      <button type="button" className={arrow} disabled={!!max && month >= max} onClick={() => onChange(addMonths(month, 1))} aria-label="Nächster Monat">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M8 5l5 5-5 5" /></svg>
      </button>
    </div>
  );
}
