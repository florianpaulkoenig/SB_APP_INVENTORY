import { describe, expect, it } from 'vitest';
import { alignZero, niceCeil } from '../chartAxis';

/** Where zero sits within the domain, 0 = bottom … 1 = top */
function zeroFraction([min, max]: [number, number]): number {
  return (0 - min) / (max - min);
}

function covers([min, max]: [number, number], values: number[]): boolean {
  return values.every((v) => v >= min - 1e-9 && v <= max + 1e-9);
}

describe('niceCeil', () => {
  it('rounds up to 1/2/2.5/5 × 10ⁿ', () => {
    expect(niceCeil(1)).toBe(1);
    expect(niceCeil(1.2)).toBe(2);
    expect(niceCeil(2.4)).toBe(2.5);
    expect(niceCeil(35_774)).toBe(50_000);
    expect(niceCeil(88_698)).toBe(100_000);
  });

  it('never returns zero or a negative step', () => {
    expect(niceCeil(0)).toBeGreaterThan(0);
    expect(niceCeil(-5)).toBeGreaterThan(0);
    expect(niceCeil(NaN)).toBeGreaterThan(0);
  });
});

describe('alignZero', () => {
  const cases: [string, number[], number[]][] = [
    ['mixed profit, positive saldo',  [-71_547, 59_900, -12_000], [266_095, 35_618, 60_000]],
    ['both sides positive',           [5_000, 12_000],            [100_000, 250_000]],
    ['saldo turns negative',          [-71_547, 59_900],          [-50_000, 120_000]],
    ['profit only negative',          [-5_000, -12_000],          [100_000, 250_000]],
    ['everything negative',           [-3_000, -50_000],          [-20_000, -400_000]],
    ['small numbers',                 [12, -8],                   [400, 900]],
    ['single month',                  [0],                        [42_000]],
  ];

  it.each(cases)('%s: puts both zeros on the same row', (_name, left, right) => {
    const { left: l, right: r } = alignZero(left, right);
    expect(zeroFraction(l.domain)).toBeCloseTo(zeroFraction(r.domain), 10);
  });

  it.each(cases)('%s: keeps all data inside the domain', (_name, left, right) => {
    const { left: l, right: r } = alignZero(left, right);
    expect(covers(l.domain, left)).toBe(true);
    expect(covers(r.domain, right)).toBe(true);
  });

  it.each(cases)('%s: emits ticks spanning the domain, including zero', (_name, left, right) => {
    for (const axis of Object.values(alignZero(left, right))) {
      expect(axis.ticks[0]).toBe(axis.domain[0]);
      expect(axis.ticks[axis.ticks.length - 1]).toBe(axis.domain[1]);
      expect(axis.ticks).toContain(0);
      expect(axis.ticks.length).toBeLessThanOrEqual(8);
    }
  });

  it('ignores non-finite values such as missing Ist-Saldo', () => {
    const { right } = alignZero([100, -100], [50_000, NaN, 20_000]);
    expect(right.domain[1]).toBeGreaterThanOrEqual(50_000);
    expect(Number.isFinite(right.domain[0])).toBe(true);
  });

  it('survives all-zero data', () => {
    const { left, right } = alignZero([0, 0], [0, 0]);
    expect(left.domain[1]).toBeGreaterThan(left.domain[0]);
    expect(right.domain[1]).toBeGreaterThan(right.domain[0]);
  });

  it('does not waste the plot on a positive saldo when profit is mixed', () => {
    // Regression: the Saldo line has to sit above the zero line while it is positive
    const { right } = alignZero([-71_547, 59_900], [266_095, 35_618]);
    expect(right.domain[1]).toBeGreaterThanOrEqual(266_095);
    expect(zeroFraction(right.domain)).toBeGreaterThan(0);
    expect(zeroFraction(right.domain)).toBeLessThan(1);
  });
});
