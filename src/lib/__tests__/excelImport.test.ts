import { describe, it, expect } from 'vitest';
import { parseCsvText } from '../excelImport';

describe('parseCsvText', () => {
  it('parses headers and typed rows', () => {
    const { headers, rows } = parseCsvText('title,year,price\nAdam,2026,12000\nEve,2025,9500.5\n');
    expect(headers).toEqual(['title', 'year', 'price']);
    expect(rows).toEqual([
      { title: 'Adam', year: 2026, price: 12000 },
      { title: 'Eve', year: 2025, price: 9500.5 },
    ]);
  });

  it('handles quoted fields with commas, newlines and escaped quotes', () => {
    const { rows } = parseCsvText('title,notes\n"Adam, No. 1","He said ""hi""\nsecond line"\n');
    expect(rows[0].title).toBe('Adam, No. 1');
    expect(rows[0].notes).toBe('He said "hi"\nsecond line');
  });

  it('treats empty cells as null', () => {
    const { rows } = parseCsvText('a,b\n1,\n');
    expect(rows[0]).toEqual({ a: 1, b: null });
  });

  it('supports CRLF line endings', () => {
    const { rows } = parseCsvText('a,b\r\n1,2\r\n');
    expect(rows).toEqual([{ a: 1, b: 2 }]);
  });

  it('skips fully empty lines', () => {
    const { rows } = parseCsvText('a\n1\n\n2\n');
    expect(rows).toHaveLength(2);
  });

  it('does not coerce reference codes with letters into numbers', () => {
    const { rows } = parseCsvText('code\nNOA-SB-2026-J6Y9\n');
    expect(rows[0].code).toBe('NOA-SB-2026-J6Y9');
  });

  it('throws on empty input', () => {
    expect(() => parseCsvText('')).toThrow();
  });
});
