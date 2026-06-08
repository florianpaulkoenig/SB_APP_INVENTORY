import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { usePublicCollections } from '../hooks/usePublicCollections';
import { useCollectionArtworks } from '../hooks/useCollectionArtworks';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { CatalogueArtworkPicker } from '../components/catalogues/CatalogueArtworkPicker';
import { INSTITUTION_TYPES } from '../lib/constants';
import { formatDimensions } from '../lib/utils';
import type { PublicCollectionRow, PublicCollectionInsert, InstitutionType } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PublicCollectionsPage() {
  const { collections, loading, createCollection, updateCollection, deleteCollection } = usePublicCollections();

  // Search & filter
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<PublicCollectionRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Selected collection for artwork panel
  const [selectedCollection, setSelectedCollection] = useState<PublicCollectionRow | null>(null);

  // Add artworks modal
  const [showArtworkPicker, setShowArtworkPicker] = useState(false);
  const [pickerIds, setPickerIds] = useState<string[]>([]);
  const [acquisitionYear, setAcquisitionYear] = useState('');
  const [addingArtworks, setAddingArtworks] = useState(false);

  // Remove artwork confirm
  const [removeEntryId, setRemoveEntryId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [institutionType, setInstitutionType] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');

  // Artwork counts per collection
  const [artworkCounts, setArtworkCounts] = useState<Record<string, number>>({});

  const fetchArtworkCounts = useCallback(async () => {
    if (collections.length === 0) { setArtworkCounts({}); return; }
    const collectionIds = collections.map((c) => c.id);
    const { data } = await supabase
      .from('artwork_collections')
      .select('collection_id')
      .in('collection_id', collectionIds);
    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        const cid = (row as Record<string, unknown>).collection_id as string;
        counts[cid] = (counts[cid] || 0) + 1;
      }
      setArtworkCounts(counts);
    }
  }, [collections]);

  useEffect(() => { fetchArtworkCounts(); }, [fetchArtworkCounts]);

  // Artworks for selected collection
  const {
    entries: collectionArtworks,
    loading: artworksLoading,
    addArtworks,
    removeArtwork,
    refetch: refetchArtworks,
  } = useCollectionArtworks(selectedCollection?.id ?? null);

  // Keep counts in sync when panel changes
  useEffect(() => {
    if (selectedCollection) fetchArtworkCounts();
  }, [collectionArtworks, selectedCollection, fetchArtworkCounts]);

  // Filtered collections
  const filtered = useMemo(() => {
    let result = collections;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.country?.toLowerCase().includes(q),
      );
    }
    if (typeFilter) result = result.filter((c) => c.institution_type === typeFilter);
    return result;
  }, [collections, search, typeFilter]);

  const typeLabel = (type: string | null) => {
    if (!type) return '';
    return INSTITUTION_TYPES.find((t) => t.value === type)?.label ?? type;
  };

  // -- Form helpers -----------------------------------------------------------

  function resetForm() {
    setName(''); setCity(''); setCountry('');
    setInstitutionType(''); setWebsite(''); setNotes('');
    setEditingCollection(null);
  }

  function openCreate() { resetForm(); setModalOpen(true); }

  function openEdit(collection: PublicCollectionRow) {
    setEditingCollection(collection);
    setName(collection.name);
    setCity(collection.city ?? '');
    setCountry(collection.country ?? '');
    setInstitutionType(collection.institution_type ?? '');
    setWebsite(collection.website ?? '');
    setNotes(collection.notes ?? '');
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload: PublicCollectionInsert = {
        name: name.trim(),
        city: city || null,
        country: country || null,
        institution_type: (institutionType || null) as InstitutionType | null,
        website: website || null,
        notes: notes || null,
      };
      if (editingCollection) {
        const updated = await updateCollection(editingCollection.id, payload);
        if (updated && selectedCollection?.id === editingCollection.id) {
          setSelectedCollection(updated);
        }
      } else {
        await createCollection(payload);
      }
      setModalOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    if (selectedCollection?.id === deleteId) setSelectedCollection(null);
    await deleteCollection(deleteId);
    setDeleteId(null);
  }

  async function handleAddArtworks() {
    if (pickerIds.length === 0) return;
    setAddingArtworks(true);
    const year = acquisitionYear ? parseInt(acquisitionYear) : null;
    const ok = await addArtworks(pickerIds, year);
    setAddingArtworks(false);
    if (ok) {
      setShowArtworkPicker(false);
      setPickerIds([]);
      setAcquisitionYear('');
    }
  }

  async function handleRemoveArtwork() {
    if (!removeEntryId) return;
    await removeArtwork(removeEntryId);
    setRemoveEntryId(null);
  }

  // -- Render -----------------------------------------------------------------

  return (
    <div className="flex h-full gap-6">

      {/* ----------------------------------------------------------------- */}
      {/* Left: collections list                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className={selectedCollection ? 'hidden lg:flex lg:flex-col lg:w-1/2 xl:w-2/5' : 'flex flex-col w-full'}>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-primary-900">Public Collections</h1>
            <p className="mt-1 text-sm text-primary-500">Museums, foundations, and institutional collections.</p>
          </div>
          <Button onClick={openCreate}>New Collection</Button>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, city, or country..."
            className="max-w-md"
          />
          <div className="w-full sm:w-48">
            <Select
              options={[...INSTITUTION_TYPES]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              placeholder="All Types"
            />
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
              </svg>
            }
            title={search || typeFilter ? 'No collections found' : 'No collections yet'}
            description={
              search || typeFilter
                ? 'Try adjusting your search terms or filters.'
                : 'Add your first public collection to start tracking institutional placements.'
            }
            action={
              !search && !typeFilter ? (
                <Button onClick={openCreate}>Add First Collection</Button>
              ) : undefined
            }
          />
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-primary-100 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-primary-100 bg-primary-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-primary-700">Name</th>
                  <th className="px-4 py-3 font-medium text-primary-700">City</th>
                  <th className="px-4 py-3 font-medium text-primary-700">Type</th>
                  <th className="px-4 py-3 font-medium text-primary-700 text-center">Artworks</th>
                  <th className="px-4 py-3 font-medium text-primary-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100">
                {filtered.map((collection) => (
                  <tr
                    key={collection.id}
                    onClick={() => setSelectedCollection(collection)}
                    className={`cursor-pointer transition-colors hover:bg-primary-50 ${
                      selectedCollection?.id === collection.id ? 'bg-accent/5 border-l-2 border-l-accent' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-primary-900">
                      {collection.name}
                      {collection.country && (
                        <span className="ml-1.5 text-xs text-primary-400">{collection.country}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-primary-600">{collection.city ?? '—'}</td>
                    <td className="px-4 py-3 text-primary-600">{typeLabel(collection.institution_type)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-medium ${
                        (artworkCounts[collection.id] ?? 0) > 0
                          ? 'bg-accent/10 text-accent'
                          : 'bg-primary-100 text-primary-400'
                      }`}>
                        {artworkCounts[collection.id] ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(collection)}
                          className="text-xs text-primary-500 hover:text-primary-900 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(collection.id)}
                          className="text-xs text-primary-400 hover:text-danger transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Right: artwork panel for selected collection                      */}
      {/* ----------------------------------------------------------------- */}
      {selectedCollection && (
        <div className="flex flex-col flex-1 min-w-0">
          {/* Panel header */}
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-primary-900">{selectedCollection.name}</h2>
              <p className="mt-0.5 text-sm text-primary-500">
                {[selectedCollection.city, selectedCollection.country].filter(Boolean).join(', ')}
                {selectedCollection.institution_type && (
                  <span className="ml-2 rounded bg-primary-100 px-1.5 py-0.5 text-xs text-primary-600">
                    {typeLabel(selectedCollection.institution_type)}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" onClick={() => { setPickerIds([]); setShowArtworkPicker(true); }}>
                + Add Artworks
              </Button>
              <button
                onClick={() => setSelectedCollection(null)}
                className="rounded p-1.5 text-primary-400 hover:bg-primary-100 hover:text-primary-700 transition-colors"
                title="Close panel"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Artwork list */}
          <div className="flex-1 overflow-y-auto rounded-lg border border-primary-100 bg-white">
            {artworksLoading ? (
              <div className="flex items-center justify-center py-16">
                <LoadingSpinner size="md" />
              </div>
            ) : collectionArtworks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <svg className="h-10 w-10 text-primary-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="text-sm font-medium text-primary-600">No artworks yet</p>
                <p className="mt-1 text-xs text-primary-400">Click "+ Add Artworks" to link artworks to this collection.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-primary-100 bg-primary-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-medium text-primary-700">Reference</th>
                    <th className="px-4 py-3 font-medium text-primary-700">Title</th>
                    <th className="px-4 py-3 font-medium text-primary-700">Year</th>
                    <th className="px-4 py-3 font-medium text-primary-700">Medium</th>
                    <th className="px-4 py-3 font-medium text-primary-700">Dimensions</th>
                    <th className="px-4 py-3 font-medium text-primary-700">Acq. Year</th>
                    <th className="px-4 py-3 font-medium text-primary-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-100">
                  {collectionArtworks.map((entry) => (
                    <tr key={entry.id} className="hover:bg-primary-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-primary-500">
                        {entry.artwork?.reference_code ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-medium text-primary-900">
                        {entry.artwork?.title ?? 'Untitled'}
                      </td>
                      <td className="px-4 py-3 text-primary-600">
                        {entry.artwork?.year ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-primary-600 max-w-[150px] truncate">
                        {entry.artwork?.medium ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-primary-600 whitespace-nowrap">
                        {entry.artwork
                          ? formatDimensions(
                              entry.artwork.height,
                              entry.artwork.width,
                              entry.artwork.depth,
                              entry.artwork.dimension_unit ?? 'cm',
                            ) || '—'
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-primary-600">
                        {entry.acquisition_year ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setRemoveEntryId(entry.id)}
                          className="text-xs text-primary-400 hover:text-danger transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Add artworks modal (artwork picker)                               */}
      {/* ----------------------------------------------------------------- */}
      <Modal
        isOpen={showArtworkPicker}
        onClose={() => { setShowArtworkPicker(false); setPickerIds([]); setAcquisitionYear(''); }}
        title={`Add Artworks — ${selectedCollection?.name ?? ''}`}
        size="4xl"
      >
        <div className="space-y-4">
          <CatalogueArtworkPicker
            selectedIds={pickerIds}
            onSelectionChange={setPickerIds}
          />
          <div className="flex flex-wrap items-end gap-4 border-t border-primary-100 pt-4">
            <div className="w-36">
              <Input
                label="Acquisition Year"
                type="number"
                value={acquisitionYear}
                onChange={(e) => setAcquisitionYear(e.target.value)}
                placeholder="e.g. 2021"
              />
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-sm text-primary-500">
                {pickerIds.length} artwork{pickerIds.length !== 1 ? 's' : ''} selected
              </span>
              <Button variant="outline" onClick={() => { setShowArtworkPicker(false); setPickerIds([]); }}>
                Cancel
              </Button>
              <Button
                onClick={handleAddArtworks}
                loading={addingArtworks}
                disabled={pickerIds.length === 0}
              >
                Add to Collection
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ----------------------------------------------------------------- */}
      {/* Create / Edit Modal                                               */}
      {/* ----------------------------------------------------------------- */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={editingCollection ? 'Edit Collection' : 'New Collection'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Collection or institution name"
            required
            maxLength={256}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g., New York" maxLength={256} />
            <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g., USA" maxLength={256} />
          </div>
          <Select
            label="Institution Type"
            options={[...INSTITUTION_TYPES]}
            value={institutionType}
            onChange={(e) => setInstitutionType(e.target.value)}
            placeholder="Select type..."
          />
          <Input label="Website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." maxLength={2048} />
          <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." maxLength={5000} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingCollection ? 'Save Changes' : 'Create Collection'}</Button>
          </div>
        </form>
      </Modal>

      {/* ----------------------------------------------------------------- */}
      {/* Delete collection confirm                                         */}
      {/* ----------------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Collection"
        message="Are you sure you want to delete this collection? Any linked artworks will be unlinked. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Remove artwork confirm                                            */}
      {/* ----------------------------------------------------------------- */}
      <ConfirmDialog
        isOpen={removeEntryId !== null}
        onClose={() => setRemoveEntryId(null)}
        onConfirm={handleRemoveArtwork}
        title="Remove Artwork"
        message="Remove this artwork from the collection?"
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
