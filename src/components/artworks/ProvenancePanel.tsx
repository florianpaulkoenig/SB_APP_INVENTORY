import { useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { useArtworkProvenance, type ProvenanceEntry, type ProvenanceOwnerType, type ProvenanceAcquisitionMethod } from '../../hooks/useArtworkProvenance';
import { ARTIST_NAME } from '../../lib/constants';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OWNER_TYPE_LABELS: Record<ProvenanceOwnerType, string> = {
  artist: 'Artist',
  gallery: 'Gallery',
  collector: 'Collector',
  institution: 'Institution',
  other: 'Other',
};

const ACQUISITION_METHOD_LABELS: Record<ProvenanceAcquisitionMethod, string> = {
  creation: 'Creation',
  gallery_sale: 'Gallery Sale',
  auction: 'Auction',
  private_sale: 'Private Sale',
  gift: 'Gift',
  inheritance: 'Inheritance',
  other: 'Other',
};

const OWNER_TYPE_OPTIONS: { value: ProvenanceOwnerType; label: string }[] = [
  { value: 'collector', label: 'Collector' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'institution', label: 'Institution' },
  { value: 'other', label: 'Other' },
];

const ACQUISITION_METHOD_OPTIONS: { value: ProvenanceAcquisitionMethod; label: string }[] = [
  { value: 'gallery_sale', label: 'Gallery Sale' },
  { value: 'auction', label: 'Auction' },
  { value: 'private_sale', label: 'Private Sale' },
  { value: 'gift', label: 'Gift' },
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'other', label: 'Other' },
];

// ---------------------------------------------------------------------------
// Inline entry editor
// ---------------------------------------------------------------------------

interface EntryEditorProps {
  initial?: Partial<ProvenanceEntry>;
  ownerTypeOptions?: { value: ProvenanceOwnerType; label: string }[];
  onSave: (data: {
    owner_name: string;
    owner_type: ProvenanceOwnerType;
    acquisition_date: string | null;
    acquisition_method: ProvenanceAcquisitionMethod | null;
    notes: string | null;
  }) => void;
  onCancel: () => void;
}

function EntryEditor({ initial, ownerTypeOptions = OWNER_TYPE_OPTIONS, onSave, onCancel }: EntryEditorProps) {
  const [name, setName] = useState(initial?.owner_name ?? '');
  const [type, setType] = useState<ProvenanceOwnerType>(initial?.owner_type ?? 'collector');
  const [date, setDate] = useState(initial?.acquisition_date ?? '');
  const [method, setMethod] = useState<ProvenanceAcquisitionMethod | ''>(initial?.acquisition_method ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      owner_name: name.trim(),
      owner_type: type,
      acquisition_date: date || null,
      acquisition_method: (method as ProvenanceAcquisitionMethod) || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-primary-600">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 focus:border-primary-400 focus:outline-none"
            placeholder="Owner name"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary-600">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ProvenanceOwnerType)}
            className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 focus:border-primary-400 focus:outline-none"
          >
            {ownerTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary-600">Acquisition Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 focus:border-primary-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-primary-600">Acquisition Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as ProvenanceAcquisitionMethod)}
            className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 focus:border-primary-400 focus:outline-none"
          >
            <option value="">— Select —</option>
            {ACQUISITION_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-primary-600">Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-900 focus:border-primary-400 focus:outline-none"
          placeholder="Optional notes"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={!name.trim()}>Save</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single provenance entry row
// ---------------------------------------------------------------------------

interface EntryRowProps {
  entry: ProvenanceEntry;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onConfirm: (id: string) => void;
  onEdit: (entry: ProvenanceEntry) => void;
  onDelete: (id: string) => void;
}

function EntryRow({ entry, index, isFirst, isLast, onConfirm, onEdit, onDelete }: EntryRowProps) {
  const isArtist = entry.owner_type === 'artist';

  return (
    <div className="flex gap-3">
      {/* Timeline column */}
      <div className="flex flex-col items-center">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
          entry.confirmed
            ? 'bg-emerald-100 text-emerald-700'
            : 'border-2 border-dashed border-primary-300 bg-white text-primary-400'
        }`}>
          {entry.confirmed ? (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            index + 1
          )}
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-primary-200" />}
      </div>

      {/* Content */}
      <div className={`mb-4 flex-1 rounded-lg border px-4 py-3 ${
        entry.confirmed
          ? 'border-primary-100 bg-white'
          : 'border-dashed border-primary-200 bg-primary-50/50'
      }`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-primary-900">{entry.owner_name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                entry.owner_type === 'artist' ? 'bg-amber-100 text-amber-700' :
                entry.owner_type === 'gallery' ? 'bg-blue-100 text-blue-700' :
                entry.owner_type === 'institution' ? 'bg-purple-100 text-purple-700' :
                'bg-primary-100 text-primary-600'
              }`}>
                {OWNER_TYPE_LABELS[entry.owner_type]}
              </span>
              {entry.acquisition_date && (
                <span className="text-xs text-primary-400">{entry.acquisition_date}</span>
              )}
              {entry.acquisition_method && (
                <span className="text-xs text-primary-400">
                  · {ACQUISITION_METHOD_LABELS[entry.acquisition_method]}
                </span>
              )}
            </div>
            {entry.notes && (
              <p className="mt-1 text-xs text-primary-400">{entry.notes}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            {!entry.confirmed && (
              <button
                onClick={() => onConfirm(entry.id)}
                className="rounded px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="Confirm this entry"
              >
                Confirm
              </button>
            )}
            {!isArtist && (
              <>
                <button
                  onClick={() => onEdit(entry)}
                  className="rounded p-1 text-primary-400 hover:bg-primary-100 hover:text-primary-700 transition-colors"
                  title="Edit"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(entry.id)}
                  className="rounded p-1 text-primary-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

interface ProvenancePanelProps {
  artworkId: string;
  /** Pre-fill suggestion for the second entry (selling gallery) */
  gallerySuggestion?: { name: string; saleDate?: string } | null;
}

export function ProvenancePanel({ artworkId, gallerySuggestion }: ProvenancePanelProps) {
  const { entries, loading, addEntry, updateEntry, confirmEntry, deleteEntry } =
    useArtworkProvenance(artworkId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingArtist, setAddingArtist] = useState(false);

  const hasArtistEntry = entries.some((e) => e.owner_type === 'artist');
  const hasGalleryEntry = entries.some((e) => e.owner_type === 'gallery');

  // Auto-add Simon Berger as first entry
  const handleAddArtist = useCallback(async () => {
    setAddingArtist(true);
    await addEntry({
      owner_name: ARTIST_NAME,
      owner_type: 'artist',
      acquisition_method: 'creation',
      confirmed: true,
      sort_order: 0,
    });
    setAddingArtist(false);
  }, [addEntry]);

  // Auto-add gallery suggestion
  const handleAddGallerySuggestion = useCallback(async () => {
    if (!gallerySuggestion) return;
    await addEntry({
      owner_name: gallerySuggestion.name,
      owner_type: 'gallery',
      acquisition_method: 'gallery_sale',
      acquisition_date: gallerySuggestion.saleDate ?? null,
      sort_order: 1,
    });
  }, [addEntry, gallerySuggestion]);

  const handleSaveNew = useCallback(async (data: Parameters<typeof addEntry>[0]) => {
    await addEntry(data);
    setShowAddForm(false);
  }, [addEntry]);

  const handleSaveEdit = useCallback(async (id: string, data: Parameters<typeof updateEntry>[1]) => {
    await updateEntry(id, data);
    setEditingId(null);
  }, [updateEntry]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Remove this provenance entry?')) return;
    await deleteEntry(id);
  }, [deleteEntry]);

  if (loading) {
    return (
      <div className="mt-8 rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-primary-900">Provenance</h2>
        <p className="text-sm text-primary-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg border border-primary-100 bg-white p-4 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold text-primary-900">Provenance</h2>
        <span className="text-xs text-primary-400">
          {entries.filter((e) => e.confirmed).length} confirmed · {entries.length} total
        </span>
      </div>

      {/* Suggestions for missing standard entries */}
      {(!hasArtistEntry || (!hasGalleryEntry && gallerySuggestion)) && (
        <div className="mb-4 space-y-2">
          {!hasArtistEntry && (
            <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="text-xs text-amber-700">Add <strong>{ARTIST_NAME}</strong> as first owner (artist/creator)</span>
              </div>
              <Button size="sm" variant="outline" loading={addingArtist} onClick={handleAddArtist}>
                Add
              </Button>
            </div>
          )}
          {hasArtistEntry && !hasGalleryEntry && gallerySuggestion && (
            <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.375.375 0 01.375.375v1.5c0 .207-.168.375-.375.375H6.75a.375.375 0 01-.375-.375v-1.5A.375.375 0 016.75 19.5z" />
                </svg>
                <span className="text-xs text-blue-700">Add <strong>{gallerySuggestion.name}</strong> as selling gallery</span>
              </div>
              <Button size="sm" variant="outline" onClick={handleAddGallerySuggestion}>
                Add
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Entry list */}
      {entries.length > 0 && (
        <div className="mb-4">
          {entries.map((entry, i) => (
            editingId === entry.id ? (
              <div key={entry.id} className="mb-4 flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-primary-300 bg-white text-xs text-primary-400">
                    {i + 1}
                  </div>
                  {i < entries.length - 1 && <div className="mt-1 w-px flex-1 bg-primary-200" />}
                </div>
                <div className="flex-1">
                  <EntryEditor
                    initial={entry}
                    ownerTypeOptions={entry.owner_type === 'artist' ? [{ value: 'artist', label: 'Artist' }] : OWNER_TYPE_OPTIONS}
                    onSave={(data) => handleSaveEdit(entry.id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              </div>
            ) : (
              <EntryRow
                key={entry.id}
                entry={entry}
                index={i}
                isFirst={i === 0}
                isLast={i === entries.length - 1}
                onConfirm={confirmEntry}
                onEdit={(e) => setEditingId(e.id)}
                onDelete={handleDelete}
              />
            )
          ))}
        </div>
      )}

      {entries.length === 0 && !showAddForm && (
        <p className="mb-4 text-sm text-primary-400">No provenance entries yet.</p>
      )}

      {/* Add new entry */}
      {showAddForm ? (
        <EntryEditor
          onSave={handleSaveNew}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Owner
        </button>
      )}
    </div>
  );
}
