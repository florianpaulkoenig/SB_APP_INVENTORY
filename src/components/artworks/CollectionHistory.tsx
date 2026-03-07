import { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { useArtworkCollections } from '../../hooks/useArtworkCollections';
import { usePublicCollections } from '../../hooks/usePublicCollections';
import { INSTITUTION_TYPES } from '../../lib/constants';
import type { InstitutionType } from '../../types/database';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CollectionHistoryProps {
  artworkId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CollectionHistory({ artworkId }: CollectionHistoryProps) {
  const { collections, loading, linkArtwork, unlinkArtwork } =
    useArtworkCollections(artworkId);
  const { collections: allCollections, loading: allLoading } = usePublicCollections();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'link' | 'create'>('link');
  const [saving, setSaving] = useState(false);

  // Link existing form state
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [acquisitionYear, setAcquisitionYear] = useState('');
  const [linkNotes, setLinkNotes] = useState('');

  // Create new form state
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [institutionType, setInstitutionType] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [newAcquisitionYear, setNewAcquisitionYear] = useState('');
  const [newLinkNotes, setNewLinkNotes] = useState('');

  // Unlink confirm state
  const [unlinkId, setUnlinkId] = useState<string | null>(null);

  // -- Derived data -----------------------------------------------------------

  // Flatten artwork_collections join data: each row has nested `public_collections` object
  const displayCollections = useMemo(
    () =>
      collections.map((ac: Record<string, unknown>) => ({
        ...(ac.public_collections as Record<string, unknown> ?? {}),
        _linkId: ac.id as string,
        _acquisitionYear: ac.acquisition_year as number | null,
        _notes: ac.notes as string | null,
      })),
    [collections],
  );

  const linkedCollectionIds = useMemo(
    () => new Set(displayCollections.map((c) => c.id as string)),
    [displayCollections],
  );

  const availableCollections = useMemo(
    () => allCollections.filter((c) => !linkedCollectionIds.has(c.id)),
    [allCollections, linkedCollectionIds],
  );

  // -- Handlers ---------------------------------------------------------------

  function resetForm() {
    setSelectedCollectionId('');
    setAcquisitionYear('');
    setLinkNotes('');
    setName('');
    setCity('');
    setCountry('');
    setInstitutionType('');
    setWebsite('');
    setNotes('');
    setNewAcquisitionYear('');
    setNewLinkNotes('');
    setMode('link');
  }

  function openModal() {
    resetForm();
    setModalOpen(true);
  }

  async function handleLinkExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCollectionId) return;
    setSaving(true);
    try {
      await linkArtwork(
        selectedCollectionId,
        acquisitionYear ? parseInt(acquisitionYear, 10) : null,
        linkNotes || null,
      );
      resetForm();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateNew(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await linkArtwork(
        null,
        newAcquisitionYear ? parseInt(newAcquisitionYear, 10) : null,
        newLinkNotes || null,
        {
          name: name.trim(),
          city: city || null,
          country: country || null,
          institution_type: (institutionType || null) as InstitutionType | null,
          website: website || null,
          notes: notes || null,
        },
      );
      resetForm();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlink() {
    if (!unlinkId) return;
    await unlinkArtwork(unlinkId);
    setUnlinkId(null);
  }

  // -- Loading state ----------------------------------------------------------

  if (loading) {
    return (
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </section>
    );
  }

  // -- Render -----------------------------------------------------------------

  return (
    <section className="rounded-lg border border-primary-100 bg-white p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-primary-900">
          Public Collections
        </h2>
        <Button size="sm" onClick={openModal}>
          Link Collection
        </Button>
      </div>

      {/* Content */}
      {displayCollections.length === 0 ? (
        <EmptyState
          title="No collection history"
          description="Link this artwork to public collections it belongs to."
          icon={
            <svg
              className="h-10 w-10"
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
        />
      ) : (
        <ul className="divide-y divide-primary-100">
          {displayCollections.map((collection) => (
            <li
              key={collection._linkId}
              className="py-4 first:pt-0 last:pb-0"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  {/* Name */}
                  <p className="text-sm font-semibold text-primary-900">
                    {collection.name as string}
                  </p>

                  {/* City, Country */}
                  {(collection.city || collection.country) && (
                    <p className="text-sm text-primary-600">
                      {[collection.city, collection.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}

                  {/* Acquisition year */}
                  {collection._acquisitionYear && (
                    <p className="text-xs text-primary-500">
                      Acquired: {collection._acquisitionYear}
                    </p>
                  )}

                  {/* Institution type */}
                  {collection.institution_type && (
                    <p className="text-xs text-primary-400">
                      {INSTITUTION_TYPES.find(
                        (t) => t.value === collection.institution_type,
                      )?.label ?? (collection.institution_type as string)}
                    </p>
                  )}

                  {/* Notes */}
                  {collection._notes && (
                    <p className="text-xs text-primary-400 italic">
                      {collection._notes}
                    </p>
                  )}
                </div>

                {/* Unlink button */}
                <button
                  type="button"
                  onClick={() => setUnlinkId(collection._linkId)}
                  className="ml-4 shrink-0 text-xs text-primary-400 hover:text-danger transition-colors"
                >
                  Unlink
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Link / Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title="Link Collection"
        size="lg"
      >
        {/* Mode toggle */}
        <div className="mb-4 flex gap-2 border-b border-primary-100 pb-3">
          <button
            type="button"
            onClick={() => setMode('link')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'link'
                ? 'bg-primary-900 text-white'
                : 'text-primary-600 hover:bg-primary-100'
            }`}
          >
            Link Existing
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'create'
                ? 'bg-primary-900 text-white'
                : 'text-primary-600 hover:bg-primary-100'
            }`}
          >
            Create New
          </button>
        </div>

        {/* Link existing collection */}
        {mode === 'link' && (
          <form onSubmit={handleLinkExisting} className="space-y-4">
            {allLoading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : availableCollections.length === 0 ? (
              <p className="py-4 text-center text-sm text-primary-400">
                All collections are already linked, or none exist yet.
              </p>
            ) : (
              <Select
                label="Collection"
                options={availableCollections.map((c) => ({
                  value: c.id,
                  label: `${c.name}${c.city ? ` -- ${c.city}` : ''}`,
                }))}
                value={selectedCollectionId}
                onChange={(e) => setSelectedCollectionId(e.target.value)}
                placeholder="Select a collection..."
              />
            )}

            <Input
              label="Acquisition Year"
              type="number"
              value={acquisitionYear}
              onChange={(e) => setAcquisitionYear(e.target.value)}
              placeholder="e.g., 2024"
            />

            <Textarea
              label="Notes"
              value={linkNotes}
              onChange={(e) => setLinkNotes(e.target.value)}
              placeholder="Additional notes..."
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
              <Button
                type="submit"
                loading={saving}
                disabled={!selectedCollectionId}
              >
                Link
              </Button>
            </div>
          </form>
        )}

        {/* Create new collection */}
        {mode === 'create' && (
          <form onSubmit={handleCreateNew} className="space-y-4">
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
              />
              <Input
                label="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
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
              placeholder="Notes about this collection..."
            />

            <hr className="border-primary-100" />

            <Input
              label="Acquisition Year"
              type="number"
              value={newAcquisitionYear}
              onChange={(e) => setNewAcquisitionYear(e.target.value)}
              placeholder="e.g., 2024"
            />

            <Textarea
              label="Link Notes"
              value={newLinkNotes}
              onChange={(e) => setNewLinkNotes(e.target.value)}
              placeholder="Notes about this artwork in the collection..."
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
                Create &amp; Link
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Unlink Confirm */}
      <ConfirmDialog
        isOpen={unlinkId !== null}
        onClose={() => setUnlinkId(null)}
        onConfirm={handleUnlink}
        title="Unlink Collection"
        message="Are you sure you want to remove this artwork from this collection? The collection record itself will not be deleted."
        confirmLabel="Unlink"
        variant="danger"
      />
    </section>
  );
}
