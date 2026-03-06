import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '../lib/supabase';
import { useProductionOrders } from '../hooks/useProductionOrders';
import { ProductionOrderPDF } from '../components/pdf/ProductionOrderPDF';
import { ProductionOrdersOverviewPDF } from '../components/pdf/ProductionOrdersOverviewPDF';
import type { OverviewOrder, OverviewItem } from '../components/pdf/ProductionOrdersOverviewPDF';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { PRODUCTION_STATUSES } from '../lib/constants';
import { formatDate, formatDimensions } from '../lib/utils';
import type { ProductionStatus, ProductionOrderRow } from '../types/database';

// ---------------------------------------------------------------------------
// Language options for PDF export
// ---------------------------------------------------------------------------

type Language = 'en' | 'de' | 'fr';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ProductionOrdersPage() {
  const navigate = useNavigate();

  // ---- Filters ------------------------------------------------------------

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingOverview, setDownloadingOverview] = useState(false);

  const { productionOrders, loading } = useProductionOrders({
    filters: {
      search: search || undefined,
      status: (statusFilter || undefined) as ProductionStatus | undefined,
    },
  });

  // ---- Handlers -----------------------------------------------------------

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value);
  }

  // ---- PDF download for a single order ------------------------------------

  async function handleDownloadPDF(order: ProductionOrderRow) {
    setDownloadingId(order.id);

    try {
      // Fetch items for this order
      const { data: items } = await supabase
        .from('production_order_items')
        .select('*')
        .eq('production_order_id', order.id)
        .order('sort_order', { ascending: true });

      const pdfItems = (items ?? []).map((item) => ({
        description: item.description,
        medium: item.medium,
        dimensions: formatDimensions(
          item.height,
          item.width,
          item.depth,
          item.dimension_unit ?? 'cm',
        ),
        quantity: item.quantity,
        notes: item.notes,
      }));

      // Fetch gallery name if set
      let galleryName: string | null = null;
      if (order.gallery_id) {
        const { data: gallery } = await supabase
          .from('galleries')
          .select('name')
          .eq('id', order.gallery_id)
          .single();
        galleryName = gallery?.name ?? null;
      }

      // Fetch contact name if set
      let contactName: string | null = null;
      if (order.contact_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('first_name, last_name')
          .eq('id', order.contact_id)
          .single();
        if (contact) {
          contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
        }
      }

      const blob = await pdf(
        <ProductionOrderPDF
          order={order}
          items={pdfItems}
          galleryName={galleryName}
          contactName={contactName}
          language={language}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${order.order_number}_production-order.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingId(null);
    }
  }

  // ---- PDF overview of all (filtered) orders --------------------------------

  async function handleDownloadOverview() {
    if (productionOrders.length === 0) return;
    setDownloadingOverview(true);

    try {
      // Collect all unique gallery/contact IDs
      const galleryIds = [...new Set(productionOrders.map((o) => o.gallery_id).filter(Boolean))] as string[];
      const contactIds = [...new Set(productionOrders.map((o) => o.contact_id).filter(Boolean))] as string[];

      // Batch-fetch gallery names
      const galleryNameMap: Record<string, string> = {};
      if (galleryIds.length > 0) {
        const { data: galleries } = await supabase
          .from('galleries')
          .select('id, name')
          .in('id', galleryIds);
        for (const g of galleries ?? []) {
          galleryNameMap[g.id] = g.name;
        }
      }

      // Batch-fetch contact names
      const contactNameMap: Record<string, string> = {};
      if (contactIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .in('id', contactIds);
        for (const c of contacts ?? []) {
          contactNameMap[c.id] = [c.first_name, c.last_name].filter(Boolean).join(' ');
        }
      }

      // Batch-fetch all items for all orders
      const orderIds = productionOrders.map((o) => o.id);
      const itemsByOrder: Record<string, OverviewItem[]> = {};

      if (orderIds.length > 0) {
        const { data: allItems } = await supabase
          .from('production_order_items')
          .select('*')
          .in('production_order_id', orderIds)
          .order('sort_order', { ascending: true });

        for (const item of allItems ?? []) {
          const orderId = item.production_order_id;
          if (!itemsByOrder[orderId]) itemsByOrder[orderId] = [];
          itemsByOrder[orderId].push({
            description: item.description,
            medium: item.medium,
            dimensions: formatDimensions(
              item.height,
              item.width,
              item.depth,
              item.dimension_unit ?? 'cm',
            ),
            quantity: item.quantity,
            year: item.year ?? null,
            edition_type: item.edition_type ?? null,
            edition_number: item.edition_number ?? null,
            edition_total: item.edition_total ?? null,
            price: item.price ?? null,
            currency: item.currency ?? null,
            category: item.category ?? null,
          });
        }
      }

      const overviewOrders: OverviewOrder[] = productionOrders.map((order) => ({
        order_number: order.order_number,
        title: order.title,
        status: order.status,
        ordered_date: order.ordered_date,
        deadline: order.deadline,
        gallery_name: order.gallery_id ? galleryNameMap[order.gallery_id] ?? null : null,
        contact_name: order.contact_id ? contactNameMap[order.contact_id] ?? null : null,
        price: order.price,
        currency: order.currency ?? 'EUR',
        items: itemsByOrder[order.id] ?? [],
      }));

      const blob = await pdf(
        <ProductionOrdersOverviewPDF
          orders={overviewOrders}
          language={language}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `production-orders-overview.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingOverview(false);
    }
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Production Orders
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Manage production orders and track manufacturing progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleDownloadOverview}
            loading={downloadingOverview}
            disabled={productionOrders.length === 0}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Export Overview
          </Button>
          <Button onClick={() => navigate('/production/new')}>
            New Production Order
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by order number or title..."
          className="max-w-md"
        />

        <div className="w-48">
          <Select
            options={[...PRODUCTION_STATUSES]}
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            placeholder="All Statuses"
          />
        </div>

        <div className="w-48">
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
      {!loading && productionOrders.length === 0 && (
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
                d="M11.42 15.17l-5.25-3.03a.75.75 0 010-1.28l5.25-3.03a.75.75 0 01.75 0l5.25 3.03a.75.75 0 010 1.28l-5.25 3.03a.75.75 0 01-.75 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 10.5v6l7.5 4.33 7.5-4.33v-6"
              />
            </svg>
          }
          title={search || statusFilter ? 'No production orders found' : 'No production orders yet'}
          description={
            search || statusFilter
              ? 'Try adjusting your search terms or filters.'
              : 'Create your first production order to start tracking manufacturing.'
          }
          action={
            !search && !statusFilter ? (
              <Button onClick={() => navigate('/production/new')}>
                Create First Production Order
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Production orders table */}
      {!loading && productionOrders.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-primary-100">
          <table className="min-w-full divide-y divide-primary-100">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Order #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Ordered Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Deadline
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50 bg-white">
              {productionOrders.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer hover:bg-primary-50 transition-colors"
                  onClick={() => navigate(`/production/${order.id}`)}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-primary-900">
                    {order.order_number}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {order.title}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {order.ordered_date ? formatDate(order.ordered_date) : '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-primary-600">
                    {order.deadline ? formatDate(order.deadline) : '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Download PDF"
                        loading={downloadingId === order.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPDF(order);
                        }}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                          />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/production/${order.id}`);
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
