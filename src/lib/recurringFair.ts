// ---------------------------------------------------------------------------
// NOA Inventory -- Recurring art fair helpers (pure, unit-tested)
// ---------------------------------------------------------------------------

import { todayLocal } from './utils';
import type { ExhibitionRow } from '../types/database';

/** Editions whose follow-up is due: recurring, ended, not yet answered. */
export function pendingRecurrences(exhibitions: ExhibitionRow[], today = todayLocal()): ExhibitionRow[] {
  return exhibitions
    .filter((ex) => ex.recurs_annually && !ex.recurrence_resolved_at && !!ex.end_date && ex.end_date < today)
    .sort((a, b) => (a.end_date ?? '').localeCompare(b.end_date ?? ''));
}

/** Same calendar date one year later ("2026-03-15" → "2027-03-15"). */
export function shiftYear(date: string | null, years = 1): string {
  if (!date) return '';
  const [y, m, d] = date.split('-').map(Number);
  return `${y + years}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Title with the edition year bumped ("Art Basel 2026" → "Art Basel 2027"). */
export function shiftTitleYear(title: string, fromYear: number): string {
  return title.includes(String(fromYear)) ? title.replace(String(fromYear), String(fromYear + 1)) : title;
}
