// ---------------------------------------------------------------------------
// Shared Y-axis maths for dual-axis charts
// ---------------------------------------------------------------------------

/** Smallest "nice" number (1/2/2.5/5 × 10ⁿ) that is >= v — used as tick step */
export function niceCeil(v: number): number {
  if (!(v > 0)) return 1;
  const mag  = 10 ** Math.floor(Math.log10(v));
  const norm = v / mag;
  const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return mult * mag;
}

export interface AxisScale {
  domain: [number, number];
  ticks:  number[];
}

/**
 * Domains + ticks for the two Y axes so that both put zero on the same pixel
 * row. Without this the axes scale independently and a positive Saldo can end
 * up drawn below the chart's zero line, right next to a negative profit bar.
 *
 * Both axes get the same number of tick intervals above and below zero (that
 * is what pins the zeros together) but their own nice step size. The split is
 * picked by a small search: how snugly each axis fills the sides it has data
 * on, how much of its domain the data spans, and a mild penalty for many ticks.
 */
export function alignZero(left: number[], right: number[]): { left: AxisScale; right: AxisScale } {
  const bounds = (values: number[]) => {
    const clean = values.filter((n) => Number.isFinite(n));
    return { min: Math.min(0, ...clean), max: Math.max(0, ...clean) };
  };
  const l = bounds(left);
  const r = bounds(right);

  const scale = (step: number, pos: number, neg: number): AxisScale => ({
    // `|| 0` keeps a -0 out of the domain when there is no negative side
    domain: [-neg * step || 0, pos * step || 0],
    ticks:  Array.from({ length: pos + neg + 1 }, (_, i) => (i - neg) * step || 0),
  });

  // Degenerate (no data / all zero) — a flat 0…1 axis
  if (l.min === 0 && l.max === 0 && r.min === 0 && r.max === 0) {
    return { left: scale(1, 1, 0), right: scale(1, 1, 0) };
  }

  const stepFor = (b: { min: number; max: number }, pos: number, neg: number) =>
    niceCeil(Math.max(pos > 0 ? b.max / pos : 0, neg > 0 ? -b.min / neg : 0));
  // Sides without data are not counted — that half of the plot belongs to the
  // other axis anyway.
  const misfit = (b: { min: number; max: number }, step: number, pos: number, neg: number) => Math.max(
    b.max > 0 ? (pos * step) / b.max  : 0,
    b.min < 0 ? (neg * step) / -b.min : 0,
  );
  const spread = (b: { min: number; max: number }, step: number, pos: number, neg: number) => {
    const dataSpan = b.max - b.min;
    return dataSpan > 0 ? ((pos + neg) * step) / dataSpan : 0;
  };

  let best = { score: Infinity, pos: 1, neg: 0, stepL: 1, stepR: 1 };
  for (let pos = 0; pos <= 6; pos++) {
    for (let neg = 0; pos + neg <= 7; neg++) {
      if (pos + neg === 0) continue;
      if (pos === 0 && (l.max > 0 || r.max > 0)) continue; // would clip positives
      if (neg === 0 && (l.min < 0 || r.min < 0)) continue; // would clip negatives
      const stepL = stepFor(l, pos, neg);
      const stepR = stepFor(r, pos, neg);
      const score = Math.max(misfit(l, stepL, pos, neg), misfit(r, stepR, pos, neg))
        + 0.25 * Math.max(spread(l, stepL, pos, neg), spread(r, stepR, pos, neg))
        + 0.05 * (pos + neg);
      if (score < best.score) best = { score, pos, neg, stepL, stepR };
    }
  }

  return {
    left:  scale(best.stepL, best.pos, best.neg),
    right: scale(best.stepR, best.pos, best.neg),
  };
}
