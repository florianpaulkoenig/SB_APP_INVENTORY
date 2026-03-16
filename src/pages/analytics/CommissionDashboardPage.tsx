// ---------------------------------------------------------------------------
// NOA Inventory -- Commission Transparency Dashboard
// Per-gallery commission splits, payment status, and revenue breakdown
// ---------------------------------------------------------------------------

import { useState, useMemo } from 'react';
import { useCommissionTransparency } from '../../hooks/useCommissionTransparency';
import type { GalleryCommissionSummary } from '../../hooks/useCommissionTransparency';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function paymentStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'paid':
      return <Badge variant="success">Paid</Badge>;
    case 'overdue':
      return <Badge variant="danger">Overdue</Badge>;
    case 'pending':
    default:
      return <Badge variant="warning">Pending</Badge>;
  }
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function commissionRateLabel(gallery: GalleryCommissionSummary): string {
  if (gallery.commissionGallery != null && gallery.commissionNoa != null && gallery.commissionArtist != null) {
    return `${gallery.commissionGallery}/${gallery.commissionNoa}/${gallery.commissionArtist}`;
  }
  if (gallery.defaultCommissionRate != null) {
    return `${gallery.defaultCommissionRate}%`;
  }
  return '50/25/25 (default)';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CommissionDashboardPage() {
  const { data, loading } = useCommissionTransparency();
  const [expandedGallery, setExpandedGallery] = useState<string | null>(null);
  const [galleryFilter, setGalleryFilter] = useState('');

  const filteredGalleries = useMemo(() => {
    if (!data) return [];
    if (!galleryFilter) return data.galleries;
    const q = galleryFilter.toLowerCase();
    return data.galleries.filter(
      (g) => g.galleryName.toLowerCase().includes(q) || (g.country ?? '').toLowerCase().includes(q),
    );
  }, [data, galleryFilter]);

  const toggleGallery = (galleryId: string) => {
    setExpandedGallery((prev) => (prev === galleryId ? null : galleryId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data || data.galleries.length === 0) {
    return (
      <div className="py-20 text-center text-primary-500">
        No commission data available.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-primary-900">
          Commission Transparency
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Per-gallery commission splits, payment tracking, and revenue breakdown.
        </p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <KpiBox label="Total Revenue" value={formatCurrency(data.totalRevenue, 'CHF')} />
        <KpiBox label="Gallery Commissions" value={formatCurrency(data.totalGalleryCommissions, 'CHF')} color="text-blue-600" />
        <KpiBox label="NOA Revenue" value={formatCurrency(data.totalNoaRevenue, 'CHF')} color="text-emerald-600" />
        <KpiBox label="Artist Revenue" value={formatCurrency(data.totalArtistRevenue, 'CHF')} color="text-violet-600" />
        <KpiBox label="Outstanding" value={formatCurrency(data.totalOutstanding, 'CHF')} color="text-amber-600" />
      </div>

      {/* Gallery Filter */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Filter by gallery name or country..."
          value={galleryFilter}
          onChange={(e) => setGalleryFilter(e.target.value)}
          className="w-full max-w-md rounded-lg border border-primary-200 px-4 py-2 text-sm text-primary-900 placeholder-primary-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
      </div>

      {/* Per-Gallery Expandable Sections */}
      <div className="space-y-4">
        {filteredGalleries.map((gallery) => {
          const isExpanded = expandedGallery === gallery.galleryId;
          const outstandingPct = gallery.totalRevenue > 0
            ? (gallery.outstandingAmount / gallery.totalRevenue) * 100
            : 0;

          return (
            <Card key={gallery.galleryId} className="overflow-hidden">
              {/* Gallery Header (clickable) */}
              <button
                onClick={() => toggleGallery(gallery.galleryId)}
                className="w-full px-6 py-4 text-left hover:bg-primary-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg
                      className={`h-4 w-4 text-primary-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <div>
                      <span className="font-display text-lg font-semibold text-primary-900">
                        {gallery.galleryName}
                      </span>
                      {gallery.country && (
                        <span className="ml-2 text-sm text-primary-500">{gallery.country}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <span className="text-xs uppercase tracking-wider text-primary-500">Commission Rate</span>
                      <p className="font-medium text-primary-900">{commissionRateLabel(gallery)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs uppercase tracking-wider text-primary-500">Revenue</span>
                      <p className="font-medium text-primary-900">{formatCurrency(gallery.totalRevenue, 'CHF')}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs uppercase tracking-wider text-primary-500">Sales</span>
                      <p className="font-medium text-primary-900">{gallery.totalSales}</p>
                    </div>
                    {gallery.outstandingAmount > 0 && (
                      <Badge variant="warning">{formatCurrency(gallery.outstandingAmount, 'CHF')} outstanding</Badge>
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-primary-100 px-6 py-4">
                  {/* Commission Summary */}
                  <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
                    <div className="rounded-lg bg-primary-50 p-3 text-center">
                      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">Total Revenue</p>
                      <p className="mt-1 text-lg font-bold text-primary-900">{formatCurrency(gallery.totalRevenue, 'CHF')}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-3 text-center">
                      <p className="text-xs font-medium uppercase tracking-wider text-blue-600">Gallery Commission</p>
                      <p className="mt-1 text-lg font-bold text-blue-700">{formatCurrency(gallery.totalGalleryCommission, 'CHF')}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-3 text-center">
                      <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">NOA Share</p>
                      <p className="mt-1 text-lg font-bold text-emerald-700">{formatCurrency(gallery.totalNoaCommission, 'CHF')}</p>
                    </div>
                    <div className="rounded-lg bg-violet-50 p-3 text-center">
                      <p className="text-xs font-medium uppercase tracking-wider text-violet-600">Artist Share</p>
                      <p className="mt-1 text-lg font-bold text-violet-700">{formatCurrency(gallery.totalArtistCommission, 'CHF')}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-3 text-center">
                      <p className="text-xs font-medium uppercase tracking-wider text-amber-600">Outstanding</p>
                      <p className="mt-1 text-lg font-bold text-amber-700">{formatCurrency(gallery.outstandingAmount, 'CHF')}</p>
                      {outstandingPct > 0 && (
                        <p className="text-xs text-amber-500">{formatPercent(outstandingPct)} of revenue</p>
                      )}
                    </div>
                  </div>

                  {/* Paid vs Outstanding Bar */}
                  {gallery.totalRevenue > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-primary-500 mb-1">
                        <span>Paid: {formatCurrency(gallery.paidAmount, 'CHF')}</span>
                        <span>Outstanding: {formatCurrency(gallery.outstandingAmount, 'CHF')}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-primary-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${(gallery.paidAmount / gallery.totalRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Sale Detail Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-primary-200 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                          <th className="pb-3 pr-4">Date</th>
                          <th className="pb-3 pr-4">Artwork</th>
                          <th className="pb-3 pr-4 text-right">Sale Price</th>
                          <th className="pb-3 pr-4 text-right">Gallery %</th>
                          <th className="pb-3 pr-4 text-right">Gallery Share</th>
                          <th className="pb-3 pr-4 text-right">NOA Share</th>
                          <th className="pb-3 pr-4 text-right">Artist Share</th>
                          <th className="pb-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gallery.sales.map((sale) => (
                          <tr key={sale.saleId} className="border-b border-primary-100 hover:bg-primary-50">
                            <td className="py-3 pr-4 text-primary-600 whitespace-nowrap">
                              {formatDate(sale.saleDate)}
                            </td>
                            <td className="py-3 pr-4 font-medium text-primary-900 max-w-[200px] truncate">
                              {sale.artworkTitle}
                            </td>
                            <td className="py-3 pr-4 text-right text-primary-700 whitespace-nowrap">
                              {formatCurrency(sale.salePrice, 'CHF')}
                            </td>
                            <td className="py-3 pr-4 text-right text-primary-700">
                              {formatPercent(sale.commissionPercent)}
                            </td>
                            <td className="py-3 pr-4 text-right text-blue-700 whitespace-nowrap">
                              {formatCurrency(sale.galleryShare, 'CHF')}
                            </td>
                            <td className="py-3 pr-4 text-right text-emerald-700 whitespace-nowrap">
                              {formatCurrency(sale.noaShare, 'CHF')}
                            </td>
                            <td className="py-3 pr-4 text-right text-violet-700 whitespace-nowrap">
                              {formatCurrency(sale.artistShare, 'CHF')}
                            </td>
                            <td className="py-3 text-right">
                              {paymentStatusBadge(sale.paymentStatus)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Box helper
// ---------------------------------------------------------------------------

function KpiBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-primary-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color || 'text-primary-900'}`}>{value}</p>
    </Card>
  );
}
