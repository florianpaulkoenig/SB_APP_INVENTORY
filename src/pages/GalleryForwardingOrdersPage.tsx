import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { useGalleryForwardings } from '../hooks/useGalleryForwarding';
import { GalleryForwardingPDF } from '../components/pdf/GalleryForwardingPDF';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { FORWARDING_STATUSES } from '../lib/constants';
import { formatDate, formatDimensions } from '../lib/utils';
import { supabase } from '../lib/supabase';
import type { ForwardingStatus } from '../types/database';

// ---------------------------------------------------------------------------
// Language options for PDF
// ---------------------------------------------------------------------------
type Language = 'en' | 'de' | 'fr';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Francais' },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleryForwardingOrdersPage() {
  const navigate = useNavigate();

  // ---- Filters ------------------------------------------------------------

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [language, setLanguage] = useState<Language>('en');

  const { forwardings, loading } = useGalleryForwardings({
    filters: {
      search: search || undefined,
      status: (statusFilter || undefined) as ForwardingStatus | undefined,
    },
  });

  // ---- PDF download per row -----------------------------------------------

  async function handleDownloadPDF(orderId: string) {
    // Fetch order
    const { data: order } = await supabase
      .from('gallery_forwarding_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) return;

    // Fetch items with artwork join
    const { data: rawItems } = await supabase
      .from('gallery_forwarding_items')
      .select('*, artworks(title, reference_code, medium, height, width, depth, dimension_unit)')
      .eq('forwarding_order_id', orderId)
      .order('sort_order');

    const items = (rawItems ?? []).map((item: Record<string, unknown>) => {
      const aw = item.artworks as Record<string, unknown> | null;
      return {
        reference_code: (aw?.reference_code as string) ?? '',
        title: (aw?.title as string) ?? '',
        medium: (aw?.medium as string) ?? null,
        dimensions: formatDimensions(
          (aw?.height as number) ?? null,
          (aw?.width as number) ?? null,
          (aw?.depth as number) ?? null,
          (aw?.dimension_unit as string) ?? 'cm',
        ),
      };
    });

    // Fetch gallery names
    let fromGalleryName: string | null = null;
    let toGalleryName: string | null = null;

    if (order.from_gallery_id) {
      const { data } = await supabase
        .from('galleries')
        .select('name')
        .eq('id', order.from_gallery_id)
        .single();
      if (data) fromGalleryName = data.name;
    }

    if (order.to_gallery_id) {
      const { data } = await supabase
        .from('galleries')
        .select('name')
        .eq('id', order.to_gallery_id)
        .single();
      if (data) toGalleryName = data.name;
    }

    const blob = await pdf(
      <GalleryForwardingPDF
        order={order}
        items={items}
        fromGalleryName={fromGalleryName}
        toGalleryName={toGalleryName}
        language={language}
      />,
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${order.forwarding_number}_forwarding-order.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Gallery Forwarding
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Manage artwork transfers between galleries.
          </p>
        </div>

        <Button onClick={() => navigate('/forwarding/new')}>
          New Forwarding Order
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by forwarding number or title..."
          className="max-w-md"
        />

        <div className="w-full sm:w-48">
          <Select
            options={[...FORWARDING_STATUSES]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="All Statuses"
          />
        </div>

        <div className="w-40">
          <Select
            label="PDF Language"
            options={[...LANGUAGE_OPTIONS]}
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && forwardings.length === 0 && (
        <EmptyState
          icon={
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
              />
            </svg>
          }
          title={search || statusFilter ? 'No forwarding orders found' : 'No forwarding orders yet'}
          description={
            search || statusFilter
              ? 'Try adjusting your search terms or filters.'
              : 'Create your first forwarding order to start tracking gallery transfers.'
          }
          action={
            !search && !statusFilter ? (
              <Button onClick={() => navigate('/forwarding/new')}>
                Create First Forwarding Order
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Table */}
      {!loading && forwardings.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-primary-100">
          <table className="min-w-full divide-y divide-primary-100">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Forwarding #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Shipping Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50 bg-white">
              {forwardings.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer transition-colors hover:bg-primary-50"
                  onClick={() => navigate(`/forwarding/${order.id}`)}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-primary-900">
                    {order.forwarding_number}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {order.title}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {order.shipping_date ? formatDate(order.shipping_date) : '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Download PDF"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPDF(order.id);
                        }}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/forwarding/${order.id}`);
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
