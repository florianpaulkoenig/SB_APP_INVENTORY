import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PackingListPDF } from '../pdf/PackingListPDF';
import { formatDate, formatDimensions } from '../../lib/utils';
import type { PackingListRow, PackingListItemRow } from '../../types/database';

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

export interface PackingListDetailProps {
  packingList: PackingListRow;
  deliveryNumber?: string | null;
  items: Array<
    PackingListItemRow & {
      artworks?: {
        title: string;
        reference_code: string;
        height: number | null;
        width: number | null;
        depth: number | null;
        dimension_unit: string;
        weight: number | null;
      };
    }
  >;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, data: Partial<PackingListItemRow>) => void;
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
// Inline editable cell component
// ---------------------------------------------------------------------------

function EditableCell({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-primary-200 bg-white px-2 py-1 text-sm text-primary-900 placeholder:text-primary-300 transition-colors focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PackingListDetail({
  packingList,
  deliveryNumber,
  items,
  onEdit,
  onDelete,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: PackingListDetailProps) {
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
      const pdfItems = items.map((item) => ({
        artwork_title: item.artworks?.title ?? 'Untitled',
        artwork_reference_code: item.artworks?.reference_code ?? '',
        artwork_dimensions: item.artworks
          ? formatDimensions(
              item.artworks.height,
              item.artworks.width,
              item.artworks.depth,
              item.artworks.dimension_unit,
            )
          : '',
        artwork_weight: item.artworks?.weight ?? null,
        crate_number: item.crate_number,
        packaging_type: item.packaging_type,
        special_handling: item.special_handling,
      }));

      const blob = await pdf(
        <PackingListPDF
          packingList={packingList}
          deliveryNumber={deliveryNumber}
          items={pdfItems}
          language={language}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${packingList.packing_number}_packing-list.pdf`;
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
            {packingList.packing_number}
          </h1>
          {packingList.packing_date && (
            <p className="mt-1 text-sm text-primary-500">
              {formatDate(packingList.packing_date)}
            </p>
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

      {/* ----------------------------------------------------------------- */}
      {/* Overview                                                          */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
          Overview
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Recipient" value={packingList.recipient_name} />
          <InfoRow
            label="Packing Date"
            value={packingList.packing_date ? formatDate(packingList.packing_date) : null}
          />
          <InfoRow label="Linked Delivery" value={deliveryNumber} />
        </dl>
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
            <table className="w-full min-w-[800px]">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Reference
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Title
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Dimensions
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Weight
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Crate #
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Packaging
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-primary-400">
                    Special Handling
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-primary-400">
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
                    <td className="px-3 py-3 font-mono text-sm text-primary-600">
                      {item.artworks?.reference_code ?? '\u2014'}
                    </td>
                    <td className="px-3 py-3 text-sm text-primary-800">
                      {item.artworks?.title ?? 'Untitled'}
                    </td>
                    <td className="px-3 py-3 text-sm text-primary-600">
                      {item.artworks
                        ? formatDimensions(
                            item.artworks.height,
                            item.artworks.width,
                            item.artworks.depth,
                            item.artworks.dimension_unit,
                          ) || '\u2014'
                        : '\u2014'}
                    </td>
                    <td className="px-3 py-3 text-sm text-primary-600">
                      {item.artworks?.weight != null
                        ? `${item.artworks.weight} kg`
                        : '\u2014'}
                    </td>
                    <td className="px-3 py-3">
                      <EditableCell
                        value={item.crate_number ?? ''}
                        placeholder="Crate #"
                        onChange={(val) =>
                          onUpdateItem(item.id, { crate_number: val || null })
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <EditableCell
                        value={item.packaging_type ?? ''}
                        placeholder="Type"
                        onChange={(val) =>
                          onUpdateItem(item.id, { packaging_type: val || null })
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <EditableCell
                        value={item.special_handling ?? ''}
                        placeholder="Instructions"
                        onChange={(val) =>
                          onUpdateItem(item.id, { special_handling: val || null })
                        }
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
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
          Packing List PDF
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-48">
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
      {packingList.notes && (
        <section className="rounded-lg border border-primary-100 bg-white p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-primary-900">
            Notes
          </h2>
          <p className="whitespace-pre-wrap text-sm text-primary-700">
            {packingList.notes}
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
        title="Delete Packing List"
        message={`Are you sure you want to delete packing list "${packingList.packing_number}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
