import { describe, it, expect } from 'vitest';
import {
  exhibitionPhase, daysUntil, phaseHint, sortExhibitions, filterExhibitions,
  exhibitionYears, inYear, countByPhase,
} from '../exhibitionStatus';
import type { ExhibitionRow } from '../../types/database';

function ex(over: Partial<ExhibitionRow>): ExhibitionRow {
  return {
    id: 'x', user_id: 'u', title: 'Show', type: 'exhibition', venue: null, city: null, country: null,
    start_date: null, end_date: null, catalogue_reference: null, gallery_id: null, contact_id: null,
    budget: null, budget_currency: null, notes: null, description_text: null, created_at: '', updated_at: '',
    portfolio: 'simon_berger', pdf_settings: null, recurs_annually: false, recurrence_resolved_at: null,
    successor_id: null, status: 'confirmed', ...over,
  };
}

const today = '2026-10-05';

describe('exhibitionPhase', () => {
  it('derives upcoming / running / completed for confirmed exhibitions', () => {
    expect(exhibitionPhase(ex({ start_date: '2026-11-01', end_date: '2026-11-10' }), today)).toBe('upcoming');
    expect(exhibitionPhase(ex({ start_date: '2026-10-01', end_date: '2026-10-10' }), today)).toBe('running');
    expect(exhibitionPhase(ex({ start_date: '2026-10-05', end_date: '2026-10-05' }), today)).toBe('running');
    expect(exhibitionPhase(ex({ start_date: '2026-09-01', end_date: '2026-09-10' }), today)).toBe('completed');
  });
  it('treats a single-day exhibition (no end date) by its start date', () => {
    expect(exhibitionPhase(ex({ start_date: '2026-09-01' }), today)).toBe('completed');
    expect(exhibitionPhase(ex({ start_date: '2026-10-05' }), today)).toBe('running');
    expect(exhibitionPhase(ex({ start_date: '2026-12-01' }), today)).toBe('upcoming');
  });
  it('confirmed without dates counts as upcoming; missing status defaults to confirmed', () => {
    expect(exhibitionPhase(ex({}), today)).toBe('upcoming');
    expect(exhibitionPhase({ start_date: '2026-01-01', end_date: '2026-01-02' }, today)).toBe('completed');
  });
  it('non-confirmed statuses are their own phase regardless of dates', () => {
    expect(exhibitionPhase(ex({ status: 'idea', start_date: '2026-01-01', end_date: '2026-01-02' }), today)).toBe('idea');
    expect(exhibitionPhase(ex({ status: 'requested', start_date: '2026-10-01', end_date: '2026-10-10' }), today)).toBe('requested');
    expect(exhibitionPhase(ex({ status: 'cancelled', start_date: '2026-12-01' }), today)).toBe('cancelled');
    expect(exhibitionPhase(ex({ status: 'declined' }), today)).toBe('declined');
  });
});

describe('daysUntil / phaseHint', () => {
  it('counts whole days across a DST switch', () => {
    expect(daysUntil('2026-10-05', today)).toBe(0);
    expect(daysUntil('2026-10-06', today)).toBe(1);
    expect(daysUntil('2026-11-01', today)).toBe(27); // CEST → CET on 2026-10-25
    expect(daysUntil('2026-10-01', today)).toBe(-4);
  });
  it('phrases the hint by phase', () => {
    expect(phaseHint(ex({ start_date: '2026-10-06' }), today)).toBe('tomorrow');
    expect(phaseHint(ex({ start_date: '2026-10-17' }), today)).toBe('in 12 days');
    expect(phaseHint(ex({ start_date: '2027-03-01' }), today)).toBe('in 5 months');
    expect(phaseHint(ex({ start_date: '2026-10-01', end_date: '2026-10-05' }), today)).toBe('ends today');
    expect(phaseHint(ex({ start_date: '2026-10-01', end_date: '2026-10-09' }), today)).toBe('ends in 4 days');
    expect(phaseHint(ex({ start_date: '2026-09-01', end_date: '2026-09-02' }), today)).toBeNull();
    expect(phaseHint(ex({ status: 'idea', start_date: '2026-10-06' }), today)).toBeNull();
  });
});

describe('sortExhibitions', () => {
  const rows = [
    ex({ id: 'past-old',  start_date: '2025-03-01', end_date: '2025-03-05' }),
    ex({ id: 'past-new',  start_date: '2026-09-01', end_date: '2026-09-05' }),
    ex({ id: 'cancelled', status: 'cancelled', start_date: '2026-11-01' }),
    ex({ id: 'up-late',   start_date: '2027-02-01', end_date: '2027-02-05' }),
    ex({ id: 'up-soon',   start_date: '2026-10-20', end_date: '2026-10-25' }),
    ex({ id: 'running',   start_date: '2026-10-01', end_date: '2026-10-10' }),
    ex({ id: 'idea',      status: 'idea' }),
    ex({ id: 'requested', status: 'requested', start_date: '2027-06-01' }),
    ex({ id: 'declined',  status: 'declined', start_date: '2026-05-01' }),
  ];
  it('smart: running, upcoming soonest-first, planning, past latest-first, inactive last', () => {
    expect(sortExhibitions(rows, 'smart', 'asc', today).map((r) => r.id)).toEqual([
      'running', 'up-soon', 'up-late', 'requested', 'idea', 'past-new', 'past-old', 'cancelled', 'declined',
    ]);
  });
  it('column sort keeps undated rows at the bottom in both directions', () => {
    const asc  = sortExhibitions(rows, 'start_date', 'asc', today).map((r) => r.id);
    const desc = sortExhibitions(rows, 'start_date', 'desc', today).map((r) => r.id);
    expect(asc[0]).toBe('past-old');
    expect(asc[asc.length - 1]).toBe('idea');
    expect(desc[0]).toBe('requested');
    expect(desc[desc.length - 1]).toBe('idea');
  });
  it('sorts by title and budget', () => {
    const t = [ex({ id: 'b', title: 'Beta' }), ex({ id: 'a', title: 'alpha' })];
    expect(sortExhibitions(t, 'title', 'asc', today).map((r) => r.id)).toEqual(['a', 'b']);
    const b = [ex({ id: 'n', budget: null }), ex({ id: 'lo', budget: 100 }), ex({ id: 'hi', budget: 900 })];
    expect(sortExhibitions(b, 'budget', 'desc', today).map((r) => r.id)).toEqual(['hi', 'lo', 'n']);
    expect(sortExhibitions(b, 'budget', 'asc', today).map((r) => r.id)).toEqual(['lo', 'hi', 'n']);
  });
});

describe('filterExhibitions', () => {
  const rows = [
    ex({ id: 'fair', type: 'art_fair', title: 'Art Basel', city: 'Basel', start_date: '2026-06-10', end_date: '2026-06-14' }),
    ex({ id: 'ny',   type: 'solo_show', title: 'Light Studies', venue: 'Gallery X', city: 'New York', start_date: '2026-12-28', end_date: '2027-01-20' }),
    ex({ id: 'idea', type: 'exhibition', title: 'Museum idea', status: 'idea', notes: 'Kunsthaus Zürich?' }),
  ];
  it('filters by type, phase, year and search', () => {
    expect(filterExhibitions(rows, { type: 'art_fair' }, today).map((r) => r.id)).toEqual(['fair']);
    expect(filterExhibitions(rows, { phases: ['upcoming'] }, today).map((r) => r.id)).toEqual(['ny']);
    expect(filterExhibitions(rows, { phases: ['idea', 'completed'] }, today).map((r) => r.id)).toEqual(['fair', 'idea']);
    expect(filterExhibitions(rows, { year: 2027 }, today).map((r) => r.id)).toEqual(['ny']);
    expect(filterExhibitions(rows, { year: 2026 }, today).map((r) => r.id)).toEqual(['fair', 'ny']);
    expect(filterExhibitions(rows, { search: 'new york' }, today).map((r) => r.id)).toEqual(['ny']);
    expect(filterExhibitions(rows, { search: 'zürich' }, today).map((r) => r.id)).toEqual(['idea']);
    expect(filterExhibitions(rows, { search: 'gallery light' }, today).map((r) => r.id)).toEqual(['ny']);
  });
  it('year spans the full date range; undated rows never match a year', () => {
    expect(inYear({ start_date: '2026-12-28', end_date: '2027-01-20' }, 2026)).toBe(true);
    expect(inYear({ start_date: '2026-12-28', end_date: '2027-01-20' }, 2027)).toBe(true);
    expect(inYear({ start_date: null, end_date: null }, 2026)).toBe(false);
    expect(exhibitionYears(rows)).toEqual([2027, 2026]);
  });
  it('counts by phase', () => {
    const c = countByPhase(rows, today);
    expect(c.completed).toBe(1);
    expect(c.upcoming).toBe(1);
    expect(c.idea).toBe(1);
    expect(c.running).toBe(0);
  });
});
