import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Select } from '../ui/Select';
import { DeliveryReceiptPDF } from '../pdf/DeliveryReceiptPDF';
import { formatDate, formatDimensions, downloadBlob } from '../../lib/utils';
import { DELIVERY_STATUSES, ARTWORK_CATEGORIES } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import type { DeliveryRow, DeliveryItemRow, DeliveryStatus } from '../../types/database';

// ---------------------------------------------------------------------------
// Language options for PDF download
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

export interface DeliveryDetailProps {
  delivery: DeliveryRow;
  galleryName?: string | null;
  items: Array<
    DeliveryItemRow & {
      artworks?: {
        title: string;
        reference_code: string;
        medium: string | null;
        category: string | null;
        status: string;
        height?: number | null;
        width?: number | null;
        depth?: number | null;
        dimension_unit?: string;
      };
    }
  >;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onStatusChange: (status: DeliveryStatus) => void;
}

// ---------------------------------------------------------------------------
// Helper: info row (same pattern as ArtworkDetail / InvoiceDetail)
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
// Inline: Delivery Status Flow (Draft -> Shipped -> Delivered)
// ---------------------------------------------------------------------------

function DeliveryStatusFlow({
  currentStatus,
  onStatusChange,
}: {
  currentStatus: DeliveryStatus;
  onStatusChange: (status: DeliveryStatus) => void;
}) {
  const steps: { value: DeliveryStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
  ];

  const currentIndex = steps.findIndex((s) => s.value === currentStatus);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        const isNext = index === currentIndex + 1;

        return (
          <div key={step.value} className="flex items-center gap-2">
            {index > 0 && (
              <svg className="h-4 w-4 text-primary-300" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            )}
            <button
              type="button"
              onClick={() => isNext ? onStatusChange(step.value) : undefined}
              disabled={!isNext}
              className={`
                rounded-md px-3 py-1.5 text-xs font-medium transition-colors
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

export function DeliveryDetail({
  delivery,
  galleryName,
  items,
  onEdit,
  onDelete,
  onAddItem,
  onRemoveItem,
  onStatusChange,
}: DeliveryDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [downloading, setDownloading] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  // ---- PDF download -------------------------------------------------------

  async function handleDownloadPDF() {
    setDownloading(true);

    try {
      // Fetch primary image URLs for all artworks in this delivery
      const artworkIds = items
        .map((item) => item.artwork_id)
        .filter(Boolean);

      const imageMap: Record<string, string> = {};

      if (artworkIds.length > 0) {
        const { data: primaryImages } = await supabase
          .from('artwork_images')
          .select('artwork_id, storage_path')
          .in('artwork_id', artworkIds)
          .eq('is_primary', true);

        if (primaryImages) {
          for (const img of primaryImages) {
            const { data: urlData } = await supabase.storage
              .from('artwork-images')
              .createSignedUrl(img.storage_path, 600);
            if (urlData) {
              imageMap[img.artwork_id] = urlData.signedUrl;
            }
          }
        }
      }

      // Category label helper
      const categoryLabel = (val: string | null) => {
        if (!val) return null;
        return ARTWORK_CATEGORIES.find((c) => c.value === val)?.label ?? val;
      };

      const pdfItems = items.map((item) => ({
        artwork_title: item.artworks?.title ?? 'Untitled',
        artwork_reference_code: item.artworks?.reference_code ?? '',
        artwork_category: categoryLabel(item.artworks?.category ?? null),
        artwork_dimensions: item.artworks
          ? formatDimensions(
              item.artworks.height ?? null,
              item.artworks.width ?? null,
              item.artworks.depth ?? null,
              item.artworks.dimension_unit ?? 'cm',
            )
          : '',
        artwork_image_url: imageMap[item.artwork_id] ?? null,
      }));

      const blob = await pdf(
        <DeliveryReceiptPDF
          delivery={delivery}
          galleryName={galleryName}
          items={pdfItems}
          language={language}
        />,
      ).toBlob();

      downloadBlob(blob, `${delivery.delivery_number}_delivery-receipt.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            {delivery.delivery_number}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusBadge status={delivery.status} />
            {delivery.delivery_date && (
              <span className="text-sm text-primary-500">
                {formatDate(delivery.delivery_date)}
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

      {/* ----------------------------------------------------------------- */}
      {/* Status Flow                                                       */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Status
        </h2>
        <DeliveryStatusFlow
          currentStatus={delivery.status}
          onStatusChange={onStatusChange}
        />
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Overview                                                          */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Overview
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Recipient" value={delivery.recipient_name} />
          <InfoRow label="Address" value={delivery.recipient_address} />
          <InfoRow label="Gallery" value={galleryName} />
          <InfoRow
            label="Delivery Date"
            value={delivery.delivery_date ? formatDate(delivery.delivery_date) : null}
          />
        </dl>
        {!delivery.recipient_name && !galleryName && (
          <p className="text-sm text-primary-400">No overview details provided.</p>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Items                                                             */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-primary-900">
            Artworks
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
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-primary-100"
                  >
                    <td className="px-4 py-3 font-mono text-sm text-primary-600">
                      {item.artworks?.reference_code ?? '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-sm text-primary-800">
                      {item.artworks?.title ?? 'Untitled'}
                    </td>
                    <td className="px-4 py-3 text-sm text-primary-600">
                      {item.artworks?.medium ?? '\u2014'}
                    </td>
                    <td className="px-4 py-3">
                      {item.artworks?.status ? (
                        <StatusBadge status={item.artworks.status} />
                      ) : (
                        <span className="text-sm text-primary-400">\u2014</span>
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

      {/* ----------------------------------------------------------------- */}
      {/* PDF Download                                                      */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Delivery Receipt PDF
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
            Download PDF
          </Button>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Notes                                                             */}
      {/* ----------------------------------------------------------------- */}
      {delivery.notes && (
        <section className="rounded-lg border border-primary-100 bg-white p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
            Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-primary-700">
            {delivery.notes}
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
        title="Delete Delivery"
        message={`Are you sure you want to delete delivery "${delivery.delivery_number}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
