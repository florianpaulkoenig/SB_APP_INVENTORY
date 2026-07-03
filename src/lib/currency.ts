// ---------------------------------------------------------------------------
// Pure currency conversion — extracted from useExchangeRates so the money
// math is unit-testable. Rates are expressed as units of currency per 1 CHF
// (exchangerate-api.com with base=CHF).
// ---------------------------------------------------------------------------

export const FALLBACK_RATES: Record<string, number> = {
  CHF: 1,
  EUR: 0.94,
  USD: 0.88,
  GBP: 1.12,
};

/**
 * Convert an amount from a given currency to CHF.
 *
 * - amount 0 / NaN → 0
 * - missing/empty currency → treated as EUR (historical data default)
 * - unknown currency → returned unchanged (better than dropping the value)
 */
export function convertToCHF(
  amount: number,
  fromCurrency: string | null | undefined,
  rates: Record<string, number> | null,
): number {
  if (!amount || amount === 0) return 0;

  const cur = fromCurrency?.toUpperCase() || 'EUR';
  if (cur === 'CHF') return amount;

  const r = rates ?? FALLBACK_RATES;
  const rate = r[cur];

  // rate = how many units of `cur` per 1 CHF → CHF = amount / rate
  if (rate && rate > 0) {
    return amount / rate;
  }

  return amount;
}
