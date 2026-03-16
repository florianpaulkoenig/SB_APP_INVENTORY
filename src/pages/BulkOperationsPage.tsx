// ---------------------------------------------------------------------------
// NOA Inventory -- Bulk Operations Page
// Art fair preparation: batch status changes, price updates, gallery
// assignments with multi-select artwork table.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useBulkOperations } from '../hooks/useBulkOperations';
import type { BulkOperationResult } from '../hooks/useBulkOperations';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { formatCurrency } from '../lib/utils';
import { ARTWORK_STATUSES, ARTWORK_SERIES } from '../lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GalleryOption {
  id: string;
  name: string;
}

interface ExhibitionOption {
  id: string;
  title: string;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function BulkOperationsPage() {
  const { toast } = useToast();
  const {
    selectedItems,
    loadArtworks,
    toggleSelection,
    selectAll,
    clearSelection,
    loading,
    availableItems,
    bulkStatusChange,
    bulkPriceUpdate,
    bulkAssignGallery,
  } = useBulkOperations();

  // ---- Filter state -------------------------------------------------------

  const [filterGalleryId, setFilterGalleryId] = useState('');
  const [filterSeries, setFilterSeries] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterExhibitionId, setFilterExhibitionId] = useState('');

  // ---- Dropdown options ---------------------------------------------------

  const [galleries, setGalleries] = useState<GalleryOption[]>([]);
  const [exhibitions, setExhibitions] = useState<ExhibitionOption[]>([]);
  const [galleriesLoading, setGalleriesLoading] = useState(true);

  // ---- Action panel state -------------------------------------------------

  const [statusAction, setStatusAction] = useState('');
  const [priceChangeType, setPriceChangeType] = useState<'percentage' | 'fixed'>('percentage');
  const [priceValue, setPriceValue] = useState('');
  const [priceNote, setPriceNote] = useState('');
  const [assignGalleryId, setAssignGalleryId] = useState('');
  const [operationLoading, setOperationLoading] = useState(false);

  // ---- Load dropdown data on mount ----------------------------------------

  useEffect(() => {
    async function fetchOptions() {
      setGalleriesLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const [galleriesRes, exhibitionsRes] = await Promise.all([
          supabase
            .from('galleries')
            .select('id, name')
            .order('name', { ascending: true }),
          supabase
            .from('exhibitions')
            .select('id, title')
            .eq('user_id', session.user.id)
            .order('start_date', { ascending: false, nullsFirst: false }),
        ]);

        if (galleriesRes.data) {
          setGalleries(galleriesRes.data as GalleryOption[]);
        }
        if (exhibitionsRes.data) {
          setExhibitions(exhibitionsRes.data as ExhibitionOption[]);
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to load filter options', variant: 'error' });
      } finally {
        setGalleriesLoading(false);
      }
    }

    fetchOptions();
  }, [toast]);

  // ---- Handlers -----------------------------------------------------------

  const handleLoadArtworks = useCallback(() => {
    loadArtworks({
      galleryId: filterGalleryId || undefined,
      series: filterSeries || undefined,
      status: filterStatus || undefined,
      exhibitionId: filterExhibitionId || undefined,
    });
  }, [loadArtworks, filterGalleryId, filterSeries, filterStatus, filterExhibitionId]);

  const showResult = useCallback(
    (label: string, result: BulkOperationResult) => {
      if (result.failed === 0) {
        toast({
          title: `${label}: ${result.success} of ${result.total} updated`,
          variant: 'success',
        });
      } else {
        toast({
          title: `${label}: ${result.success} succeeded, ${result.failed} failed`,
          description: result.errors.slice(0, 3).join('; '),
          variant: 'error',
        });
      }
    },
    [toast],
  );

  const handleStatusChange = useCallback(async () => {
    if (!statusAction) {
      toast({ title: 'Select a status', variant: 'info' });
      return;
    }
    const ids = selectedItems.map((i) => i.artworkId);
    if (ids.length === 0) {
      toast({ title: 'No artworks selected', variant: 'info' });
      return;
    }
    setOperationLoading(true);
    const result = await bulkStatusChange(ids, statusAction);
    showResult('Status Change', result);
    setOperationLoading(false);
  }, [statusAction, selectedItems, bulkStatusChange, showResult, toast]);

  const handlePriceUpdate = useCallback(async () => {
    const numValue = parseFloat(priceValue);
    if (isNaN(numValue) || numValue === 0) {
      toast({ title: 'Enter a valid price value', variant: 'info' });
      return;
    }
    const ids = selectedItems.map((i) => i.artworkId);
    if (ids.length === 0) {
      toast({ title: 'No artworks selected', variant: 'info' });
      return;
    }
    setOperationLoading(true);
    const result = await bulkPriceUpdate(ids, priceChangeType, numValue, priceNote || 'Bulk update');
    showResult('Price Update', result);
    setOperationLoading(false);
  }, [priceValue, priceChangeType, priceNote, selectedItems, bulkPriceUpdate, showResult, toast]);

  const handleAssignGallery = useCallback(async () => {
    if (!assignGalleryId) {
      toast({ title: 'Select a gallery', variant: 'info' });
      return;
    }
    const ids = selectedItems.map((i) => i.artworkId);
    if (ids.length === 0) {
      toast({ title: 'No artworks selected', variant: 'info' });
      return;
    }
    setOperationLoading(true);
    const result = await bulkAssignGallery(ids, assignGalleryId);
    showResult('Assign Gallery', result);
    setOperationLoading(false);
  }, [assignGalleryId, selectedItems, bulkAssignGallery, showResult, toast]);

  // ---- Derived ------------------------------------------------------------

  const selectedCount = selectedItems.length;
  const allSelected = availableItems.length > 0 && selectedCount === availableItems.length;
  const statusLabel = (value: string) =>
    ARTWORK_STATUSES.find((s) => s.value === value)?.label ?? value;
  const seriesLabel = (value: string | null) =>
    ARTWORK_SERIES.find((s) => s.value === value)?.label ?? value ?? '—';

  const galleryOptions = galleries.map((g) => ({ value: g.id, label: g.name }));
  const exhibitionOptions = exhibitions.map((e) => ({ value: e.id, label: e.title }));
  const statusOptions = ARTWORK_STATUSES.map((s) => ({ value: s.value, label: s.label }));
  const seriesOptions = ARTWORK_SERIES.map((s) => ({ value: s.value, label: s.label }));

  // ---- Render -------------------------------------------------------------

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-48">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Bulk Operations</h1>
        <p className="mt-1 text-sm text-primary-500">
          Art fair preparation — batch status changes, price updates, and gallery assignments.
        </p>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-primary-700">Filters</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Gallery"
            placeholder="All Galleries"
            options={galleryOptions}
            value={filterGalleryId}
            onChange={(e) => setFilterGalleryId(e.target.value)}
            disabled={galleriesLoading}
          />
          <Select
            label="Series"
            placeholder="All Series"
            options={seriesOptions}
            value={filterSeries}
            onChange={(e) => setFilterSeries(e.target.value)}
          />
          <Select
            label="Status"
            placeholder="All Statuses"
            options={statusOptions}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          />
          <Select
            label="Exhibition"
            placeholder="All Exhibitions"
            options={exhibitionOptions}
            value={filterExhibitionId}
            onChange={(e) => setFilterExhibitionId(e.target.value)}
          />
        </div>
        <div className="mt-4">
          <Button onClick={handleLoadArtworks} loading={loading}>
            Load Artworks
          </Button>
        </div>
      </Card>

      {/* Selection controls + Table */}
      {availableItems.length > 0 && (
        <Card className="overflow-hidden">
          {/* Selection toolbar */}
          <div className="flex items-center justify-between border-b border-primary-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={allSelected ? clearSelection : selectAll}
              >
                {allSelected ? 'Clear Selection' : 'Select All'}
              </Button>
              <span className="text-sm text-primary-500">
                {selectedCount} of {availableItems.length} selected
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-primary-100 bg-primary-50">
                <tr>
                  <th className="w-10 px-4 py-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={allSelected ? clearSelection : selectAll}
                      className="rounded border-primary-300"
                    />
                  </th>
                  <th className="px-4 py-2 font-medium text-primary-600">Title</th>
                  <th className="px-4 py-2 font-medium text-primary-600">Series</th>
                  <th className="px-4 py-2 font-medium text-primary-600">Status</th>
                  <th className="px-4 py-2 font-medium text-primary-600">Price</th>
                  <th className="px-4 py-2 font-medium text-primary-600">Gallery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-50">
                {availableItems.map((item) => {
                  const isSelected = selectedItems.some(
                    (s) => s.artworkId === item.artworkId,
                  );
                  const statusDef = ARTWORK_STATUSES.find(
                    (s) => s.value === item.currentStatus,
                  );
                  return (
                    <tr
                      key={item.artworkId}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-accent/5' : 'hover:bg-primary-50'}`}
                      onClick={() => toggleSelection(item.artworkId)}
                    >
                      <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(item.artworkId)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-primary-300"
                        />
                      </td>
                      <td className="px-4 py-2 font-medium text-primary-900">
                        {item.artworkTitle}
                      </td>
                      <td className="px-4 py-2 text-primary-600">
                        {seriesLabel(item.series)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusDef?.color ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {statusLabel(item.currentStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-primary-700">
                        {item.currentPrice != null && item.currency
                          ? formatCurrency(item.currentPrice, item.currency)
                          : '—'}
                      </td>
                      <td className="px-4 py-2 text-primary-600">
                        {item.galleryName ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {!loading && availableItems.length === 0 && (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-primary-500">
            Use the filters above and click <strong>Load Artworks</strong> to get started.
          </p>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      )}

      {/* Sticky Action Panel */}
      {availableItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-primary-200 bg-white/95 shadow-lg backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Change Status */}
              <div className="rounded-lg border border-primary-100 p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-500">
                  Change Status
                </h3>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      placeholder="Select status"
                      options={statusOptions}
                      value={statusAction}
                      onChange={(e) => setStatusAction(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleStatusChange}
                    loading={operationLoading}
                    disabled={selectedCount === 0}
                  >
                    Apply
                  </Button>
                </div>
              </div>

              {/* Update Prices */}
              <div className="rounded-lg border border-primary-100 p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-500">
                  Update Prices
                </h3>
                <div className="space-y-2">
                  <div className="flex items-end gap-2">
                    <div className="w-24">
                      <Select
                        options={[
                          { value: 'percentage', label: '%' },
                          { value: 'fixed', label: 'Fixed' },
                        ]}
                        value={priceChangeType}
                        onChange={(e) =>
                          setPriceChangeType(e.target.value as 'percentage' | 'fixed')
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder={priceChangeType === 'percentage' ? 'e.g. 10' : 'e.g. 500'}
                        value={priceValue}
                        onChange={(e) => setPriceValue(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Note (optional)"
                        value={priceNote}
                        onChange={(e) => setPriceNote(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handlePriceUpdate}
                      loading={operationLoading}
                      disabled={selectedCount === 0}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </div>

              {/* Assign Gallery */}
              <div className="rounded-lg border border-primary-100 p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-500">
                  Assign Gallery
                </h3>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      placeholder="Select gallery"
                      options={galleryOptions}
                      value={assignGalleryId}
                      onChange={(e) => setAssignGalleryId(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAssignGallery}
                    loading={operationLoading}
                    disabled={selectedCount === 0}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>

            {/* Selection summary */}
            {selectedCount > 0 && (
              <p className="mt-2 text-center text-xs text-primary-500">
                {selectedCount} artwork{selectedCount !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
