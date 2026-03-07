import { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { usePublicCollections } from '../hooks/usePublicCollections';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/SearchInput';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { INSTITUTION_TYPES } from '../lib/constants';
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
    if (collections.length === 0) {
      setArtworkCounts({});
      return;
    }

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

  useEffect(() => {
    fetchArtworkCounts();
  }, [fetchArtworkCounts]);

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

    if (typeFilter) {
      result = result.filter((c) => c.institution_type === typeFilter);
    }

    return result;
  }, [collections, search, typeFilter]);

  // Institution type label lookup
  const typeLabel = (type: string | null) => {
    if (!type) return '';
    return INSTITUTION_TYPES.find((t) => t.value === type)?.label ?? type;
  };

  // -- Form helpers -----------------------------------------------------------

  function resetForm() {
    setName('');
    setCity('');
    setCountry('');
    setInstitutionType('');
    setWebsite('');
    setNotes('');
    setEditingCollection(null);
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

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
        await updateCollection(editingCollection.id, payload);
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
    await deleteCollection(deleteId);
    setDeleteId(null);
  }

  // -- Render -----------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary-900">
            Public Collections
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            Manage museums, foundations, and institutional collections.
          </p>
        </div>

        <Button onClick={openCreate}>
          New Collection
        </Button>
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
              />
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
              <Button onClick={openCreate}>
                Add First Collection
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-primary-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-primary-100 bg-primary-50">
              <tr>
                <th className="px-4 py-3 font-medium text-primary-700">Name</th>
                <th className="px-4 py-3 font-medium text-primary-700">City</th>
                <th className="px-4 py-3 font-medium text-primary-700">Country</th>
                <th className="px-4 py-3 font-medium text-primary-700">Type</th>
                <th className="px-4 py-3 font-medium text-primary-700">Website</th>
                <th className="px-4 py-3 font-medium text-primary-700 text-center">Artworks</th>
                <th className="px-4 py-3 font-medium text-primary-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100">
              {filtered.map((collection) => (
                <tr key={collection.id} className="hover:bg-primary-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-primary-900">
                    {collection.name}
                  </td>
                  <td className="px-4 py-3 text-primary-600">
                    {collection.city ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-primary-600">
                    {collection.country ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-primary-600">
                    {typeLabel(collection.institution_type)}
                  </td>
                  <td className="px-4 py-3 text-primary-600">
                    {collection.website ? (
                      <a
                        href={collection.website.startsWith('http') ? collection.website : `https://${collection.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline"
                      >
                        {collection.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-primary-600">
                    {artworkCounts[collection.id] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
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
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., New York"
            />
            <Input
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g., USA"
            />
          </div>

          <Select
            label="Institution Type"
            options={[...INSTITUTION_TYPES]}
            value={institutionType}
            onChange={(e) => setInstitutionType(e.target.value)}
            placeholder="Select type..."
          />

          <Input
            label="Website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://..."
          />

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes about this collection..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingCollection ? 'Save Changes' : 'Create Collection'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Collection"
        message="Are you sure you want to delete this collection? Any linked artworks will be unlinked. This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
