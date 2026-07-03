import { describe, it, expect } from 'vitest';
import { formatCurrency, sanitizeFilterTerm, sanitizeStoragePath } from '../utils';

describe('formatCurrency', () => {
  it('formats CHF with Swiss locale', () => {
    const out = formatCurrency(1234.5, 'CHF');
    expect(out).toContain('CHF');
    // de-CH thousands separator; amounts are rounded to whole francs
    expect(out).toMatch(/1['’]235/);
  });

  it('formats EUR/USD with en-US locale', () => {
    expect(formatCurrency(1000, 'EUR')).toContain('€');
    expect(formatCurrency(1000, 'USD')).toContain('$');
  });
});

describe('sanitizeFilterTerm', () => {
  it('strips PostgREST filter metacharacters', () => {
    expect(sanitizeFilterTerm('a,b(c)d%e_f.g\\h')).toBe('abcdefgh');
  });

  it('trims whitespace and keeps normal text', () => {
    expect(sanitizeFilterTerm('  Zaha Hadid  ')).toBe('Zaha Hadid');
  });

  it('neutralises or-injection attempts', () => {
    expect(sanitizeFilterTerm('x),id.eq.1,(y')).toBe('xideq1y');
  });
});

describe('sanitizeStoragePath', () => {
  it('replaces unsafe characters and lowercases the extension', () => {
    expect(sanitizeStoragePath('Über Käufer (2024).JPG')).toBe('Uber_Kaufer_2024.jpg');
  });

  it('collapses repeated underscores and trims edge underscores', () => {
    expect(sanitizeStoragePath('__a  b__.png')).toBe('a_b.png');
  });

  it('falls back to "file" when nothing safe remains', () => {
    expect(sanitizeStoragePath('***.pdf')).toBe('file.pdf');
  });

  it('keeps dotless names intact', () => {
    expect(sanitizeStoragePath('README')).toBe('README');
  });
});
