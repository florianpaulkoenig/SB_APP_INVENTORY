import { useState } from 'react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { formatCurrency, formatDimensions } from '../../lib/utils';
import {
  EDITION_TYPES,
  ARTWORK_CATEGORIES,
  ARTWORK_MOTIFS,
  ARTWORK_SERIES,
} from '../../lib/constants';
import type { ArtworkRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArtworkDetailProps {
  artwork: ArtworkRow;
  galleryName?: string | null;
  onEdit: () => void;
  onDelete: () => Promise<void>;
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
  onEdit,
  onDelete,
}: ArtworkDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
