import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGalleryForwarding,
  useGalleryForwardingItems,
  useGalleryForwardings,
} from '../hooks/useGalleryForwarding';
import { GalleryForwardingDetail } from '../components/gallery-forwarding/GalleryForwardingDetail';
import { GalleryForwardingForm } from '../components/gallery-forwarding/GalleryForwardingForm';
import { GalleryForwardingItemPicker } from '../components/gallery-forwarding/GalleryForwardingItemPicker';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import type {
  GalleryForwardingOrderUpdate,
  ForwardingStatus,
} from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function GalleryForwardingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { forwarding: forwardingOrder, loading, refetch: refetchOrder } = useGalleryForwarding(id!);
  const {
    items,
    loading: itemsLoading,
    addItem,
    removeItem,
    refetch: refetchItems,
  } = useGalleryForwardingItems(id!);
  const { deleteForwarding, updateForwarding } = useGalleryForwardings();

  // ---- Resolve gallery & contact names ------------------------------------
  const [fromGalleryName, setFromGalleryName] = useState<string | null>(null);
  const [toGalleryName, setToGalleryName] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);

  const fetchRelatedNames = useCallback(async () => {
    if (!forwardingOrder) return;

    if (forwardingOrder.from_gallery_id) {
      const { data } = await supabase
        .from('galleries')
        .select('name')
        .eq('id', forwardingOrder.from_gallery_id)
        .single();
      if (data) setFromGalleryName(data.name);
    } else {
      setFromGalleryName(null);
    }

    if (forwardingOrder.to_gallery_id) {
      const { data } = await supabase
        .from('galleries')
        .select('name')
        .eq('id', forwardingOrder.to_gallery_id)
        .single();
      if (data) setToGalleryName(data.name);
    } else {
      setToGalleryName(null);
    }

    if (forwardingOrder.contact_id) {
      const { data } = await supabase
        .from('contacts')
        .select('first_name, last_name, company')
        .eq('id', forwardingOrder.contact_id)
        .single();
      if (data) {
        setContactName(
          [data.first_name, data.last_name, data.company ? `(${data.company})` : '']
            .filter(Boolean)
            .join(' '),
        );
      }
    } else {
      setContactName(null);
    }
  }, [forwardingOrder]);

  useEffect(() => {
    fetchRelatedNames();
  }, [fetchRelatedNames]);

  // ---- Modal state --------------------------------------------------------

  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // ---- Handlers -----------------------------------------------------------

  async function handleAddItem(artworkId: string) {
    const created = await addItem(artworkId);
    if (created) {
      setShowAddItem(false);
      await refetchOrder();
    }
  }

  async function handleRemoveItem(itemId: string) {
    const success = await removeItem(itemId);
    if (success) {
      await refetchOrder();
    }
  }

  async function handleDelete() {
    if (!id) return;

    const success = await deleteForwarding(id);
    if (success) {
      navigate('/forwarding');
    }
  }

  async function handleEdit(data: GalleryForwardingOrderUpdate) {
    if (!id) return;

    setEditLoading(true);
    const updated = await updateForwarding(id, data);
    setEditLoading(false);

    if (updated) {
      setShowEditModal(false);
      await refetchOrder();
      await fetchRelatedNames();
    }
  }

  async function handleStatusChange(newStatus: ForwardingStatus) {
    if (!id) return;

    const updated = await updateForwarding(id, { status: newStatus });

    if (updated) {
      // When status changes to 'shipped', update item artworks to 'in_transit'
      // and create movement history records
      if (newStatus === 'shipped' && items.length > 0) {
        const artworkIds = items
          .map((item) => item.artwork_id)
          .filter(Boolean);

        if (artworkIds.length > 0) {
          await supabase
            .from('artworks')
            .update({ status: 'in_transit' } as never)
            .in('id', artworkIds);

          // Record gallery transfer in artwork movement history
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const movementDate = forwardingOrder?.shipping_date || new Date().toISOString().split('T')[0];
            const movements = artworkIds.map((artworkId) => ({
              user_id: session.user.id,
              artwork_id: artworkId,
              from_location: fromGalleryName || 'Studio',
              to_location: toGalleryName || 'Unknown',
              gallery_id: forwardingOrder?.to_gallery_id || null,
              movement_type: 'gallery_transfer',
              movement_date: movementDate,
              notes: `Forwarding ${forwardingOrder?.forwarding_number || ''}`.trim(),
            }));

            await supabase
              .from('artwork_movements')
              .insert(movements as never);
          }
        }
      }

      // When status changes to 'received', update artworks' gallery_id to to_gallery
      if (newStatus === 'received' && items.length > 0 && forwardingOrder?.to_gallery_id) {
        const artworkIds = items
          .map((item) => item.artwork_id)
          .filter(Boolean);

        if (artworkIds.length > 0) {
          await supabase
            .from('artworks')
            .update({ gallery_id: forwardingOrder.to_gallery_id, status: 'available' } as never)
            .in('id', artworkIds);
        }
      }

      await refetchOrder();
      await refetchItems();
    }
  }

  // ---- Loading state ------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ---- Not found state ----------------------------------------------------

  if (!forwardingOrder) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="font-display text-xl font-semibold text-primary-900">
          Forwarding order not found
        </h2>
        <p className="mt-2 text-sm text-primary-500">
          The forwarding order you are looking for does not exist or has been deleted.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/forwarding')}
          className="mt-6"
        >
          Back to Forwarding Orders
        </Button>
      </div>
    );
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/forwarding')}
        className="mb-6"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
          />
        </svg>
        Back to Forwarding Orders
      </Button>

      {/* Forwarding order detail */}
      <GalleryForwardingDetail
        order={forwardingOrder}
        items={items}
        fromGalleryName={fromGalleryName}
        toGalleryName={toGalleryName}
        contactName={contactName}
        onEdit={() => setShowEditModal(true)}
        onDelete={handleDelete}
        onAddItem={() => setShowAddItem(true)}
        onRemoveItem={handleRemoveItem}
        onStatusChange={handleStatusChange}
      />

      {/* Add Item Modal */}
      <Modal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        title="Add Artwork to Forwarding Order"
        size="4xl"
      >
        <GalleryForwardingItemPicker
          existingArtworkIds={items.map((item) => item.artwork_id)}
          onAdd={handleAddItem}
          onClose={() => setShowAddItem(false)}
        />
      </Modal>

      {/* Edit Forwarding Order Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Forwarding Order"
        size="2xl"
      >
        <GalleryForwardingForm
          initialData={forwardingOrder}
          onSubmit={handleEdit}
          onCancel={() => setShowEditModal(false)}
          loading={editLoading}
        />
      </Modal>
    </div>
  );
}
