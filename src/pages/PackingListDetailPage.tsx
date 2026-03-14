import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePackingList, usePackingListItems, usePackingLists } from '../hooks/usePackingLists';
import { PackingListDetail } from '../components/packing/PackingListDetail';
import { PackingListForm } from '../components/packing/PackingListForm';
import { DeliveryItemPicker } from '../components/deliveries/DeliveryItemPicker';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import type { PackingListUpdate } from '../types/database';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PackingListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { packingList, loading, refetch: refetchPackingList } = usePackingList(id!);
  const { items, loading: itemsLoading, addItem, removeItem } = usePackingListItems(id!);
  const { deletePackingList, updatePackingList } = usePackingLists();

  // ---- Modal state --------------------------------------------------------

  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // ---- Handlers -----------------------------------------------------------


  async function handleRemoveItem(itemId: string) {
    const success = await removeItem(itemId);
    if (success) {
      await refetchPackingList();
    }
  }

  async function handleDelete() {
    if (!id) return;

    const success = await deletePackingList(id);
    if (success) {
      navigate('/packing-lists');
    }
  }

  async function handleEdit(data: PackingListUpdate) {
    if (!id) return;

    setEditLoading(true);
    const updated = await updatePackingList(id, data);
    setEditLoading(false);

    if (updated) {
      setShowEditModal(false);
      await refetchPackingList();
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

  if (!packingList) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="font-display text-xl font-semibold text-primary-900">
          Packing list not found
        </h2>
        <p className="mt-2 text-sm text-primary-500">
          The packing list you are looking for does not exist or has been deleted.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/packing-lists')}
          className="mt-6"
        >
          Back to Packing Lists
        </Button>
      </div>
    );
  }

  // ---- Derive display names from joined data ------------------------------

  const deliveryNumber = packingList.deliveries?.delivery_number ?? null;

  // ---- Render -------------------------------------------------------------

  return (
    <div>
      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/packing-lists')}
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
        Back to Packing Lists
      </Button>

      {/* Packing list detail */}
      <PackingListDetail
        packingList={packingList}
        deliveryNumber={deliveryNumber}
        items={items}
        itemsLoading={itemsLoading}
        onEdit={() => setShowEditModal(true)}
        onDelete={handleDelete}
        onAddItem={() => setShowAddItem(true)}
        onRemoveItem={handleRemoveItem}
      />

      {/* Add Item Modal */}
      <Modal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        title="Add Artwork to Packing List"
        size="4xl"
      >
        <DeliveryItemPicker
          deliveryId={id!}
          existingItemIds={items.map((item) => item.artwork_id)}
          onSubmit={async (artworkIds) => {
            let anyCreated = false;
            for (const artworkId of artworkIds) {
              const created = await addItem({
                packing_list_id: id!,
                artwork_id: artworkId,
              } as never);
              if (created) anyCreated = true;
            }
            if (anyCreated) {
              setShowAddItem(false);
              await refetchPackingList();
            }
          }}
          onCancel={() => setShowAddItem(false)}
        />
      </Modal>

      {/* Edit Packing List Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Packing List"
        size="lg"
      >
        <PackingListForm
          packingNumber={packingList.packing_number}
          initialData={packingList}
          onSubmit={handleEdit}
          onCancel={() => setShowEditModal(false)}
          loading={editLoading}
        />
      </Modal>
    </div>
  );
}
