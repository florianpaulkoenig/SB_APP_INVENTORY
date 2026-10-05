import { describe, it, expect } from 'vitest';
import { pendingRecurrences, shiftYear, shiftTitleYear } from '../recurringFair';
import type { ExhibitionRow } from '../../types/database';

function ex(over: Partial<ExhibitionRow>): ExhibitionRow {
  return {
    id: 'x', user_id: 'u', title: 'Fair', type: 'art_fair', venue: null, city: null, country: null,
    start_date: null, end_date: null, catalogue_reference: null, gallery_id: null, contact_id: null,
    budget: null, budget_currency: null, notes: null, description_text: null, created_at: '', updated_at: '',
    portfolio: 'simon_berger', pdf_settings: null, recurs_annually: false, recurrence_resolved_at: null,
    successor_id: null, status: 'confirmed', ...over,
  };
}

describe('pendingRecurrences', () => {
  const today = '2026-10-01';
  it('returns only recurring, ended, unanswered editions — oldest first', () => {
    const rows = [
      ex({ id: 'a', recurs_annually: true, end_date: '2026-09-20' }),
      ex({ id: 'b', recurs_annually: true, end_date: '2026-06-01' }),
      ex({ id: 'future', recurs_annually: true, end_date: '2026-12-01' }),
      ex({ id: 'today', recurs_annually: true, end_date: today }),
      ex({ id: 'answered', recurs_annually: true, end_date: '2026-01-01', recurrence_resolved_at: '2026-01-02T00:00:00Z' }),
      ex({ id: 'oneoff', recurs_annually: false, end_date: '2026-01-01' }),
      ex({ id: 'nodate', recurs_annually: true, end_date: null }),
    ];
    expect(pendingRecurrences(rows, today).map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('shiftYear / shiftTitleYear', () => {
  it('moves a date one calendar year ahead without timezone drift', () => {
    expect(shiftYear('2026-03-15')).toBe('2027-03-15');
    expect(shiftYear('2026-01-01')).toBe('2027-01-01');
    expect(shiftYear(null)).toBe('');
  });
  it('bumps the year inside the title only when present', () => {
    expect(shiftTitleYear('Art Basel 2026', 2026)).toBe('Art Basel 2027');
    expect(shiftTitleYear('Art Basel', 2026)).toBe('Art Basel');
  });
});
