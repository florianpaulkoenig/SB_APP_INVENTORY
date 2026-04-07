import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import JSZip from 'jszip';
import { supabase } from '../lib/supabase';
import { useProductionOrders } from '../hooks/useProductionOrders';
import { ProductionOrderPDF } from '../components/pdf/ProductionOrderPDF';
import { ProductionOrdersOverviewPDF } from '../components/pdf/ProductionOrdersOverviewPDF';
import { ProductionOrdersArtistPDF } from '../components/pdf/ProductionOrdersArtistPDF';
import type { OverviewOrder, OverviewItem } from '../components/pdf/ProductionOrdersOverviewPDF';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { PRODUCTION_STATUSES } from '../lib/constants';
import { formatDate, formatDimensions, formatCurrency, sanitizeFilterTerm, downloadBlob } from '../lib/utils';
import { useExchangeRates } from '../hooks/useExchangeRates';
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
  const [downloadingArtist, setDownloadingArtist] = useState(false);
  const [matchingGalleryIds, setMatchingGalleryIds] = useState<string[]>([]);
  const [artistDateFrom, setArtistDateFrom] = useState('');
  const [artistDateTo, setArtistDateTo] = useState('');

  // ---- Resolve gallery IDs matching search term ----------------------------

  useEffect(() => {
    if (!search) {
      setMatchingGalleryIds([]);
      return;
    }

    let cancelled = false;

    async function lookupGalleries() {
      const { data } = await supabase
        .from('galleries')
        .select('id')
        .ilike('name', `%${sanitizeFilterTerm(search)}%`);

      if (!cancelled) {
        setMatchingGalleryIds((data ?? []).map((g) => g.id));
      }
    }

    lookupGalleries();
    return () => { cancelled = true; };
  }, [search]);

  const { productionOrders, loading } = useProductionOrders({
    filters: {
      search: search || undefined,
      status: (statusFilter || undefined) as ProductionStatus | undefined,
      galleryIds: search && matchingGalleryIds.length > 0 ? matchingGalleryIds : undefined,
    },
  });

  const { toCHF } = useExchangeRates();
  const { toast } = useToast();

  // ---- Fetch item-level values & gallery names for all visible orders ------

  const [galleryNameMap, setGalleryNameMap] = useState<Record<string, string>>({});
  const [orderValueMap, setOrderValueMap] = useState<Record<string, number>>({});
  const [orderCurrencyMap, setOrderCurrencyMap] = useState<Record<string, string>>({});

  const fetchOrderMeta = useCallback(async () => {
    if (productionOrders.length === 0) {
      setGalleryNameMap({});
      setOrderValueMap({});
      return;
    }

    // Fetch gallery names
    const galleryIds = [
      ...new Set(productionOrders.map((o) => o.gallery_id).filter(Boolean)),
    ] as string[];

    const gMap: Record<string, string> = {};
    if (galleryIds.length > 0) {
      const { data: galleries } = await supabase
        .from('galleries')
        .select('id, name')
        .in('id', galleryIds);
      for (const g of galleries ?? []) gMap[g.id] = g.name;
    }
    setGalleryNameMap(gMap);

    // Fetch ALL items for displayed orders to compute values from items
    const orderIds = productionOrders.map((o) => o.id);
    const { data: allItems } = await supabase
      .from('production_order_items')
      .select('production_order_id, artwork_id, price, currency, quantity')
      .in('production_order_id', orderIds);

    const valMap: Record<string, number> = {};
    const currMap: Record<string, string> = {};
    for (const item of allItems ?? []) {
      if (item.artwork_id) continue; // converted to artwork — value moved to artwork potential revenue
      if (item.price != null && item.price > 0) {
        const qty = item.quantity ?? 1;
        valMap[item.production_order_id] = (valMap[item.production_order_id] || 0) + item.price * qty;
        if (item.currency) currMap[item.production_order_id] = item.currency;
      }
    }
    setOrderValueMap(valMap);
    setOrderCurrencyMap(currMap);

    // Backfill: update any order whose DB price doesn't match item total
    for (const order of productionOrders) {
      const itemTotal = valMap[order.id] ?? 0;
      const dbPrice = order.price ?? 0;
      if (Math.abs(itemTotal - dbPrice) > 0.001 && itemTotal > 0) {
        const { error: backfillErr } = await supabase
          .from('production_orders')
          .update({ price: itemTotal, currency: currMap[order.id] ?? order.currency ?? 'EUR' } as never)
          .eq('id', order.id);
        if (backfillErr) {
          console.warn(`Failed to backfill production order ${order.id}:`, backfillErr.message);
        }
      }
    }
  }, [productionOrders]);

  useEffect(() => {
    fetchOrderMeta();
  }, [fetchOrderMeta]);

  // ---- Revenue summary computations (convert to CHF) ----------------------

  function getOrderValue(order: ProductionOrderRow): number {
    // Prefer item-calculated value, fall back to order.price
    return orderValueMap[order.id] ?? (order.price != null && order.price > 0 ? order.price : 0);
  }

  function getOrderCurrency(order: ProductionOrderRow): string {
    return orderCurrencyMap[order.id] ?? order.currency ?? 'EUR';
  }

  function getOrderValueCHF(order: ProductionOrderRow): number {
    const val = getOrderValue(order);
    if (val <= 0) return 0;
    return toCHF(val, getOrderCurrency(order));
  }

  const totalOrderValue = productionOrders.reduce(
    (sum, o) => sum + getOrderValueCHF(o),
    0,
  );

  const perGalleryValue: Array<{ id: string; name: string; value: number }> = (() => {
    const map: Record<string, number> = {};
    for (const o of productionOrders) {
      const val = getOrderValueCHF(o);
      if (o.gallery_id && val > 0) {
        map[o.gallery_id] = (map[o.gallery_id] || 0) + val;
      }
    }
    return Object.entries(map)
      .map(([gId, val]) => ({ id: gId, name: galleryNameMap[gId] || 'Unknown', value: val }))
      .sort((a, b) => b.value - a.value);
  })();

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
        .select('description, medium, height, width, depth, dimension_unit, quantity, notes, sort_order')
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

      downloadBlob(blob, `NOA_SB_Production_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setDownloadingId(null);
    }
  }

  // ---- PDF artist export (simplified for Simon Berger) -----------------------

  async function handleDownloadArtistExport() {
    if (productionOrders.length === 0) return;
    setDownloadingArtist(true);

    try {
      // Exclude completed orders and filter by date range
      let dateFilteredOrders = productionOrders.filter((o) => o.status !== 'completed' && o.status !== 'shipped');
      if (artistDateFrom) {
        dateFilteredOrders = dateFilteredOrders.filter(
          (o) => o.deadline && o.deadline >= artistDateFrom
        );
      }
      if (artistDateTo) {
        dateFilteredOrders = dateFilteredOrders.filter(
          (o) => o.deadline && o.deadline <= artistDateTo
        );
      }
      if (dateFilteredOrders.length === 0) {
        toast({ title: 'No Orders', description: 'No orders match the selected date range.', variant: 'destructive' });
        setDownloadingArtist(false);
        return;
      }

      // Batch-fetch all items
      const orderIds = dateFilteredOrders.map((o) => o.id);
      const itemsByOrder: Record<string, OverviewItem[]> = {};
      let refImageBlobsByItem: Record<string, Array<{ blob: Blob; ext: string }>> = {};
      let itemMeta: Record<string, { orderTitle: string; description: string }> = {};

      if (orderIds.length > 0) {
        const { data: allItems } = await supabase
          .from('production_order_items')
          .select('id, production_order_id, description, medium, height, width, depth, dimension_unit, quantity, year, edition_type, edition_number, edition_total, price, currency, category, sort_order')
          .in('production_order_id', orderIds)
          .order('sort_order', { ascending: true });

        // Get current user for storage paths
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const userId = currentSession?.user?.id;

        // Download per-item reference images from storage folders (multiple per item)
        const refImageDataUrlsByItem: Record<string, string[]> = {};
        refImageBlobsByItem = {};

        if (userId) {
          for (const item of allItems ?? []) {
            const prefix = `${userId}/production-orders/${item.production_order_id}/items/${item.id}`;
            const { data: files } = await supabase.storage.from('artwork-images').list(prefix);
            if (files && files.length > 0) {
              const dataUrls: string[] = [];
              const blobs: Array<{ blob: Blob; ext: string }> = [];
              for (const file of files) {
                if (!file.id) continue;
                const { data: blob } = await supabase.storage
                  .from('artwork-images')
                  .download(`${prefix}/${file.name}`);
                if (blob) {
                  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase() || '.jpg';
                  blobs.push({ blob, ext });
                  const dataUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                  });
                  dataUrls.push(dataUrl);
                }
              }
              if (dataUrls.length > 0) refImageDataUrlsByItem[item.id] = dataUrls;
              if (blobs.length > 0) refImageBlobsByItem[item.id] = blobs;
            }
          }
        }

        // Build order title lookup for ZIP naming
        const orderTitleMap: Record<string, string> = {};
        for (const o of dateFilteredOrders) {
          orderTitleMap[o.id] = o.title || o.order_number;
        }

        // Track item metadata for ZIP filenames
        itemMeta = {};

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
            referenceImageUrls: refImageDataUrlsByItem[item.id] ?? [],
          });
          itemMeta[item.id] = {
            orderTitle: orderTitleMap[orderId] ?? orderId,
            description: item.description ?? 'item',
          };
        }
      }

      // Sort orders by deadline (earliest first)
      const sortedOrders = [...dateFilteredOrders].sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });

      const artistOrders: OverviewOrder[] = sortedOrders.map((order) => ({
        order_number: order.order_number,
        title: order.title,
        status: order.status,
        ordered_date: order.ordered_date,
        deadline: order.deadline,
        gallery_name: order.gallery_id ? galleryNameMap[order.gallery_id] ?? null : null,
        contact_name: null,
        price: null,
        currency: order.currency ?? 'EUR',
        items: itemsByOrder[order.id] ?? [],
      }));

      const pdfBlob = await pdf(
        <ProductionOrdersArtistPDF
          orders={artistOrders}
          language={language}
          dateRange={artistDateFrom || artistDateTo
            ? { from: artistDateFrom || undefined, to: artistDateTo || undefined }
            : undefined}
        />,
      ).toBlob();

      const dateSuffix = new Date().toISOString().slice(0, 10);

      // Build ZIP with PDF + reference images
      const zip = new JSZip();
      zip.file(`NOA_SB_Production_Artist_${dateSuffix}.pdf`, pdfBlob);

      // Add per-item reference images named by order title + item description
      const usedFilenames = new Set<string>();
      for (const [itemId, blobs] of Object.entries(refImageBlobsByItem)) {
        const meta = itemMeta[itemId];
        if (!meta) continue;
        const safeTitle = meta.orderTitle.replace(/[/\\:*?"<>|]/g, '_').trim();
        const safeDesc = meta.description.replace(/[/\\:*?"<>|]/g, '_').trim();
        const baseName = `${safeTitle}_${safeDesc}`;

        for (let i = 0; i < blobs.length; i++) {
          const blobData = blobs[i];
          let fileName = blobs.length > 1
            ? `${baseName}_${i + 1}${blobData.ext}`
            : `${baseName}${blobData.ext}`;
          // Handle filename collisions across items
          let counter = 2;
          const origName = fileName;
          while (usedFilenames.has(fileName)) {
            const dotIdx = origName.lastIndexOf('.');
            fileName = `${origName.substring(0, dotIdx)}_${counter}${origName.substring(dotIdx)}`;
            counter++;
          }
          usedFilenames.add(fileName);
          zip.file(fileName, blobData.blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `NOA_SB_Production_Artist_${dateSuffix}.zip`);
    } finally {
      setDownloadingArtist(false);
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
          .select('id, production_order_id, description, medium, height, width, depth, dimension_unit, quantity, year, edition_type, edition_number, edition_total, price, currency, category, sort_order')
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
          totalValueCHF={totalOrderValue > 0 ? totalOrderValue : undefined}
          perGalleryValues={perGalleryValue.length > 0 ? perGalleryValue.map((g) => ({ name: g.name, value: g.value })) : undefined}
        />,
      ).toBlob();

      downloadBlob(blob, `NOA_SB_Production_Overview_${new Date().toISOString().slice(0, 10)}.pdf`);
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={artistDateFrom}
              onChange={(e) => setArtistDateFrom(e.target.value)}
              className="w-full sm:w-auto rounded-md border border-primary-200 bg-white px-2 py-1.5 text-sm text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              title="From date"
            />
            <span className="text-xs text-primary-400">to</span>
            <input
              type="date"
              value={artistDateTo}
              onChange={(e) => setArtistDateTo(e.target.value)}
              className="w-full sm:w-auto rounded-md border border-primary-200 bg-white px-2 py-1.5 text-sm text-primary-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              title="To date"
            />
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleDownloadArtistExport}
              loading={downloadingArtist}
              disabled={productionOrders.length === 0}
              title="Simplified export for artist: Item, Dimensions, Qty, Category"
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
              Export: Artist
            </Button>
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleDownloadOverview}
            loading={downloadingOverview}
            disabled={productionOrders.length === 0}
            title="Full export with revenue summary, per-gallery breakdown, and analysis"
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
            Export: Complete
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => navigate('/production/new')}>
            New Production Order
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by order number, title, or gallery..."
          className="max-w-md"
        />

        <div className="w-full sm:w-48">
          <Select
            options={[...PRODUCTION_STATUSES]}
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            placeholder="All Statuses"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            label="PDF Language"
            options={[...LANGUAGE_OPTIONS]}
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
          />
        </div>
      </div>

      {/* Revenue summary */}
      {!loading && productionOrders.length > 0 && totalOrderValue > 0 && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Total */}
            <div className="rounded-lg border border-primary-100 bg-white px-3 py-2 sm:px-5 sm:py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                Total Order Value
              </p>
              <p className="mt-1 font-display text-lg sm:text-xl font-bold text-primary-900">
                {formatCurrency(totalOrderValue, 'CHF')}
              </p>
            </div>
            {/* Per gallery */}
            {perGalleryValue.map((g) => (
              <div
                key={g.id}
                className="cursor-pointer rounded-lg border border-primary-100 bg-white px-3 py-2 sm:px-5 sm:py-3 transition-shadow hover:shadow-md"
                onClick={() => navigate(`/galleries/${g.id}`)}
              >
                <p className="text-xs font-medium uppercase tracking-wider text-primary-400">
                  {g.name}
                </p>
                <p className="mt-1 font-display text-lg sm:text-xl font-bold text-accent">
                  {formatCurrency(g.value, 'CHF')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

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
      {!loading && productionOrders.filter((o) => o.status !== 'shipped').length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-primary-100">
          <table className="min-w-full divide-y divide-primary-100">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Order #
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Title
                </th>
                <th className="hidden md:table-cell px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Gallery
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Status
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                  Deadline
                </th>
                <th className="hidden sm:table-cell px-2 py-2 sm:px-4 sm:py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                  Value
                </th>
                <th className="px-2 py-2 sm:px-4 sm:py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50 bg-white">
              {productionOrders.filter((o) => o.status !== 'shipped').map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer hover:bg-primary-50 transition-colors"
                  onClick={() => navigate(`/production/${order.id}`)}
                >
                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-sm font-medium text-primary-900">
                    {order.order_number}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-sm text-primary-600">
                    {order.title}
                  </td>
                  <td className="hidden md:table-cell whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-sm text-primary-600">
                    {order.gallery_id && galleryNameMap[order.gallery_id]
                      ? galleryNameMap[order.gallery_id]
                      : <span className="text-primary-300">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">
                    {order.deadline ? (() => {
                      const deadlineDate = new Date(order.deadline);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      deadlineDate.setHours(0, 0, 0, 0);
                      const diffMs = deadlineDate.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                      const isCompleted = order.status === 'completed' || order.status === 'shipped';
                      const isOverdue = diffDays < 0 && !isCompleted;
                      const isUrgent = diffDays >= 0 && diffDays <= 7 && !isCompleted;
                      const isSoon = diffDays > 7 && diffDays <= 21 && !isCompleted;

                      return (
                        <div className="flex items-center gap-2">
                          <div>
                            <p className={`font-display text-sm font-bold ${
                              isOverdue ? 'text-red-600' :
                              isUrgent ? 'text-amber-600' :
                              isCompleted ? 'text-primary-400' :
                              'text-primary-900'
                            }`}>
                              {formatDate(order.deadline)}
                            </p>
                            {!isCompleted && (
                              <p className={`text-xs font-medium ${
                                isOverdue ? 'text-red-500' :
                                isUrgent ? 'text-amber-500' :
                                isSoon ? 'text-blue-500' :
                                'text-primary-400'
                              }`}>
                                {isOverdue
                                  ? `${Math.abs(diffDays)}d overdue`
                                  : diffDays === 0
                                    ? 'Today'
                                    : `${diffDays}d remaining`}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })() : (
                      <span className="text-sm text-primary-400">No deadline</span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-right text-sm font-medium text-primary-800">
                    {getOrderValueCHF(order) > 0
                      ? formatCurrency(getOrderValueCHF(order), 'CHF')
                      : '-'}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-right">
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

      {/* Shipped archive */}
      {!loading && productionOrders.filter((o) => o.status === 'shipped').length > 0 && (
        <details className="mt-8 group">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-primary-500 hover:text-primary-700">
            <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            Shipped Archive ({productionOrders.filter((o) => o.status === 'shipped').length})
          </summary>
          <div className="mt-3 overflow-x-auto rounded-lg border border-primary-100 opacity-75">
            <table className="min-w-full divide-y divide-primary-100">
              <thead className="bg-primary-50">
                <tr>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                    Order #
                  </th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                    Title
                  </th>
                  <th className="hidden md:table-cell px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                    Gallery
                  </th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                    Status
                  </th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-500">
                    Deadline
                  </th>
                  <th className="hidden sm:table-cell px-2 py-2 sm:px-4 sm:py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                    Value
                  </th>
                  <th className="px-2 py-2 sm:px-4 sm:py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-50 bg-white">
                {productionOrders.filter((o) => o.status === 'shipped').map((order) => (
                  <tr
                    key={order.id}
                    className="cursor-pointer hover:bg-primary-50 transition-colors"
                    onClick={() => navigate(`/production/${order.id}`)}
                  >
                    <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-sm font-medium text-primary-500">
                      {order.order_number}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-sm text-primary-400">
                      {order.title}
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-sm text-primary-400">
                      {order.gallery_id && galleryNameMap[order.gallery_id]
                        ? galleryNameMap[order.gallery_id]
                        : <span className="text-primary-300">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">
                      {order.deadline
                        ? <span className="text-sm text-primary-400">{formatDate(order.deadline)}</span>
                        : <span className="text-sm text-primary-300">—</span>}
                    </td>
                    <td className="hidden sm:table-cell whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-right text-sm font-medium text-primary-500">
                      {getOrderValueCHF(order) > 0
                        ? formatCurrency(getOrderValueCHF(order), 'CHF')
                        : '-'}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3 text-right">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
