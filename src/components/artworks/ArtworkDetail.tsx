import { useState } from 'react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { formatCurrency, formatDimensions } from '../../lib/utils';
import {
  EDITION_TYPES,
  ARTWORK_CATEGORIES,
  ARTWORK_MOTIFS,
  ARTWORK_SERIES,
  CURRENCIES,
  SALE_TYPES,
} from '../../lib/constants';
import type { ArtworkRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkDetailProps {
  artwork: ArtworkRow;
  galleryName?: string | null;
  isAdmin?: boolean;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onMarkSold?: (salePrice: number, currency: string, saleDate: string, saleCity: string, saleCountry: string, saleType: string) => Promise<void>;
  onDuplicate?: () => Promise<void>;
  onTogglePartnerAvailability?: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helper: info row
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-primary-800">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: lookup label from a constants array
// ---------------------------------------------------------------------------

function lookupLabel(
  list: ReadonlyArray<{ readonly value: string; readonly label: string }>,
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return list.find((item) => item.value === value)?.label ?? value;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ArtworkDetail({
  artwork,
  galleryName,
  isAdmin,
  onEdit,
  onDelete,
  onMarkSold,
  onDuplicate,
  onTogglePartnerAvailability,
}: ArtworkDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [togglingPartner, setTogglingPartner] = useState(false);

  // ---- Sold dialog state ----
  const [showSoldDialog, setShowSoldDialog] = useState(false);
  const [salePrice, setSalePrice] = useState(artwork.price?.toString() ?? '');
  const [saleCurrency, setSaleCurrency] = useState(artwork.currency ?? 'EUR');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [saleCityState, setSaleCityState] = useState('');
  const [saleCountryState, setSaleCountryState] = useState('');
  const [saleTypeState, setSaleTypeState] = useState('');
  const [soldLoading, setSoldLoading] = useState(false);

  // Formatted values
  const unframedDimensions = formatDimensions(
    artwork.height,
    artwork.width,
    artwork.depth,
    artwork.dimension_unit,
  );

  const framedDimensions = formatDimensions(
    artwork.framed_height,
    artwork.framed_width,
    artwork.framed_depth,
    artwork.dimension_unit,
  );

  const editionLabel = lookupLabel(EDITION_TYPES, artwork.edition_type);
  const categoryLabel = lookupLabel(ARTWORK_CATEGORIES, artwork.category);
  const motifLabel = lookupLabel(ARTWORK_MOTIFS, artwork.motif);
  const seriesLabel = lookupLabel(ARTWORK_SERIES, artwork.series);

  const editionDisplay =
    artwork.edition_type === 'numbered' &&
    artwork.edition_number != null &&
    artwork.edition_total != null
      ? `${editionLabel} -- ${artwork.edition_number} of ${artwork.edition_total}`
      : editionLabel;

  async function handleDelete() {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  async function handleMarkSold() {
    if (!onMarkSold) return;
    const price = parseFloat(salePrice);
    if (isNaN(price) || price <= 0) return;

    setSoldLoading(true);
    await onMarkSold(price, saleCurrency, saleDate, saleCityState, saleCountryState, saleTypeState);
    setSoldLoading(false);
    setShowSoldDialog(false);
  }

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            {artwork.title}
          </h1>
          <p className="mt-1 font-mono text-sm text-primary-400">
            {artwork.reference_code}
          </p>
          <div className="mt-2">
            <StatusBadge status={artwork.status} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onMarkSold && artwork.status !== 'sold' && (
            <Button
              variant="outline"
              onClick={() => {
                setSalePrice(artwork.price?.toString() ?? '');
                setSaleCurrency(artwork.currency ?? 'EUR');
                setSaleDate(new Date().toISOString().slice(0, 10));
                setSaleCityState('');
                setSaleCountryState('');
                setSaleTypeState('');
                setShowSoldDialog(true);
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
              Mark as Sold
            </Button>
          )}
          {onDuplicate && (
            <Button
              variant="outline"
              loading={duplicating}
              onClick={async () => {
                setDuplicating(true);
                await onDuplicate();
                setDuplicating(false);
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.5a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
              Duplicate
            </Button>
          )}
          <Button variant="outline" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
            loading={deleting}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Overview                                                          */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Overview
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Medium" value={artwork.medium} />
          <InfoRow label="Year" value={artwork.year?.toString()} />
          <InfoRow label="Category" value={categoryLabel} />
          <InfoRow label="Motif" value={motifLabel} />
          <InfoRow label="Series" value={seriesLabel} />
          <InfoRow label="Current Location" value={artwork.current_location} />
          <InfoRow label="Gallery" value={galleryName} />
          <InfoRow label="Inventory Number" value={artwork.inventory_number} />

          {/* Available for Partners */}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">
              Available for Partners
            </dt>
            <dd className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  artwork.available_for_partners
                    ? 'bg-green-100 text-green-700'
                    : 'bg-primary-100 text-primary-500'
                }`}
              >
                {artwork.available_for_partners ? 'Yes' : 'No'}
              </span>
              {isAdmin && onTogglePartnerAvailability && (
                <button
                  type="button"
                  disabled={togglingPartner}
                  onClick={async () => {
                    setTogglingPartner(true);
                    await onTogglePartnerAvailability();
                    setTogglingPartner(false);
                  }}
                  className="text-xs text-accent hover:text-accent/80 underline disabled:opacity-50"
                >
                  {togglingPartner ? 'Saving...' : artwork.available_for_partners ? 'Remove' : 'Enable'}
                </button>
              )}
            </dd>
          </div>
        </dl>
        {!artwork.medium &&
          artwork.year == null &&
          !artwork.category &&
          !artwork.current_location && (
            <p className="text-sm text-primary-400">No overview details provided.</p>
          )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Dimensions                                                        */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Dimensions
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoRow label="Unframed" value={unframedDimensions || null} />
          <InfoRow label="Framed" value={framedDimensions || null} />
          <InfoRow
            label="Weight"
            value={artwork.weight != null ? `${artwork.weight} kg` : null}
          />
        </dl>
        {!unframedDimensions && !framedDimensions && artwork.weight == null && (
          <p className="text-sm text-primary-400">No dimension data provided.</p>
        )}
        {(artwork as Record<string, unknown>).is_window && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              Window Artwork
            </span>
            {(artwork as Record<string, unknown>).lamination_needed && (
              <>
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Lamination
                </span>
                {(artwork as Record<string, unknown>).lamination_cost != null && (
                  <span className="text-xs text-primary-500">
                    Cost: {formatCurrency((artwork as Record<string, unknown>).lamination_cost as number, artwork.currency)}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Edition                                                           */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Edition
        </h2>
        {editionDisplay ? (
          <p className="text-sm text-primary-800">{editionDisplay}</p>
        ) : (
          <p className="text-sm text-primary-400">No edition information.</p>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Price                                                             */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Price
        </h2>
        {artwork.price != null ? (
          <p className="text-2xl font-semibold text-accent">
            {formatCurrency(artwork.price, artwork.currency)}
          </p>
        ) : (
          <p className="text-sm text-primary-400">No price set.</p>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Notes                                                             */}
      {/* ----------------------------------------------------------------- */}
      {artwork.notes && (
        <section className="rounded-lg border border-primary-100 bg-white p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
            Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-primary-700">
            {artwork.notes}
          </p>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Mark as Sold dialog                                               */}
      {/* ----------------------------------------------------------------- */}
      <Modal
        isOpen={showSoldDialog}
        onClose={() => setShowSoldDialog(false)}
        title="Mark as Sold"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-primary-600">
            Enter the realized sales price for <span className="font-semibold">{artwork.title}</span>.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                label="Sale Price"
                type="number"
                step="0.01"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Select
              label="Currency"
              options={[...CURRENCIES]}
              value={saleCurrency}
              onChange={(e) => setSaleCurrency(e.target.value)}
            />
          </div>
          <Input
            label="Sale Date"
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="City"
              placeholder="e.g. Basel"
              value={saleCityState}
              onChange={(e) => setSaleCityState(e.target.value)}
            />
            <Input
              label="Country"
              placeholder="e.g. Switzerland"
              value={saleCountryState}
              onChange={(e) => setSaleCountryState(e.target.value)}
            />
          </div>
          <Select
            label="Sale Type"
            options={[
              { value: '', label: 'Select type' },
              ...SALE_TYPES,
            ]}
            value={saleTypeState}
            onChange={(e) => setSaleTypeState(e.target.value)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowSoldDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkSold}
              loading={soldLoading}
              disabled={!salePrice || parseFloat(salePrice) <= 0}
            >
              Confirm Sale
            </Button>
          </div>
        </div>
      </Modal>

      {/* ----------------------------------------------------------------- */}
      {/* Confirm delete dialog                                             */}
      {/* ----------------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Artwork"
        message={`Are you sure you want to delete "${artwork.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
