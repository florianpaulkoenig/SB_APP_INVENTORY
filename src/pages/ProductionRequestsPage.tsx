import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProductionOrders } from '../hooks/useProductionOrders';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Select';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { PRODUCTION_REQUEST_STATUSES } from '../lib/constants';
import { formatDate, sanitizeFilterTerm } from '../lib/utils';
import type { ProductionStatus, ProductionOrderRow } from '../types/database';

// ---------------------------------------------------------------------------
// Sell-through stats per gallery: converted vs rejected requests
// ---------------------------------------------------------------------------

interface GallerySellThrough {
  galleryId: string;
  name: string;
  pending: number;
  converted: number;
  rejected: number;
  /** converted / (converted + rejected), null while nothing is decided yet */
  rate: number | null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ProductionRequestsPage() {
  const navigate = useNavigate();

  // ---- Filters ------------------------------------------------------------

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [matchingGalleryIds, setMatchingGalleryIds] = useState<string[]>([]);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

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

  const {
    productionOrders: requests,
    loading,
    refetch,
    convertRequestToOrder,
    rejectRequest,
  } = useProductionOrders({
    filters: {
      recordType: 'request',
      search: search || undefined,
      status: (statusFilter || undefined) as ProductionStatus | undefined,
      galleryIds: search && matchingGalleryIds.length > 0 ? matchingGalleryIds : undefined,
    },
    pageSize: 500,
  });

  // ---- Gallery names for the visible requests ------------------------------

  const [galleryNameMap, setGalleryNameMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const galleryIds = [
      ...new Set(requests.map((r) => r.gallery_id).filter(Boolean)),
    ] as string[];
    if (galleryIds.length === 0) return;

    let cancelled = false;

    supabase
      .from('galleries')
      .select('id, name')
      .in('id', galleryIds)
      .then(({ data }) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const g of (data ?? []) as { id: string; name: string }[]) map[g.id] = g.name;
        setGalleryNameMap((prev) => ({ ...prev, ...map }));
      });

    return () => { cancelled = true; };
  }, [requests]);

  // ---- Sell-through per gallery --------------------------------------------
  // Unfiltered, so the analysis stays stable while searching. Converted
  // requests are orders carrying converted_from_request_at; rejected/pending
  // ones are still record_type 'request'.

  const [sellThroughRows, setSellThroughRows] = useState<GallerySellThrough[]>([]);

  const fetchSellThrough = useCallback(async () => {
    const [requestsRes, convertedRes] = await Promise.all([
      supabase
        .from('production_orders')
        .select('id, gallery_id, status')
        .eq('record_type', 'request'),
      supabase
        .from('production_orders')
        .select('id, gallery_id')
        .eq('record_type', 'order')
        .not('converted_from_request_at', 'is', null),
    ]);

    const stats: Record<string, { pending: number; converted: number; rejected: number }> = {};
    const bucket = (galleryId: string | null) => {
      const key = galleryId ?? '__none__';
      if (!stats[key]) stats[key] = { pending: 0, converted: 0, rejected: 0 };
      return stats[key];
    };

    for (const r of (requestsRes.data ?? []) as { gallery_id: string | null; status: string }[]) {
      if (r.status === 'rejected') bucket(r.gallery_id).rejected += 1;
      else bucket(r.gallery_id).pending += 1;
    }
    for (const o of (convertedRes.data ?? []) as { gallery_id: string | null }[]) {
      bucket(o.gallery_id).converted += 1;
    }

    // Resolve gallery names
    const galleryIds = Object.keys(stats).filter((k) => k !== '__none__');
    const names: Record<string, string> = {};
    if (galleryIds.length > 0) {
      const { data: galleries } = await supabase
        .from('galleries')
        .select('id, name')
        .in('id', galleryIds);
      for (const g of (galleries ?? []) as { id: string; name: string }[]) names[g.id] = g.name;
    }

    const rows: GallerySellThrough[] = Object.entries(stats).map(([key, s]) => {
      const decided = s.converted + s.rejected;
      return {
        galleryId: key,
        name: key === '__none__' ? 'No gallery' : names[key] ?? 'Unknown',
        pending: s.pending,
        converted: s.converted,
        rejected: s.rejected,
        rate: decided > 0 ? s.converted / decided : null,
      };
    });

    rows.sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.converted - a.converted);
    setSellThroughRows(rows);
  }, []);

  useEffect(() => {
    fetchSellThrough();
  }, [fetchSellThrough]);

  // ---- Totals --------------------------------------------------------------

  const totals = useMemo(() => {
    const t = { pending: 0, converted: 0, rejected: 0 };
    for (const row of sellThroughRows) {
      t.pending += row.pending;
      t.converted += row.converted;
      t.rejected += row.rejected;
    }
    const decided = t.converted + t.rejected;
    return { ...t, rate: decided > 0 ? t.converted / decided : null };
  }, [sellThroughRows]);

  // ---- Handlers ------------------------------------------------------------

  async function handleConvert(request: ProductionOrderRow) {
    if (!window.confirm(`Convert request ${request.order_number} to a production order?`)) return;
    setConvertingId(request.id);
    const converted = await convertRequestToOrder(request.id);
    setConvertingId(null);
    if (converted) {
      await Promise.all([refetch(), fetchSellThrough()]);
      navigate(`/production/${converted.id}`);
    }
  }

  async function handleReject(request: ProductionOrderRow) {
    if (!window.confirm(`Reject request ${request.order_number}?`)) return;
    setRejectingId(request.id);
    const rejected = await rejectRequest(request.id);
    setRejectingId(null);
    if (rejected) {
      await Promise.all([refetch(), fetchSellThrough()]);
    }
  }

  const formatRate = (rate: number | null) =>
    rate == null ? '—' : `${Math.round(rate * 100)}%`;

  // ---- Render --------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Production Requests
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Enquiries from galleries and collectors — convert confirmed requests into production orders.
          </p>
        </div>

        <Button onClick={() => navigate('/production-requests/new')}>
          New Production Request
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex items-center gap-3">
        <div className="max-w-xs flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search requests..."
          />
        </div>

        <div className="w-44 shrink-0">
          <Select
            options={[...PRODUCTION_REQUEST_STATUSES]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="All Statuses"
          />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-primary-100 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Open Requests</p>
          <p className="mt-1 font-display text-2xl font-bold text-primary-900">{totals.pending}</p>
        </div>
        <div className="rounded-lg border border-primary-100 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Converted</p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-700">{totals.converted}</p>
        </div>
        <div className="rounded-lg border border-primary-100 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Rejected</p>
          <p className="mt-1 font-display text-2xl font-bold text-red-600">{totals.rejected}</p>
        </div>
        <div className="rounded-lg border border-primary-100 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-400">Sell-Through Rate</p>
          <p className="mt-1 font-display text-2xl font-bold text-primary-900">{formatRate(totals.rate)}</p>
          <p className="mt-1 text-xs text-primary-400">converted / decided</p>
        </div>
      </div>

      {/* Sell-through per gallery */}
      {sellThroughRows.length > 0 && (
        <details className="group mb-6" open>
          <summary className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-primary-500 hover:text-primary-700">
            <svg className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            Sell-Through by Gallery ({sellThroughRows.length})
          </summary>
          <div className="mt-3 overflow-x-auto rounded-lg border border-primary-100">
            <table className="min-w-full divide-y divide-primary-100">
              <thead className="bg-primary-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-500">Gallery</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-primary-500">Open</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-primary-500">Converted</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-primary-500">Rejected</th>
                  <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wider text-primary-500">Sell-Through</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-50 bg-white">
                {sellThroughRows.map((row, idx) => (
                  <tr key={row.galleryId} className={idx % 2 === 1 ? 'bg-primary-50/40' : ''}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-primary-900">{row.name}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm text-primary-600">{row.pending}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm text-emerald-700">{row.converted}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm text-red-600">{row.rejected}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm font-medium text-primary-800">
                      {formatRate(row.rate)}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.rate != null && (
                        <div className="flex h-1.5 w-24 overflow-hidden rounded-full bg-red-100">
                          <div className="bg-emerald-500" style={{ width: `${Math.round(row.rate * 100)}%` }} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && requests.length === 0 && (
        <EmptyState
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          }
          title={search || statusFilter ? 'No production requests found' : 'No production requests yet'}
          description={
            search || statusFilter
              ? 'Try adjusting your search terms or filters.'
              : 'Capture gallery and collector enquiries here, then convert confirmed ones into production orders.'
          }
          action={
            !search && !statusFilter ? (
              <Button onClick={() => navigate('/production-requests/new')}>
                Create First Production Request
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Requests table */}
      {!loading && requests.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-primary-100">
          <table className="min-w-full divide-y divide-primary-100">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-500 sm:px-4 sm:py-3">Request #</th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-500 sm:px-4 sm:py-3">Title</th>
                <th className="hidden px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-500 sm:px-4 sm:py-3 md:table-cell">Gallery</th>
                <th className="px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-500 sm:px-4 sm:py-3">Status</th>
                <th className="hidden px-2 py-2 text-left text-xs font-medium uppercase tracking-wider text-primary-500 sm:table-cell sm:px-4 sm:py-3">Requested</th>
                <th className="px-2 py-2 text-right text-xs font-medium uppercase tracking-wider text-primary-500 sm:px-4 sm:py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50 bg-white">
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className="cursor-pointer transition-colors hover:bg-primary-50"
                  onClick={() => navigate(`/production/${request.id}`)}
                >
                  <td className="whitespace-nowrap px-2 py-2 text-sm font-medium text-primary-900 sm:px-4 sm:py-3">
                    {request.order_number}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-sm text-primary-600 sm:px-4 sm:py-3">
                    {request.title}
                  </td>
                  <td className="hidden whitespace-nowrap px-2 py-2 text-sm text-primary-600 sm:px-4 sm:py-3 md:table-cell">
                    {request.gallery_id && galleryNameMap[request.gallery_id]
                      ? galleryNameMap[request.gallery_id]
                      : <span className="text-primary-300">—</span>}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 sm:px-4 sm:py-3">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="hidden whitespace-nowrap px-2 py-2 text-sm text-primary-600 sm:table-cell sm:px-4 sm:py-3">
                    {request.ordered_date ? formatDate(request.ordered_date) : formatDate(request.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right sm:px-4 sm:py-3">
                    <div className="flex items-center justify-end gap-2">
                      {request.status !== 'rejected' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            loading={convertingId === request.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConvert(request);
                            }}
                          >
                            Convert to Order
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={rejectingId === request.id}
                            className="text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(request);
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/production/${request.id}`);
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
