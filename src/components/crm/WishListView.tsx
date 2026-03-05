import { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useWishList } from '../../hooks/useWishList';
import { formatDate } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WishListViewProps {
  contactId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WishListView({ contactId }: WishListViewProps) {
  const { items, loading, addItem, removeItem, refetch } =
    useWishList(contactId);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [artworkId, setArtworkId] = useState('');
  const [notes, setNotes] = useState('');

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // -- Handlers -------------------------------------------------------------

  function resetForm() {
    setArtworkId('');
    setNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!artworkId.trim()) return;

    setSaving(true);
    try {
      const result = await addItem(artworkId.trim(), notes || undefined);
      if (result) {
        resetForm();
        setModalOpen(false);
        await refetch();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!deleteId) return;
    const ok = await removeItem(deleteId);
    if (ok) {
      setDeleteId(null);
      await refetch();
    }
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
          Wish List
        </h2>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          Add to Wish List
        </Button>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <EmptyState
          title="No wish list items"
          description="Track artworks this contact is interested in."
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
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const artwork = item.artworks;

            return (
              <div
                key={item.id}
                className="rounded-lg border border-primary-100 bg-white p-4 space-y-2 hover:border-accent/40 transition-colors"
              >
                {/* Artwork info */}
                {artwork ? (
                  <>
                    <p className="text-sm font-medium text-primary-900">
                      {artwork.title}
                    </p>
                    <p className="text-xs text-primary-500">
                      {artwork.reference_code}
                    </p>
                    <p className="text-xs text-primary-400">
                      {[artwork.year, artwork.medium]
                        .filter(Boolean)
                        .join(' \u2014 ')}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-primary-500">
                    Artwork ID: {item.artwork_id}
                  </p>
                )}

                {/* Notes */}
                {item.notes && (
                  <p className="text-xs text-primary-400">{item.notes}</p>
                )}

                {/* Added date */}
                <p className="text-xs text-primary-400">
                  Added {formatDate(item.added_date)}
                </p>

                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteId(item.id)}
                  className="text-danger hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add to Wish List Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add to Wish List"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Artwork ID"
            value={artworkId}
            onChange={(e) => setArtworkId(e.target.value)}
            placeholder="Enter the artwork UUID..."
            required
          />

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why is the contact interested? Any specific details..."
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Add
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Confirm */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleRemove}
        title="Remove from Wish List"
        message="Are you sure you want to remove this artwork from the wish list?"
        confirmLabel="Remove"
        variant="danger"
      />
    </section>
  );
}
