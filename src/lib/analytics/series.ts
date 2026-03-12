// ---------------------------------------------------------------------------
// Series performance calculations
// ---------------------------------------------------------------------------

export interface SeriesPerformance {
  series: string;
  totalProduced: number;
  totalSold: number;
  sellThrough: number;
  totalRevenue: number;
  avgPrice: number;
  avgDaysToSale: number | null;
}

/**
 * Compute per-series performance metrics.
 */
export function computeSeriesPerformance(
  artworks: { series: string | null; status: string; price: number | null; currency: string }[],
  sales: { series: string | null; sale_price: number; currency: string; daysToSale?: number }[],
  toCHF: (amount: number, currency: string) => number,
): SeriesPerformance[] {
  const seriesMap = new Map<string, {
    produced: number;
    sold: number;
    revenue: number;
    daysSum: number;
    daysCount: number;
  }>();

  const ensure = (s: string) => {
    if (!seriesMap.has(s)) {
      seriesMap.set(s, { produced: 0, sold: 0, revenue: 0, daysSum: 0, daysCount: 0 });
    }
    return seriesMap.get(s)!;
  };

  // Count artworks per series
  for (const a of artworks) {
    const s = a.series || 'Other';
    const data = ensure(s);
    data.produced += 1;
  }

  // Aggregate sales per series
  for (const sale of sales) {
    const s = sale.series || 'Other';
    const data = ensure(s);
    data.sold += 1;
    data.revenue += toCHF(sale.sale_price, sale.currency);
    if (sale.daysToSale != null) {
      data.daysSum += sale.daysToSale;
      data.daysCount += 1;
    }
  }

  return Array.from(seriesMap.entries()).map(([series, d]) => ({
    series,
    totalProduced: d.produced,
    totalSold: d.sold,
    sellThrough: d.produced > 0 ? (d.sold / d.produced) * 100 : 0,
    totalRevenue: d.revenue,
    avgPrice: d.sold > 0 ? d.revenue / d.sold : 0,
    avgDaysToSale: d.daysCount > 0 ? Math.round(d.daysSum / d.daysCount) : null,
  }));
}
