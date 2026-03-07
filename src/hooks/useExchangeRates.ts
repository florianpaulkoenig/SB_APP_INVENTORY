// ---------------------------------------------------------------------------
// useExchangeRates — fetches daily exchange rates and converts to CHF
// Uses exchangerate-api.com (free, no key required)
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';

// Module-level cache so we only fetch once per page load
let cachedRates: Record<string, number> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

// Fallback rates in case API is unreachable
const FALLBACK_RATES: Record<string, number> = {
  CHF: 1,
  EUR: 0.94,
  USD: 0.88,
  GBP: 1.12,
};

export interface ExchangeRates {
  /** Convert an amount from a given currency to CHF */
  toCHF: (amount: number, fromCurrency: string) => number;
  /** Whether rates are still loading */
  loading: boolean;
  /** Whether rates are available (loaded or fallback) */
  ready: boolean;
}

export function useExchangeRates(): ExchangeRates {
  const [rates, setRates] = useState<Record<string, number> | null>(cachedRates);
  const [loading, setLoading] = useState(!cachedRates);

  useEffect(() => {
    // Use cache if still valid
    if (cachedRates && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setRates(cachedRates);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchRates() {
      try {
        // Base = CHF → rates[X] = how many X per 1 CHF
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/CHF');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!cancelled && data?.rates) {
          cachedRates = data.rates;
          cacheTimestamp = Date.now();
          setRates(data.rates);
        }
      } catch {
        // API failed, use fallback rates
        if (!cancelled) {
          cachedRates = FALLBACK_RATES;
          cacheTimestamp = Date.now();
          setRates(FALLBACK_RATES);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRates();
    return () => { cancelled = true; };
  }, []);

  const toCHF = useCallback(
    (amount: number, fromCurrency: string): number => {
      if (!amount || amount === 0) return 0;

      const cur = fromCurrency?.toUpperCase() || 'EUR';
      if (cur === 'CHF') return amount;

      const r = rates ?? FALLBACK_RATES;
      const rate = r[cur];

      // rate = how many units of `cur` per 1 CHF
      // So to convert `amount` in `cur` to CHF: amount / rate
      if (rate && rate > 0) {
        return amount / rate;
      }

      // Unknown currency — return as-is
      return amount;
    },
    [rates],
  );

  return {
    toCHF,
    loading,
    ready: rates !== null,
  };
}
