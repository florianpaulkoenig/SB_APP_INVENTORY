import { useState, createElement } from 'react';
import { useMonthlyReport } from '../../hooks/useMonthlyReport';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatCurrency, formatDate, downloadBlob } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

// ---------------------------------------------------------------------------
// Summary Card
// ---------------------------------------------------------------------------

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-primary-100 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-primary-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-primary-500">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function MonthlyReportPage() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [downloading, setDownloading] = useState(false);

  const { data, loading } = useMonthlyReport(year, month);

  const monthLabel = MONTH_OPTIONS.find((m) => m.value === String(month))?.label ?? '';

  // ---- PDF export -----------------------------------------------------------

  async function handleExportPDF() {
    if (!data) return;
    setDownloading(true);

    try {
      const [{ pdf: pdfRenderer }, { MonthlyReportPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../../components/pdf/MonthlyReportPDF'),
      ]);

      const blob = await pdfRenderer(
        createElement(MonthlyReportPDF, {
          year,
          month,
          monthLabel,
          data,
        }),
      ).toBlob();

      downloadBlob(blob, `NOA_Monthly_Report_${year}_${String(month).padStart(2, '0')}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">Monthly Report</h1>
          <p className="mt-1 text-sm text-primary-500">
            Overview for {monthLabel} {year}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-36">
            <Select
              options={MONTH_OPTIONS}
              value={String(month)}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
          </div>
          <div className="w-24">
            <Select
              options={YEAR_OPTIONS}
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <Button onClick={handleExportPDF} disabled={downloading || !data} variant="outline">
            {downloading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            Export PDF
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary Cards */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard label="Artworks Sold" value={data.salesCount} />
            <SummaryCard label="Revenue" value={formatCurrency(data.totalRevenueCHF, 'CHF')} />
            <SummaryCard label="Artworks Created" value={data.artworksCreatedCount} />
            <SummaryCard label="Production Orders" value={data.productionOrdersCount} />
          </div>

          {/* Secondary metrics */}
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <SummaryCard label="Artworks Edited" value={data.artworksEditedCount} />
            <SummaryCard label="Forwarding Orders" value={data.forwardingOrdersCount} />
            <SummaryCard label="Certificates" value={data.certificatesCount} />
            <SummaryCard label="Expenses" value={formatCurrency(data.totalExpensesCHF, 'CHF')} />
            <SummaryCard
              label="Net"
              value={formatCurrency(data.totalRevenueCHF - data.totalExpensesCHF, 'CHF')}
            />
          </div>

          {/* Sales Table */}
          {data.sales.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-display text-base font-semibold text-primary-900">
                Sales ({data.sales.length})
              </h2>
              <div className="overflow-x-auto rounded-lg border border-primary-100">
                <table className="min-w-full divide-y divide-primary-100">
                  <thead className="bg-primary-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Artwork</th>
                      <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Gallery</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-50 bg-white">
                    {data.sales.map((sale) => (
                      <tr key={sale.id}>
                        <td className="px-4 py-3 text-sm text-primary-800">
                          {sale.artworks?.title ?? '—'}
                          <span className="ml-1 font-mono text-xs text-primary-400">{sale.artworks?.reference_code}</span>
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-sm text-accent">{sale.galleries?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-primary-600">{formatDate(sale.sale_date)}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-primary-800">{formatCurrency(sale.sale_price, sale.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* New Artworks */}
          {data.artworksCreated.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-display text-base font-semibold text-primary-900">
                New Artworks ({data.artworksCreated.length})
              </h2>
              <div className="overflow-x-auto rounded-lg border border-primary-100">
                <table className="min-w-full divide-y divide-primary-100">
                  <thead className="bg-primary-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Title</th>
                      <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Medium</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-50 bg-white">
                    {data.artworksCreated.map((artwork) => (
                      <tr key={artwork.id}>
                        <td className="px-4 py-3 text-sm font-mono text-primary-600">{artwork.reference_code}</td>
                        <td className="px-4 py-3 text-sm text-primary-800">{artwork.title}</td>
                        <td className="hidden sm:table-cell px-4 py-3 text-sm text-primary-600">{artwork.medium ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-primary-600">{formatDate(artwork.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Production Orders */}
          {data.productionOrders.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-display text-base font-semibold text-primary-900">
                Production Orders ({data.productionOrders.length})
              </h2>
              <div className="overflow-x-auto rounded-lg border border-primary-100">
                <table className="min-w-full divide-y divide-primary-100">
                  <thead className="bg-primary-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Order #</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-50 bg-white">
                    {data.productionOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-4 py-3 text-sm font-mono text-primary-600">{order.order_number}</td>
                        <td className="px-4 py-3 text-sm text-primary-800">{order.title}</td>
                        <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                        <td className="px-4 py-3 text-sm text-primary-600">{formatDate(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Expenses by Category */}
          {Object.keys(data.expensesByCategory).length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 font-display text-base font-semibold text-primary-900">
                Expenses by Category
              </h2>
              <div className="overflow-x-auto rounded-lg border border-primary-100">
                <table className="min-w-full divide-y divide-primary-100">
                  <thead className="bg-primary-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-50 bg-white">
                    {Object.entries(data.expensesByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount]) => (
                        <tr key={category}>
                          <td className="px-4 py-3 text-sm text-primary-800 capitalize">{category.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-primary-800">{formatCurrency(amount, 'CHF')}</td>
                        </tr>
                      ))}
                    <tr className="border-t-2 border-primary-200">
                      <td className="px-4 py-3 text-sm font-semibold text-primary-900">Total</td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-primary-900">{formatCurrency(data.totalExpensesCHF, 'CHF')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
