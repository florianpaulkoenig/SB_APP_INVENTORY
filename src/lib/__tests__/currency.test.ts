import { describe, it, expect } from 'vitest';
import { convertToCHF, FALLBACK_RATES } from '../currency';

// Rates are "units of currency per 1 CHF" (base = CHF)
const RATES = { CHF: 1, EUR: 0.94, USD: 0.88, GBP: 1.12 };

describe('convertToCHF', () => {
  it('returns CHF amounts unchanged', () => {
    expect(convertToCHF(1000, 'CHF', RATES)).toBe(1000);
  });

  it('converts EUR to CHF by dividing by the rate', () => {
    expect(convertToCHF(940, 'EUR', RATES)).toBeCloseTo(1000, 6);
  });

  it('converts USD to CHF', () => {
    expect(convertToCHF(880, 'USD', RATES)).toBeCloseTo(1000, 6);
  });

  it('is case-insensitive on the currency code', () => {
    expect(convertToCHF(940, 'eur', RATES)).toBeCloseTo(1000, 6);
  });

  it('treats missing currency as EUR (historical data default)', () => {
    expect(convertToCHF(940, null, RATES)).toBeCloseTo(1000, 6);
    expect(convertToCHF(940, undefined, RATES)).toBeCloseTo(1000, 6);
    expect(convertToCHF(940, '', RATES)).toBeCloseTo(1000, 6);
  });

  it('returns 0 for zero/NaN amounts', () => {
    expect(convertToCHF(0, 'EUR', RATES)).toBe(0);
    expect(convertToCHF(NaN, 'EUR', RATES)).toBe(0);
  });

  it('returns the amount unchanged for unknown currencies', () => {
    expect(convertToCHF(500, 'JPY', RATES)).toBe(500);
  });

  it('falls back to FALLBACK_RATES when rates are null', () => {
    expect(convertToCHF(94, 'EUR', null)).toBeCloseTo(94 / FALLBACK_RATES.EUR, 6);
  });

  it('handles negative amounts (refunds) symmetrically', () => {
    expect(convertToCHF(-940, 'EUR', RATES)).toBeCloseTo(-1000, 6);
  });
});
