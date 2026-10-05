// ---------------------------------------------------------------------------
// NOA Inventory -- Exhibition status helpers (pure, unit-tested)
//
// A manual `status` is stored per exhibition. For display and sorting the
// app derives a *phase* from status + dates: a confirmed exhibition is
// upcoming, running or completed depending on today's date; every other
// status is its own phase. The list page sorts, groups and filters by phase.
// ---------------------------------------------------------------------------

import { todayLocal } from './utils';
import type { ExhibitionRow, ExhibitionStatus } from '../types/database';

export const EXHIBITION_STATUSES: readonly { value: ExhibitionStatus; label: string; hint: string }[] = [
  { value: 'idea',      label: 'Idea',      hint: 'Under consideration — nothing requested yet' },
  { value: 'requested', label: 'Requested', hint: 'Application sent or in negotiation' },
  { value: 'confirmed', label: 'Confirmed', hint: 'Participation is fixed' },
  { value: 'cancelled', label: 'Cancelled', hint: 'Was confirmed, then called off' },
  { value: 'declined',  label: 'Declined',  hint: 'Not taking part — rejected or turned down' },
] as const;

export type ExhibitionPhase =
  | 'running' | 'upcoming' | 'requested' | 'idea' | 'completed' | 'cancelled' | 'declined';

export type PhaseGroup = 'running' | 'upcoming' | 'planning' | 'past' | 'inactive';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export const PHASE_META: Record<ExhibitionPhase, { label: string; variant: BadgeVariant; order: number; group: PhaseGroup }> = {
  running:   { label: 'Running',   variant: 'success', order: 0, group: 'running'  },
  upcoming:  { label: 'Upcoming',  variant: 'info',    order: 1, group: 'upcoming' },
  requested: { label: 'Requested', variant: 'warning', order: 2, group: 'planning' },
  idea:      { label: 'Idea',      variant: 'default', order: 3, group: 'planning' },
  completed: { label: 'Completed', variant: 'default', order: 4, group: 'past'     },
  cancelled: { label: 'Cancelled', variant: 'danger',  order: 5, group: 'inactive' },
  declined:  { label: 'Declined',  variant: 'default', order: 6, group: 'inactive' },
};

/** Phases in display order — drives the filter chips. */
export const PHASES: readonly ExhibitionPhase[] =
  (Object.keys(PHASE_META) as ExhibitionPhase[]).sort((a, b) => PHASE_META[a].order - PHASE_META[b].order);

export const PHASE_GROUP_LABELS: Record<PhaseGroup, string> = {
  running:  'Running now',
  upcoming: 'Upcoming',
  planning: 'In planning',
  past:     'Past',
  inactive: 'Cancelled & declined',
};

type PhaseInput = Pick<ExhibitionRow, 'start_date' | 'end_date'> & { status?: ExhibitionStatus | null };

/** Derived phase for display, sorting and filtering. */
export function exhibitionPhase(ex: PhaseInput, today = todayLocal()): ExhibitionPhase {
  const status = ex.status ?? 'confirmed';
  if (status !== 'confirmed') return status;
  const start = ex.start_date;
  const end   = ex.end_date ?? ex.start_date;
  if (end && end < today) return 'completed';
  if (start && start <= today) return 'running';
  return 'upcoming';
}

/** Whole days from `today` to `date` (negative = in the past). DST-safe. */
export function daysUntil(date: string, today = todayLocal()): number {
  const toUTC = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUTC(date) - toUTC(today)) / 86_400_000);
}

/** Short relative hint shown under the status badge ("in 12 days", "ends today"). */
export function phaseHint(ex: PhaseInput, today = todayLocal()): string | null {
  const phase = exhibitionPhase(ex, today);
  if (phase === 'upcoming' && ex.start_date) {
    const n = daysUntil(ex.start_date, today);
    if (n <= 0) return 'starts today';
    if (n === 1) return 'tomorrow';
    if (n < 60) return `in ${n} days`;
    const months = Math.round(n / 30);
    return `in ${months} month${months === 1 ? '' : 's'}`;
  }
  if (phase === 'running') {
    const end = ex.end_date ?? ex.start_date;
    if (!end) return null;
    const n = daysUntil(end, today);
    if (n <= 0) return 'ends today';
    if (n === 1) return 'ends tomorrow';
    return `ends in ${n} days`;
  }
  return null;
}

// ---- Sorting ----------------------------------------------------------------

export type ExhibitionSortKey =
  | 'smart' | 'status' | 'title' | 'type' | 'venue' | 'location' | 'start_date' | 'budget';
export type SortDir = 'asc' | 'desc';

/** Sensible first direction when a column is clicked. */
export const DEFAULT_SORT_DIR: Record<ExhibitionSortKey, SortDir> = {
  smart: 'asc', status: 'asc', title: 'asc', type: 'asc', venue: 'asc', location: 'asc',
  start_date: 'desc', budget: 'desc',
};

const locationOf = (ex: ExhibitionRow) => [ex.city, ex.country].filter(Boolean).join(', ');

/**
 * Smart order: what matters now comes first.
 *   running → upcoming (soonest first) → in planning (soonest first, undated
 *   last) → past (latest first) → cancelled / declined (latest first).
 */
export function smartCompare(a: ExhibitionRow, b: ExhibitionRow, today = todayLocal()): number {
  const pa = PHASE_META[exhibitionPhase(a, today)];
  const pb = PHASE_META[exhibitionPhase(b, today)];
  if (pa.order !== pb.order) return pa.order - pb.order;
  const da = a.start_date ?? '';
  const db = b.start_date ?? '';
  if (!da && !db) return a.title.localeCompare(b.title);
  if (!da) return 1;
  if (!db) return -1;
  const ascending = pa.group === 'running' || pa.group === 'upcoming' || pa.group === 'planning';
  const cmp = da.localeCompare(db);
  return (ascending ? cmp : -cmp) || a.title.localeCompare(b.title);
}

export function sortExhibitions(
  list: readonly ExhibitionRow[],
  key: ExhibitionSortKey,
  dir: SortDir,
  today = todayLocal(),
): ExhibitionRow[] {
  const rows = [...list];
  if (key === 'smart') return rows.sort((a, b) => smartCompare(a, b, today));

  const sign = dir === 'asc' ? 1 : -1;
  const text = (v: string | null | undefined) => (v ?? '').toLowerCase();
  // Null-ish values always sink to the bottom, whatever the direction
  const nullLast = (av: boolean, bv: boolean) => (av === bv ? 0 : av ? 1 : -1);

  return rows.sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'title':    cmp = sign * text(a.title).localeCompare(text(b.title)); break;
      case 'type':     cmp = sign * text(a.type).localeCompare(text(b.type)); break;
      case 'venue':
        cmp = nullLast(!a.venue, !b.venue) || sign * text(a.venue).localeCompare(text(b.venue)); break;
      case 'location':
        cmp = nullLast(!locationOf(a), !locationOf(b)) || sign * text(locationOf(a)).localeCompare(text(locationOf(b))); break;
      case 'start_date':
        cmp = nullLast(!a.start_date, !b.start_date) || sign * (a.start_date ?? '').localeCompare(b.start_date ?? ''); break;
      case 'budget':
        cmp = nullLast(a.budget == null, b.budget == null) || sign * ((a.budget ?? 0) - (b.budget ?? 0)); break;
      case 'status':
        cmp = sign * (PHASE_META[exhibitionPhase(a, today)].order - PHASE_META[exhibitionPhase(b, today)].order); break;
    }
    return cmp || smartCompare(a, b, today);
  });
}

// ---- Filtering --------------------------------------------------------------

export interface ExhibitionListFilters {
  type?: string | null;
  phases?: readonly ExhibitionPhase[];
  year?: number | null;
  search?: string;
}

const yearOf = (date: string | null) => (date ? Number(date.slice(0, 4)) : null);

/** True when the exhibition touches the given calendar year. */
export function inYear(ex: Pick<ExhibitionRow, 'start_date' | 'end_date'>, year: number): boolean {
  const sy = yearOf(ex.start_date);
  const ey = yearOf(ex.end_date);
  if (sy === null && ey === null) return false;
  const from = sy ?? ey as number;
  const to   = ey ?? sy as number;
  return from <= year && year <= to;
}

/** Distinct years present in the list, newest first. */
export function exhibitionYears(list: readonly ExhibitionRow[]): number[] {
  const years = new Set<number>();
  for (const ex of list) {
    const sy = yearOf(ex.start_date);
    const ey = yearOf(ex.end_date);
    if (sy !== null) years.add(sy);
    if (ey !== null) years.add(ey);
  }
  return [...years].sort((a, b) => b - a);
}

export function matchesSearch(ex: ExhibitionRow, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const hay = [ex.title, ex.venue, ex.city, ex.country, ex.catalogue_reference, ex.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((term) => hay.includes(term));
}

export function filterExhibitions(
  list: readonly ExhibitionRow[],
  f: ExhibitionListFilters,
  today = todayLocal(),
): ExhibitionRow[] {
  return list.filter((ex) => {
    if (f.type && ex.type !== f.type) return false;
    if (f.year != null && !inYear(ex, f.year)) return false;
    if (f.phases && f.phases.length > 0 && !f.phases.includes(exhibitionPhase(ex, today))) return false;
    if (f.search && !matchesSearch(ex, f.search)) return false;
    return true;
  });
}

/** Phase → count, over the given rows. */
export function countByPhase(list: readonly ExhibitionRow[], today = todayLocal()): Record<ExhibitionPhase, number> {
  const counts = Object.fromEntries(PHASES.map((p) => [p, 0])) as Record<ExhibitionPhase, number>;
  for (const ex of list) counts[exhibitionPhase(ex, today)]++;
  return counts;
}
