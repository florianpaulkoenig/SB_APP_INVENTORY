import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Select } from '../ui/Select';
import { GalleryForwardingPDF } from '../pdf/GalleryForwardingPDF';
import { formatDate, formatDimensions, formatCurrency } from '../../lib/utils';
import { FORWARDING_STATUSES } from '../../lib/constants';
import type {
  GalleryForwardingOrderRow,
  ForwardingStatus,
} from '../../types/database';
import type { GalleryForwardingItemWithJoins } from '../../hooks/useGalleryForwarding';

// ---------------------------------------------------------------------------
// Language options
// ---------------------------------------------------------------------------

type Language = 'en' | 'de' | 'fr';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Francais' },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GalleryForwardingDetailProps {
  order: GalleryForwardingOrderRow;
  items: GalleryForwardingItemWithJoins[];
  fromGalleryName?: string | null;
  toGalleryName?: string | null;
  contactName?: string | null;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onStatusChange: (status: ForwardingStatus) => void;
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
// Forwarding Status Flow
// ---------------------------------------------------------------------------

function ForwardingStatusFlow({
  currentStatus,
  onStatusChange,
}: {
  currentStatus: ForwardingStatus;
  onStatusChange: (status: ForwardingStatus) => void;
}) {
  const steps: { value: ForwardingStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'prepared', label: 'Prepared' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'received', label: 'Received' },
  ];

  const currentIndex = steps.findIndex((s) => s.value === currentStatus);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        const isNext = index === currentIndex + 1;

        return (
          <div key={step.value} className="flex items-center gap-2">
            {index > 0 && (
              <svg className="hidden h-4 w-4 text-primary-300 sm:block" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            )}
            <button
              type="button"
              onClick={() => isNext ? onStatusChange(step.value) : undefined}
              disabled={!isNext}
              className={`
                rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap
                ${isActive
                  ? 'bg-primary-900 text-white'
                  : isCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : isNext
                      ? 'border border-primary-300 text-primary-700 hover:bg-primary-50 cursor-pointer'
                      : 'bg-primary-50 text-primary-400 cursor-not-allowed'
                }
              `}
            >
              {step.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GalleryForwardingDetail({
  order,
  items,
  fromGalleryName,
  toGalleryName,
  contactName,
  onEdit,
  onDelete,
  onAddItem,
  onRemoveItem,
  onStatusChange,
}: GalleryForwardingDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [downloading, setDownloading] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  // ---- PDF download ---------------------------------------------------------

  async function handleDownloadPDF() {
    setDownloading(true);

    try {
      const pdfItems = items.map((item) => ({
        reference_code: item.artworks?.reference_code ?? '',
        title: item.artworks?.title ?? '',
        medium: item.artworks?.medium ?? null,
        dimensions: formatDimensions(
          item.artworks?.height ?? null,
          item.artworks?.width ?? null,
          item.artworks?.depth ?? null,
          item.artworks?.dimension_unit ?? 'cm',
        ),
      }));

      const blob = await pdf(
        <GalleryForwardingPDF
          order={order}
          items={pdfItems}
          fromGalleryName={fromGalleryName}
          toGalleryName={toGalleryName}
          contactName={contactName}
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
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            {order.forwarding_number}
          </h1>
          <p className="mt-1 text-lg text-primary-700">{order.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusBadge status={order.status} />
            {order.shipping_date && (
              <span className="text-sm text-primary-500">
                {formatDate(order.shipping_date)}
              </span>
            )}
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

      {/* Status Flow */}
      <section className="rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Status
        </h2>
        <ForwardingStatusFlow
          currentStatus={order.status}
          onStatusChange={onStatusChange}
        />
      </section>

      {/* Overview */}
      <section className="rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Overview
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="From Gallery" value={fromGalleryName} />
          <InfoRow label="To Gallery" value={toGalleryName} />
          <InfoRow label="Contact" value={contactName} />
          <InfoRow
            label="Shipping Date"
            value={order.shipping_date ? formatDate(order.shipping_date) : null}
          />
          <InfoRow
            label="Estimated Arrival"
            value={order.estimated_arrival ? formatDate(order.estimated_arrival) : null}
          />
          <InfoRow label="Tracking Number" value={order.tracking_number} />
          <InfoRow label="Shipping Method" value={order.shipping_method} />
          {order.insurance_value != null && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">
                Insurance Value
              </dt>
              <dd className="mt-1 text-sm font-semibold text-primary-800">
                {formatCurrency(order.insurance_value, order.currency)}
              </dd>
            </div>
          )}
          <InfoRow label="Description" value={order.description} />
        </dl>
      </section>

      {/* Items */}
      <section className="rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-primary-900">
            Artworks ({items.length})
          </h2>
          <Button variant="outline" size="sm" onClick={onAddItem}>
            Add Artwork
          </Button>
        </div>

        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Reference
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Medium
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Dimensions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-primary-100">
                    <td className="px-4 py-3 font-mono text-sm text-primary-600">
                      {item.artworks?.reference_code ?? '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-sm text-primary-800">
                      {item.artworks?.title ?? '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-sm text-primary-600">
                      {item.artworks?.medium ?? '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-sm text-primary-600">
                      {formatDimensions(
                        item.artworks?.height ?? null,
                        item.artworks?.width ?? null,
                        item.artworks?.depth ?? null,
                        item.artworks?.dimension_unit ?? 'cm',
                      ) || '\u2014'}
                    </td>
                    <td className="px-4 py-3">
                      {item.artworks?.status ? (
                        <StatusBadge status={item.artworks.status} />
                      ) : (
                        '\u2014'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-primary-400">No artworks added yet.</p>
        )}
      </section>

      {/* PDF Download */}
      <section className="rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Forwarding Order PDF
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-48">
            <Select
              label="Language"
              options={[...LANGUAGE_OPTIONS]}
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            />
          </div>
          <Button onClick={handleDownloadPDF} loading={downloading}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download PDF
          </Button>
        </div>
      </section>

      {/* Notes */}
      {order.notes && (
        <section className="rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
            Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-primary-700">
            {order.notes}
          </p>
        </section>
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Forwarding Order"
        message={`Are you sure you want to delete forwarding order "${order.forwarding_number}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
