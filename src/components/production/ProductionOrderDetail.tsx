import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Select } from '../ui/Select';
import { ProductionOrderPDF } from '../pdf/ProductionOrderPDF';
import { formatDate, formatDimensions, formatCurrency } from '../../lib/utils';
import { PRODUCTION_STATUSES } from '../../lib/constants';
import type {
  ProductionOrderRow,
  ProductionOrderItemRow,
  ProductionStatus,
} from '../../types/database';

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

export interface ProductionOrderDetailProps {
  order: ProductionOrderRow;
  items: Array<
    ProductionOrderItemRow & {
      artworks?: {
        title: string;
        reference_code: string;
        status: string;
      } | null;
    }
  >;
  galleryName?: string | null;
  contactName?: string | null;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onAddItem: () => void;
  onEditItem: (itemId: string) => void;
  onDuplicateItem: (itemId: string) => void;
  onRemoveItem: (id: string) => void;
  onStatusChange: (status: ProductionStatus) => void;
  onConvertItem: (itemId: string) => void;
}

// ---------------------------------------------------------------------------
// Helper: info row (same pattern as DeliveryDetail / ArtworkDetail)
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
// Inline: Production Status Flow
// Draft -> Ordered -> In Production -> Quality Check -> Completed
// ---------------------------------------------------------------------------

function ProductionStatusFlow({
  currentStatus,
  onStatusChange,
}: {
  currentStatus: ProductionStatus;
  onStatusChange: (status: ProductionStatus) => void;
}) {
  const steps: { value: ProductionStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'in_production', label: 'In Production' },
    { value: 'quality_check', label: 'Quality Check' },
    { value: 'completed', label: 'Completed' },
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

export function ProductionOrderDetail({
  order,
  items,
  galleryName,
  contactName,
  onEdit,
  onDelete,
  onAddItem,
  onEditItem,
  onDuplicateItem,
  onRemoveItem,
  onStatusChange,
  onConvertItem,
}: ProductionOrderDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [downloading, setDownloading] = useState(false);

  // ---- Item price summary -------------------------------------------------
  const itemPriceSummary = (() => {
    let total = 0;
    let count = 0;
    for (const item of items) {
      if (item.price != null && item.price > 0) {
        const qty = item.quantity ?? 1;
        total += item.price * qty;
        count += qty;
      }
    }
    return { total, count };
  })();
  const itemCurrency = items.find((i) => i.currency)?.currency ?? order.currency ?? 'EUR';

  async function handleDelete() {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  // ---- PDF download -------------------------------------------------------

  async function handleDownloadPDF() {
    setDownloading(true);

    try {
      const pdfItems = items.map((item) => ({
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
            {order.order_number}
          </h1>
          <p className="mt-1 text-lg text-primary-700">{order.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StatusBadge status={order.status} />
            {order.ordered_date && (
              <span className="text-sm text-primary-500">
                {formatDate(order.ordered_date)}
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
      <section className="rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Status
        </h2>
        <ProductionStatusFlow
          currentStatus={order.status}
          onStatusChange={onStatusChange}
        />
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Overview                                                          */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Overview
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Title" value={order.title} />
          <InfoRow label="Description" value={order.description} />
          <InfoRow
            label="Ordered Date"
            value={order.ordered_date ? formatDate(order.ordered_date) : null}
          />
          <InfoRow
            label="Deadline"
            value={order.deadline ? formatDate(order.deadline) : null}
          />
          <InfoRow label="Gallery / Agent" value={galleryName} />
          <InfoRow label="Client" value={contactName} />
          {order.price != null && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">
                Price
              </dt>
              <dd className="mt-1 text-sm font-semibold text-primary-800">
                {formatCurrency(order.price, order.currency)}
              </dd>
            </div>
          )}
        </dl>
        {!order.title && !order.description && (
          <p className="text-sm text-primary-400">No overview details provided.</p>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Items                                                             */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-primary-900">
            Items
          </h2>
          <Button variant="outline" size="sm" onClick={onAddItem}>
            Add Item
          </Button>
        </div>

        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Medium
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Dimensions
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-primary-400">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-400">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Artwork
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
                    <td className="px-4 py-3 text-sm text-primary-800">
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-primary-600">
                      {item.medium ?? '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-sm text-primary-600">
                      {formatDimensions(
                        item.height,
                        item.width,
                        item.depth,
                        item.dimension_unit ?? 'cm',
                      ) || '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-primary-800">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-primary-800">
                      {item.price != null && item.price > 0
                        ? formatCurrency(item.price, item.currency ?? itemCurrency)
                        : '\u2014'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.artworks ? (
                        <span className="font-mono text-primary-600">
                          {item.artworks.reference_code}
                        </span>
                      ) : (
                        <span className="text-primary-400">\u2014</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit item"
                          onClick={() => onEditItem(item.id)}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Duplicate item"
                          onClick={() => onDuplicateItem(item.id)}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                          </svg>
                        </Button>
                        {!item.artwork_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onConvertItem(item.id)}
                          >
                            Convert
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveItem(item.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {itemPriceSummary.total > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-primary-200">
                    <td colSpan={4} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-primary-500">
                      Total ({itemPriceSummary.count} {itemPriceSummary.count === 1 ? 'piece' : 'pieces'})
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-primary-900">
                      {formatCurrency(itemPriceSummary.total, itemCurrency)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <p className="text-sm text-primary-400">No items added yet.</p>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* PDF Download                                                      */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Production Order PDF
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

      {/* ----------------------------------------------------------------- */}
      {/* Confirm delete dialog                                             */}
      {/* ----------------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Production Order"
        message={`Are you sure you want to delete production order "${order.order_number}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
