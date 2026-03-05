import { useState } from 'react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { GalleryRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GalleryDetailProps {
  gallery: GalleryRow;
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
// Component
// ---------------------------------------------------------------------------

export function GalleryDetail({ gallery, onEdit, onDelete }: GalleryDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const location = [gallery.address, gallery.city, gallery.country]
    .filter(Boolean)
    .join(', ');

  async function handleDelete() {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            {gallery.name}
          </h1>
          {location && (
            <p className="mt-1 text-sm text-primary-500">{location}</p>
          )}
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

      {/* Contact Information */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Contact Information
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow label="Contact Person" value={gallery.contact_person} />
          <InfoRow label="Email" value={gallery.email} />
          <InfoRow label="Phone" value={gallery.phone} />
        </dl>
        {!gallery.contact_person && !gallery.email && !gallery.phone && (
          <p className="text-sm text-primary-400">No contact information provided.</p>
        )}
      </section>

      {/* Address */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Address
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoRow label="Street" value={gallery.address} />
          <InfoRow label="City" value={gallery.city} />
          <InfoRow label="Country" value={gallery.country} />
        </dl>
        {!gallery.address && !gallery.city && !gallery.country && (
          <p className="text-sm text-primary-400">No address provided.</p>
        )}
      </section>

      {/* Commission Rate */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Commission Rate
        </h2>
        {gallery.commission_rate != null ? (
          <p className="text-2xl font-semibold text-accent">
            {gallery.commission_rate}%
          </p>
        ) : (
          <p className="text-sm text-primary-400">No commission rate set.</p>
        )}
      </section>

      {/* Notes */}
      {gallery.notes && (
        <section className="rounded-lg border border-primary-100 bg-white p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
            Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-primary-700">
            {gallery.notes}
          </p>
        </section>
      )}

      {/* Linked Artworks placeholder */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Artworks on Consignment
        </h2>
        <p className="text-sm text-primary-400">
          Artworks on consignment will appear here.
        </p>
      </section>

      {/* Confirm delete dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Gallery"
        message={`Are you sure you want to delete "${gallery.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
