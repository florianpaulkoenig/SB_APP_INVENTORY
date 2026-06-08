// ---------------------------------------------------------------------------
// NOA Inventory -- Packing List Detail
// Structured crates view: named crates with artworks assigned per crate.
// ---------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PackingListPDF } from '../pdf/PackingListPDF';
import { formatDate, formatDimensions, downloadBlob } from '../../lib/utils';
import type { PackingListRow, PackingListItemRow, PackingListCrateRow, PackingListCrateInsert, PackingListCrateUpdate } from '../../types/database';

// ---------------------------------------------------------------------------
// Language options for PDF download
// ---------------------------------------------------------------------------

type Language = 'en' | 'de' | 'fr';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Francais' },
] as const;

const PACKAGING_TYPE_OPTIONS = [
  { value: '', label: '— None —' },
  { value: 'wooden_crate', label: 'Wooden Crate' },
  { value: 'cardboard_box', label: 'Cardboard Box' },
  { value: 'tube', label: 'Tube' },
  { value: 'art_transit_case', label: 'Art Transit Case' },
  { value: 'travel_frame', label: 'Travel Frame' },
  { value: 'other', label: 'Other' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PackingListDetailItem extends PackingListItemRow {
  artworks?: {
    title: string;
    reference_code: string;
    height: number | null;
    width: number | null;
    depth: number | null;
    dimension_unit: string;
    weight: number | null;
  } | null;
}

export interface PackingListDetailProps {
  packingList: PackingListRow;
  deliveryNumber?: string | null;
  items: PackingListDetailItem[];
  itemsLoading?: boolean;
  crates: PackingListCrateRow[];
  cratesLoading?: boolean;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem: (id: string, data: Partial<PackingListItemRow>) => void;
  onAddCrate: (data: Omit<PackingListCrateInsert, 'user_id' | 'packing_list_id'>) => Promise<PackingListCrateRow | null>;
  onUpdateCrate: (id: string, data: PackingListCrateUpdate) => Promise<PackingListCrateRow | null>;
  onRemoveCrate: (id: string) => Promise<boolean>;
  onAssignItemToCrate: (itemId: string, crateId: string | null) => Promise<boolean>;
  onRefetchItems: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-primary-400">{label}</dt>
      <dd className="mt-1 text-sm text-primary-800">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Crate form (add / edit)
// ---------------------------------------------------------------------------

interface CrateFormData {
  crate_name: string;
  width: string;
  height: string;
  depth: string;
  dimension_unit: string;
  weight: string;
  packaging_type: string;
  notes: string;
}

function emptyCrateForm(): CrateFormData {
  return { crate_name: '', width: '', height: '', depth: '', dimension_unit: 'cm', weight: '', packaging_type: '', notes: '' };
}

function crateToFormData(c: PackingListCrateRow): CrateFormData {
  return {
    crate_name: c.crate_name,
    width: c.width != null ? String(c.width) : '',
    height: c.height != null ? String(c.height) : '',
    depth: c.depth != null ? String(c.depth) : '',
    dimension_unit: c.dimension_unit ?? 'cm',
    weight: c.weight != null ? String(c.weight) : '',
    packaging_type: c.packaging_type ?? '',
    notes: c.notes ?? '',
  };
}

interface CrateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CrateFormData) => Promise<void>;
  initialData?: CrateFormData;
  title: string;
  saving: boolean;
}

function CrateModal({ isOpen, onClose, onSave, initialData, title, saving }: CrateModalProps) {
  const [form, setForm] = useState<CrateFormData>(initialData ?? emptyCrateForm());

  // Reset form whenever modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setForm(initialData ?? emptyCrateForm());
    }
  }, [isOpen, initialData]);

  function set(field: keyof CrateFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
    };
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <Input
          label="Crate Name *"
          value={form.crate_name}
          onChange={set('crate_name')}
          placeholder="e.g. Crate A, Box 1"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Input label="Width" type="number" value={form.width} onChange={set('width')} placeholder="0" />
          <Input label="Height" type="number" value={form.height} onChange={set('height')} placeholder="0" />
          <Input label="Depth" type="number" value={form.depth} onChange={set('depth')} placeholder="0" />
          <div>
            <label className="mb-1 block text-xs font-medium text-primary-600">Unit</label>
            <select
              value={form.dimension_unit}
              onChange={set('dimension_unit')}
              className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            >
              <option value="cm">cm</option>
              <option value="mm">mm</option>
              <option value="in">in</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Weight (kg)" type="number" value={form.weight} onChange={set('weight')} placeholder="0.00" />
          <div>
            <label className="mb-1 block text-xs font-medium text-primary-600">Packaging Type</label>
            <select
              value={form.packaging_type}
              onChange={set('packaging_type')}
              className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            >
              {PACKAGING_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary-600">Notes</label>
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={2}
            className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 placeholder:text-primary-300 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            placeholder="Fragile, keep upright, etc."
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave(form)}
            loading={saving}
            disabled={!form.crate_name.trim()}
          >
            Save Crate
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Artwork row inside a crate
// ---------------------------------------------------------------------------

interface ArtworkRowProps {
  item: PackingListDetailItem;
  crateOptions: { value: string; label: string }[];
  currentCrateId: string | null;
  onAssign: (crateId: string | null) => void;
  onUpdateItem: (data: Partial<PackingListItemRow>) => void;
  onRemove: () => void;
}

function ArtworkRow({ item, crateOptions, currentCrateId, onAssign, onUpdateItem, onRemove }: ArtworkRowProps) {
  const art = item.artworks;
  return (
    <div className="flex flex-wrap items-start gap-3 border-b border-primary-50 py-3 last:border-0">
      {/* Artwork info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs text-primary-500">{art?.reference_code ?? '—'}</span>
          <span className="text-sm font-medium text-primary-900">{art?.title ?? 'Untitled'}</span>
        </div>
        <div className="mt-0.5 text-xs text-primary-400">
          {art ? (
            <>
              {formatDimensions(art.height, art.width, art.depth, art.dimension_unit) || '—'}
              {art.weight != null && <span> · {art.weight} kg</span>}
            </>
          ) : '—'}
        </div>
      </div>

      {/* Special handling note */}
      <div className="w-36">
        <input
          type="text"
          value={item.special_handling ?? ''}
          onChange={(e) => onUpdateItem({ special_handling: e.target.value || null })}
          placeholder="Handling notes"
          className="w-full rounded border border-primary-200 bg-white px-2 py-1 text-xs text-primary-800 placeholder:text-primary-300 focus:border-accent focus:outline-none"
        />
      </div>

      {/* Assign to crate */}
      <div className="w-36">
        <select
          value={currentCrateId ?? ''}
          onChange={(e) => onAssign(e.target.value || null)}
          className="w-full rounded border border-primary-200 bg-white px-2 py-1 text-xs text-primary-800 focus:border-accent focus:outline-none"
        >
          <option value="">Unassigned</option>
          {crateOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 text-xs text-red-400 hover:text-red-600 transition-colors"
        title="Remove from packing list"
      >
        Remove
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PackingListDetail({
  packingList,
  deliveryNumber,
  items,
  itemsLoading,
  crates,
  onEdit,
  onDelete,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onAddCrate,
  onUpdateCrate,
  onRemoveCrate,
  onAssignItemToCrate,
  onRefetchItems,
}: PackingListDetailProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [downloading, setDownloading] = useState(false);

  // Crate modal state
  const [showAddCrate, setShowAddCrate] = useState(false);
  const [editingCrate, setEditingCrate] = useState<PackingListCrateRow | null>(null);
  const [savingCrate, setSavingCrate] = useState(false);
  const [crateToDelete, setCrateToDelete] = useState<PackingListCrateRow | null>(null);
  const [deletingCrate, setDeletingCrate] = useState(false);

  // ---- Crate CRUD handlers -------------------------------------------------

  async function handleAddCrate(form: CrateFormData) {
    setSavingCrate(true);
    const result = await onAddCrate({
      crate_name: form.crate_name.trim(),
      width: form.width ? parseFloat(form.width) : null,
      height: form.height ? parseFloat(form.height) : null,
      depth: form.depth ? parseFloat(form.depth) : null,
      dimension_unit: form.dimension_unit,
      weight: form.weight ? parseFloat(form.weight) : null,
      packaging_type: form.packaging_type || null,
      notes: form.notes.trim() || null,
    });
    setSavingCrate(false);
    if (result) setShowAddCrate(false);
  }

  async function handleUpdateCrate(form: CrateFormData) {
    if (!editingCrate) return;
    setSavingCrate(true);
    const result = await onUpdateCrate(editingCrate.id, {
      crate_name: form.crate_name.trim(),
      width: form.width ? parseFloat(form.width) : null,
      height: form.height ? parseFloat(form.height) : null,
      depth: form.depth ? parseFloat(form.depth) : null,
      dimension_unit: form.dimension_unit,
      weight: form.weight ? parseFloat(form.weight) : null,
      packaging_type: form.packaging_type || null,
      notes: form.notes.trim() || null,
    });
    setSavingCrate(false);
    if (result) setEditingCrate(null);
  }

  async function handleDeleteCrate() {
    if (!crateToDelete) return;
    setDeletingCrate(true);
    await onRemoveCrate(crateToDelete.id);
    setDeletingCrate(false);
    setCrateToDelete(null);
    await onRefetchItems();
  }

  async function handleAssign(itemId: string, crateId: string | null) {
    await onAssignItemToCrate(itemId, crateId);
    await onRefetchItems();
  }

  async function handleDelete() {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  // ---- Derived data -------------------------------------------------------

  const crateOptions = crates.map((c) => ({ value: c.id, label: c.crate_name }));
  const unassignedItems = items.filter((item) => !item.crate_id);
  const itemsByCrate = new Map<string, PackingListDetailItem[]>();
  for (const crate of crates) {
    itemsByCrate.set(crate.id, items.filter((item) => item.crate_id === crate.id));
  }

  // ---- PDF download -------------------------------------------------------

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      // Build crate groups for PDF
      const pdfCrates = crates.map((crate) => {
        const crateItems = itemsByCrate.get(crate.id) ?? [];
        const dimParts = [crate.width, crate.height, crate.depth].filter((v): v is number => v != null);
        return {
          crate_name: crate.crate_name,
          dimensions: dimParts.length > 0 ? `${dimParts.join(' × ')} ${crate.dimension_unit}` : null,
          weight: crate.weight,
          packaging_type: crate.packaging_type,
          notes: crate.notes,
          items: crateItems.map((item) => ({
            artwork_title: item.artworks?.title ?? 'Untitled',
            artwork_reference_code: item.artworks?.reference_code ?? '',
            artwork_dimensions: item.artworks
              ? formatDimensions(item.artworks.height, item.artworks.width, item.artworks.depth, item.artworks.dimension_unit)
              : '',
            artwork_weight: item.artworks?.weight ?? null,
            special_handling: item.special_handling,
            notes: null,
          })),
        };
      });

      const pdfUnassigned = unassignedItems.map((item) => ({
        artwork_title: item.artworks?.title ?? 'Untitled',
        artwork_reference_code: item.artworks?.reference_code ?? '',
        artwork_dimensions: item.artworks
          ? formatDimensions(item.artworks.height, item.artworks.width, item.artworks.depth, item.artworks.dimension_unit)
          : '',
        artwork_weight: item.artworks?.weight ?? null,
        special_handling: item.special_handling,
        notes: null,
      }));

      const blob = await pdf(
        <PackingListPDF
          packingList={packingList}
          deliveryNumber={deliveryNumber}
          crates={pdfCrates}
          unassignedItems={pdfUnassigned}
          language={language}
        />,
      ).toBlob();

      downloadBlob(blob, `${packingList.packing_number}_packing-list.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  // ---- Render -------------------------------------------------------------

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
            <p className="mt-1 text-sm text-primary-500">{formatDate(packingList.packing_date)}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onEdit}>Edit</Button>
          <Button variant="danger" onClick={() => setShowDeleteConfirm(true)} loading={deleting}>Delete</Button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Overview                                                          */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">Overview</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Recipient" value={packingList.recipient_name} />
          <InfoRow label="Packing Date" value={packingList.packing_date ? formatDate(packingList.packing_date) : null} />
          <InfoRow label="Linked Delivery" value={deliveryNumber} />
        </dl>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Crates + artworks                                                 */}
      {/* ----------------------------------------------------------------- */}
      <section className="space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-primary-900">
            Crates <span className="ml-1 text-sm font-normal text-primary-400">({crates.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onAddItem}>+ Add Artwork</Button>
            <Button size="sm" onClick={() => setShowAddCrate(true)}>+ Add Crate</Button>
          </div>
        </div>

        {/* Crate cards */}
        {crates.map((crate) => {
          const crateItems = itemsByCrate.get(crate.id) ?? [];
          const dimParts = [crate.width, crate.height, crate.depth].filter((v): v is number => v != null);
          const dimStr = dimParts.length > 0 ? `${dimParts.join(' × ')} ${crate.dimension_unit}` : null;

          return (
            <div key={crate.id} className="rounded-lg border border-primary-200 bg-white">
              {/* Crate header */}
              <div className="flex flex-wrap items-start gap-3 border-b border-primary-100 bg-primary-50 px-5 py-3 rounded-t-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* Crate icon */}
                    <svg className="h-4 w-4 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                    </svg>
                    <span className="font-semibold text-primary-900">{crate.crate_name}</span>
                    <span className="text-xs text-primary-400">
                      {crateItems.length} artwork{crateItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-primary-500">
                    {dimStr && <span>📐 {dimStr}</span>}
                    {crate.weight != null && <span>⚖️ {crate.weight} kg</span>}
                    {crate.packaging_type && (
                      <span className="rounded bg-primary-100 px-1.5 py-0.5 text-primary-600">
                        {PACKAGING_TYPE_OPTIONS.find((o) => o.value === crate.packaging_type)?.label ?? crate.packaging_type}
                      </span>
                    )}
                    {crate.notes && <span className="italic">"{crate.notes}"</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingCrate(crate)}
                    className="rounded p-1.5 text-primary-400 hover:bg-primary-100 hover:text-primary-700 transition-colors"
                    title="Edit crate"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCrateToDelete(crate)}
                    className="rounded p-1.5 text-red-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="Delete crate"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Artworks in this crate */}
              <div className="px-5 py-1">
                {crateItems.length > 0 ? (
                  <>
                    {/* Column headers */}
                    <div className="hidden sm:flex gap-3 pt-2 pb-1">
                      <span className="flex-1 text-xs font-medium uppercase tracking-wider text-primary-300">Artwork</span>
                      <span className="w-36 text-xs font-medium uppercase tracking-wider text-primary-300">Handling Notes</span>
                      <span className="w-36 text-xs font-medium uppercase tracking-wider text-primary-300">Assign to Crate</span>
                      <span className="w-14" />
                    </div>
                    {crateItems.map((item) => (
                      <ArtworkRow
                        key={item.id}
                        item={item}
                        crateOptions={crateOptions}
                        currentCrateId={item.crate_id}
                        onAssign={(crateId) => handleAssign(item.id, crateId)}
                        onUpdateItem={(data) => onUpdateItem(item.id, data)}
                        onRemove={() => onRemoveItem(item.id)}
                      />
                    ))}
                  </>
                ) : (
                  <p className="py-4 text-sm text-primary-300 italic">No artworks assigned to this crate.</p>
                )}
              </div>
            </div>
          );
        })}

        {/* Unassigned artworks */}
        {(unassignedItems.length > 0 || items.length === 0) && (
          <div className="rounded-lg border border-dashed border-primary-200 bg-white">
            <div className="border-b border-primary-100 bg-primary-50/50 px-5 py-3 rounded-t-lg">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H2.25" />
                </svg>
                <span className="font-medium text-primary-700">Unassigned Artworks</span>
                <span className="text-xs text-primary-400">({unassignedItems.length})</span>
              </div>
            </div>
            <div className="px-5 py-1">
              {unassignedItems.length > 0 ? (
                <>
                  <div className="hidden sm:flex gap-3 pt-2 pb-1">
                    <span className="flex-1 text-xs font-medium uppercase tracking-wider text-primary-300">Artwork</span>
                    <span className="w-36 text-xs font-medium uppercase tracking-wider text-primary-300">Handling Notes</span>
                    <span className="w-36 text-xs font-medium uppercase tracking-wider text-primary-300">Assign to Crate</span>
                    <span className="w-14" />
                  </div>
                  {unassignedItems.map((item) => (
                    <ArtworkRow
                      key={item.id}
                      item={item}
                      crateOptions={crateOptions}
                      currentCrateId={null}
                      onAssign={(crateId) => handleAssign(item.id, crateId)}
                      onUpdateItem={(data) => onUpdateItem(item.id, data)}
                      onRemove={() => onRemoveItem(item.id)}
                    />
                  ))}
                </>
              ) : (
                <p className="py-4 text-sm text-primary-300 italic">
                  {items.length === 0 ? 'No artworks added yet. Click "+ Add Artwork" to begin.' : 'All artworks are assigned to crates.'}
                </p>
              )}
            </div>
          </div>
        )}

        {crates.length === 0 && items.length === 0 && (
          <div className="rounded-lg border border-dashed border-primary-200 bg-white py-12 text-center">
            <p className="text-sm text-primary-400">No crates yet. Click "+ Add Crate" to create your first crate, then add artworks to it.</p>
          </div>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* PDF Download                                                      */}
      {/* ----------------------------------------------------------------- */}
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">Packing List PDF</h2>
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

      {/* ----------------------------------------------------------------- */}
      {/* Notes                                                             */}
      {/* ----------------------------------------------------------------- */}
      {packingList.notes && (
        <section className="rounded-lg border border-primary-100 bg-white p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-primary-900">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-primary-700">{packingList.notes}</p>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Modals & dialogs                                                  */}
      {/* ----------------------------------------------------------------- */}

      {/* Add crate */}
      <CrateModal
        isOpen={showAddCrate}
        onClose={() => setShowAddCrate(false)}
        onSave={handleAddCrate}
        title="Add Crate"
        saving={savingCrate}
      />

      {/* Edit crate */}
      <CrateModal
        isOpen={!!editingCrate}
        onClose={() => setEditingCrate(null)}
        onSave={handleUpdateCrate}
        initialData={editingCrate ? crateToFormData(editingCrate) : undefined}
        title="Edit Crate"
        saving={savingCrate}
      />

      {/* Delete crate confirm */}
      <ConfirmDialog
        isOpen={!!crateToDelete}
        onClose={() => setCrateToDelete(null)}
        onConfirm={handleDeleteCrate}
        title="Delete Crate"
        message={`Delete crate "${crateToDelete?.crate_name}"? Artworks assigned to this crate will become unassigned.`}
        confirmLabel={deletingCrate ? 'Deleting…' : 'Delete'}
        variant="danger"
      />

      {/* Delete packing list */}
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
