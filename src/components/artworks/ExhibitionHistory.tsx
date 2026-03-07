import { useState, useMemo, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { GallerySelect } from '../galleries/GallerySelect';
import { useArtworkExhibitions } from '../../hooks/useExhibitions';
import { useExhibitions } from '../../hooks/useExhibitions';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ExhibitionHistoryProps {
  artworkId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExhibitionHistory({ artworkId }: ExhibitionHistoryProps) {
  const { exhibitions, loading, linkArtwork, unlinkArtwork } =
    useArtworkExhibitions(artworkId);
  const { exhibitions: allExhibitions, loading: allLoading } = useExhibitions();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'link' | 'create'>('link');
  const [saving, setSaving] = useState(false);

  // Link existing form state
  const [selectedExhibitionId, setSelectedExhibitionId] = useState('');

  // Create new form state
  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [catalogueReference, setCatalogueReference] = useState('');
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Contacts for dropdown
  const [contacts, setContacts] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    async function fetchContacts() {
      const { data } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, company')
        .order('last_name', { ascending: true });
      if (data) {
        setContacts(
          data.map((c) => ({
            id: c.id,
            name: [c.first_name, c.last_name, c.company ? `(${c.company})` : '']
              .filter(Boolean)
              .join(' '),
          })),
        );
      }
    }
    fetchContacts();
  }, []);

  // Unlink confirm state
  const [unlinkId, setUnlinkId] = useState<string | null>(null);

  // -- Derived data ---------------------------------------------------------

  // Flatten exhibition_artworks join data: each row has nested `exhibitions` object
  const displayExhibitions = useMemo(
    () =>
      exhibitions.map((ea: Record<string, unknown>) => ({
        ...(ea.exhibitions as Record<string, unknown> ?? {}),
        _linkId: ea.id as string, // exhibition_artwork ID for unlinking
      })),
    [exhibitions],
  );

  const linkedExhibitionIds = useMemo(
    () => new Set(displayExhibitions.map((e) => e.id as string)),
    [displayExhibitions],
  );

  const availableExhibitions = useMemo(
    () => allExhibitions.filter((e) => !linkedExhibitionIds.has(e.id)),
    [allExhibitions, linkedExhibitionIds],
  );

  // -- Handlers -------------------------------------------------------------

  function resetForm() {
    setSelectedExhibitionId('');
    setTitle('');
    setVenue('');
    setCity('');
    setCountry('');
    setStartDate('');
    setEndDate('');
    setCatalogueReference('');
    setGalleryId(null);
    setContactId(null);
    setNotes('');
    setMode('link');
  }

  function openModal() {
    resetForm();
    setModalOpen(true);
  }

  async function handleLinkExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedExhibitionId) return;
    setSaving(true);
    try {
      await linkArtwork(selectedExhibitionId);
      resetForm();
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateNew(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await linkArtwork(null, {
        title: title.trim(),
        venue: venue || null,
        city: city || null,
        country: country || null,
        start_date: startDate || null,
        end_date: endDate || null,
        catalogue_reference: catalogueReference || null,
        gallery_id: galleryId,
        contact_id: contactId,
        notes: notes || null,
      });
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

  // -- Loading state --------------------------------------------------------

  if (loading) {
    return (
      <section className="rounded-lg border border-primary-100 bg-white p-6">
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </section>
    );
  }

  // -- Render ---------------------------------------------------------------

  return (
    <section className="rounded-lg border border-primary-100 bg-white p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-primary-900">
          Exhibition History
        </h2>
        <Button size="sm" onClick={openModal}>
          Link Exhibition
        </Button>
      </div>

      {/* Content */}
      {displayExhibitions.length === 0 ? (
        <EmptyState
          title="No exhibition history"
          description="Link this artwork to exhibitions it has been shown in."
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
          {displayExhibitions.map((exhibition) => (
            <li
              key={exhibition._linkId}
              className="py-4 first:pt-0 last:pb-0"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  {/* Title */}
                  <p className="text-sm font-semibold text-primary-900">
                    {exhibition.title as string}
                  </p>

                  {/* Venue, City, Country */}
                  {(exhibition.venue || exhibition.city || exhibition.country) && (
                    <p className="text-sm text-primary-600">
                      {[exhibition.venue, exhibition.city, exhibition.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}

                  {/* Date range */}
                  {(exhibition.start_date || exhibition.end_date) && (
                    <p className="text-xs text-primary-500">
                      {exhibition.start_date
                        ? formatDate(exhibition.start_date as string)
                        : '...'}{' '}
                      &ndash;{' '}
                      {exhibition.end_date
                        ? formatDate(exhibition.end_date as string)
                        : '...'}
                    </p>
                  )}

                  {/* Catalogue reference */}
                  {exhibition.catalogue_reference && (
                    <p className="text-xs text-primary-400">
                      Catalogue: {exhibition.catalogue_reference as string}
                    </p>
                  )}
                </div>

                {/* Unlink button */}
                <button
                  type="button"
                  onClick={() => setUnlinkId(exhibition._linkId)}
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
        title="Link Exhibition"
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

        {/* Link existing exhibition */}
        {mode === 'link' && (
          <form onSubmit={handleLinkExisting} className="space-y-4">
            {allLoading ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : availableExhibitions.length === 0 ? (
              <p className="py-4 text-center text-sm text-primary-400">
                All exhibitions are already linked, or none exist yet.
              </p>
            ) : (
              <Select
                label="Exhibition"
                options={availableExhibitions.map((e) => ({
                  value: e.id,
                  label: `${e.title}${e.venue ? ` -- ${e.venue}` : ''}`,
                }))}
                value={selectedExhibitionId}
                onChange={(e) => setSelectedExhibitionId(e.target.value)}
                placeholder="Select an exhibition..."
              />
            )}

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
                disabled={!selectedExhibitionId}
              >
                Link
              </Button>
            </div>
          </form>
        )}

        {/* Create new exhibition */}
        {mode === 'create' && (
          <form onSubmit={handleCreateNew} className="space-y-4">
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Exhibition title"
              required
            />

            <Input
              label="Venue"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Gallery or museum name"
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <Input
              label="Catalogue Reference"
              value={catalogueReference}
              onChange={(e) => setCatalogueReference(e.target.value)}
              placeholder="e.g., Cat. No. 42, p. 78"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <GallerySelect
                value={galleryId}
                onChange={setGalleryId}
                label="Gallery"
              />
              <Select
                label="Contact"
                options={[
                  { value: '', label: 'No contact' },
                  ...contacts.map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={contactId ?? ''}
                onChange={(e) => setContactId(e.target.value === '' ? null : e.target.value)}
              />
            </div>

            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional exhibition details..."
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
        title="Unlink Exhibition"
        message="Are you sure you want to remove this artwork from this exhibition? The exhibition record itself will not be deleted."
        confirmLabel="Unlink"
        variant="danger"
      />
    </section>
  );
}
