import { describe, it, expect } from 'vitest';
import { deriveCommissionRates, splitByCommission, DEFAULT_COMMISSION } from '../finance';

describe('deriveCommissionRates', () => {
  it('uses the explicit 3-way split when fully defined', () => {
    expect(
      deriveCommissionRates({ commission_gallery: 40, commission_noa: 35, commission_artist: 25 }),
    ).toEqual({ gallery: 40, noa: 35, artist: 25 });
  });

  it('explicit split wins over legacy commission_rate', () => {
    expect(
      deriveCommissionRates({
        commission_gallery: 40,
        commission_noa: 35,
        commission_artist: 25,
        commission_rate: 60,
      }),
    ).toEqual({ gallery: 40, noa: 35, artist: 25 });
  });

  it('derives from legacy commission_rate: gallery gets rate, remainder 50/50', () => {
    expect(deriveCommissionRates({ commission_rate: 60 })).toEqual({
      gallery: 60,
      noa: 20,
      artist: 20,
    });
  });

  it('returns null when no commission data exists (caller uses default)', () => {
    expect(deriveCommissionRates({})).toBeNull();
    expect(
      deriveCommissionRates({ commission_gallery: 40, commission_noa: null, commission_artist: 25 }),
    ).toBeNull();
  });
});

describe('splitByCommission', () => {
  it('applies the default 50/25/25 split when rates are missing', () => {
    const split = splitByCommission(1000, null);
    expect(split.gallery).toBeCloseTo(500);
    expect(split.noa).toBeCloseTo(250);
    expect(split.artist).toBeCloseTo(250);
    expect(split.total).toBe(1000);
  });

  it('distributes the full amount even when rates do not sum to 100', () => {
    const split = splitByCommission(900, { gallery: 1, noa: 1, artist: 1 });
    expect(split.gallery).toBeCloseTo(300);
    expect(split.noa).toBeCloseTo(300);
    expect(split.artist).toBeCloseTo(300);
    expect(split.gallery + split.noa + split.artist).toBeCloseTo(900, 6);
  });

  it('the three shares always sum to the total (no money lost to rounding)', () => {
    const split = splitByCommission(1234.56, { gallery: 47, noa: 33, artist: 20 });
    expect(split.gallery + split.noa + split.artist).toBeCloseTo(1234.56, 6);
  });

  it('default constant is 50/25/25', () => {
    expect(DEFAULT_COMMISSION).toEqual({ gallery: 50, noa: 25, artist: 25 });
  });
});
