import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDelivery, useDeliveryItems, useDeliveries } from '../hooks/useDeliveries';
import { DeliveryDetail } from '../components/deliveries/DeliveryDetail';
import { DeliveryItemPicker } from '../components/deliveries/DeliveryItemPicker';
import { DeliveryForm } from '../components/deliveries/DeliveryForm';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import type { DeliveryUpdate, DeliveryItemInsert, DeliveryStatus } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { delivery, loading, refetch: refetchDelivery } = useDelivery(id!);
  const { items, loading: itemsLoading, addItem, removeItem, refetch: refetchItems } = useDeliveryItems(id!);
  const { deleteDelivery, updateDelivery } = useDeliveries();

  // ---- Modal state --------------------------------------------------------

  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // ---- Handlers -----------------------------------------------------------

  async function handleAddItem(data: DeliveryItemInsert) {
    const created = await addItem(data);
    if (created) {
      setShowAddItem(false);
      await refetchDelivery();
    }
  }

  async function handleRemoveItem(itemId: string) {
    const success = await removeItem(itemId);
    if (success) {
      await refetchDelivery();
    }
  }

  async function handleDelete() {
    if (!id) return;

    const success = await deleteDelivery(id);
    if (success) {
      navigate('/deliveries');
    }
  }

  async function handleEdit(data: DeliveryUpdate) {
    if (!id) return;

    setEditLoading(true);
    const updated = await updateDelivery(id, data);
    setEditLoading(false);

    if (updated) {
      setShowEditModal(false);
      await refetchDelivery();
    }
  }

  async function handleStatusChange(newStatus: DeliveryStatus) {
    if (!id) return;

    const updated = await updateDelivery(id, { status: newStatus });

    if (updated) {
      // When status changes to 'shipped', update all item artworks to 'in_transit'
      if (newStatus === 'shipped' && items.length > 0) {
        const artworkIds = items
          .map((item) => item.artwork_id)
          .filter(Boolean);

        if (artworkIds.length > 0) {
          await supabase
            .from('artworks')
            .update({ status: 'in_transit' })
            .in('id', artworkIds);
        }
      }

      // When status changes to 'delivered', keep artworks at current status
      // (no automatic artwork status change on delivery)

      await refetchDelivery();
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

  if (!delivery) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="font-display text-xl font-semibold text-primary-900">
          Delivery not found
        </h2>
        <p className="mt-2 text-sm text-primary-500">
          The delivery you are looking for does not exist or has been deleted.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/deliveries')}
          className="mt-6"
        >
          Back to Deliveries
        </Button>
      </div>
    );
  }

  // ---- Derive display names from joined data ------------------------------

  const galleryName = delivery.galleries?.name ?? null;

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/deliveries')}
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
        Back to Deliveries
      </Button>

      {/* Delivery detail */}
      <DeliveryDetail
        delivery={delivery}
        galleryName={galleryName}
        items={items}
        itemsLoading={itemsLoading}
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
        title="Add Artwork to Delivery"
        size="lg"
      >
        <DeliveryItemPicker
          deliveryId={id!}
          existingItemIds={items.map((item) => item.artwork_id)}
          onSubmit={handleAddItem}
          onCancel={() => setShowAddItem(false)}
        />
      </Modal>

      {/* Edit Delivery Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Delivery"
        size="lg"
      >
        <DeliveryForm
          deliveryNumber={delivery.delivery_number}
          initialData={delivery}
          onSubmit={handleEdit}
          onCancel={() => setShowEditModal(false)}
          loading={editLoading}
        />
      </Modal>
    </div>
  );
}
