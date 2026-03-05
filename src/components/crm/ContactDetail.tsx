import { useState } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import type { ContactRow } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ContactDetailProps {
  contact: ContactRow;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const typeBadgeVariant: Record<ContactRow['type'], 'success' | 'warning' | 'info'> = {
  collector: 'success',
  prospect: 'warning',
  institution: 'info',
};

const typeLabel: Record<ContactRow['type'], string> = {
  collector: 'Collector',
  prospect: 'Prospect',
  institution: 'Institution',
};

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

export function ContactDetail({ contact, onEdit, onDelete }: ContactDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fullName = `${contact.first_name} ${contact.last_name}`;

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
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-primary-900">
              {fullName}
            </h1>
            <Badge variant={typeBadgeVariant[contact.type]}>
              {typeLabel[contact.type]}
            </Badge>
          </div>
          {contact.company && (
            <p className="mt-1 text-sm text-primary-500">{contact.company}</p>
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
          <InfoRow label="Email" value={contact.email} />
          <InfoRow label="Phone" value={contact.phone} />
          <InfoRow label="Source" value={contact.source} />
        </dl>
        {!contact.email && !contact.phone && !contact.source && (
          <p className="text-sm text-primary-400">No contact information provided.</p>
        )}
      </section>

      {/* Address */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Address
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoRow label="Street" value={contact.address} />
          <InfoRow label="City" value={contact.city} />
          <InfoRow label="Country" value={contact.country} />
        </dl>
        {!contact.address && !contact.city && !contact.country && (
          <p className="text-sm text-primary-400">No address provided.</p>
        )}
      </section>

      {/* Tags */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Tags
        </h2>
        {contact.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {contact.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-primary-400">No tags</p>
        )}
      </section>

      {/* Notes */}
      {contact.notes && (
        <section className="rounded-lg border border-primary-100 bg-white p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
            Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-primary-700">
            {contact.notes}
          </p>
        </section>
      )}

      {/* Confirm delete dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Contact"
        message={`Are you sure you want to delete "${fullName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
