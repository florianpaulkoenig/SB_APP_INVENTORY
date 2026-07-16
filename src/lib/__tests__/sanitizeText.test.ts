import { describe, it, expect } from 'vitest';
import { cleanString, deepClean } from '../sanitizeText';

describe('cleanString', () => {
  it('strips NULL bytes and control characters', () => {
    expect(cleanString('Hello\u0000World\u0001!')).toBe('HelloWorld!');
  });

  it('keeps tabs, newlines and carriage returns', () => {
    expect(cleanString('line1\nline2\tend\r\n')).toBe('line1\nline2\tend\r\n');
  });

  it('strips zero-width characters and BOM', () => {
    expect(cleanString('Zero\u200Bwidth\u200D\uFEFFtext')).toBe('Zerowidthtext');
  });

  it('normalizes unicode line separators to newline', () => {
    expect(cleanString('para1\u2028para2\u2029para3')).toBe('para1\npara2\npara3');
  });

  it('converts non-breaking spaces to regular spaces', () => {
    expect(cleanString('CHF\u00A01000')).toBe('CHF 1000');
  });

  it('removes lone surrogates but keeps valid emoji', () => {
    expect(cleanString('ok 🎨 art')).toBe('ok 🎨 art');
    expect(cleanString('broken\uD800end')).toBe('brokenend');
    expect(cleanString('broken\uDC00end')).toBe('brokenend');
  });

  it('keeps umlauts, accents and CJK untouched', () => {
    expect(cleanString('Zürich — Genève 東京')).toBe('Zürich — Genève 東京');
  });
});

describe('deepClean', () => {
  it('cleans strings nested in objects and arrays', () => {
    const input = {
      title: 'Bad\u0000Title',
      tags: ['a\u200Bb', 'ok'],
      nested: { notes: 'x\u2028y' },
      price: 100,
      flag: true,
      empty: null,
    };
    expect(deepClean(input)).toEqual({
      title: 'BadTitle',
      tags: ['ab', 'ok'],
      nested: { notes: 'x\ny' },
      price: 100,
      flag: true,
      empty: null,
    });
  });

  it('passes non-string primitives through unchanged', () => {
    expect(deepClean(42)).toBe(42);
    expect(deepClean(null)).toBe(null);
    expect(deepClean(false)).toBe(false);
  });
});
