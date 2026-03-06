import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useProductionOrder,
  useProductionOrderItems,
  useProductionOrders,
} from '../hooks/useProductionOrders';
import { ProductionOrderDetail } from '../components/production/ProductionOrderDetail';
import { ProductionOrderForm } from '../components/production/ProductionOrderForm';
import { ProductionItemEditor } from '../components/production/ProductionItemEditor';
import { ConvertToArtworkDialog } from '../components/production/ConvertToArtworkDialog';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import type {
  ProductionOrderUpdate,
  ProductionOrderItemInsert,
  ProductionStatus,
} from '../types/database';
import type { ProductionOrderItemWithJoins } from '../hooks/useProductionOrders';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ProductionOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { productionOrder, loading, refetch: refetchOrder } = useProductionOrder(id!);
  const {
    items,
    loading: itemsLoading,
    addItem,
    removeItem,
    refetch: refetchItems,
  } = useProductionOrderItems(id!);
  const { deleteProductionOrder, updateProductionOrder } = useProductionOrders();

  // ---- Modal state --------------------------------------------------------

  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [convertItem, setConvertItem] = useState<ProductionOrderItemWithJoins | null>(null);

  // ---- Handlers -----------------------------------------------------------

  async function handleAddItem(data: ProductionOrderItemInsert) {
    const created = await addItem(data);
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

    const success = await deleteProductionOrder(id);
    if (success) {
      navigate('/production');
    }
  }

  async function handleEdit(data: ProductionOrderUpdate) {
    if (!id) return;

    setEditLoading(true);
    const updated = await updateProductionOrder(id, data);
    setEditLoading(false);

    if (updated) {
      setShowEditModal(false);
      await refetchOrder();
    }
  }

  async function handleStatusChange(newStatus: ProductionStatus) {
    if (!id) return;

    const updated = await updateProductionOrder(id, { status: newStatus });

    if (updated) {
      await refetchOrder();
      await refetchItems();
    }
  }

  async function handleConvertToArtwork(artworkId: string) {
    if (!convertItem) return;

    // Update the production_order_items record with the new artwork_id
    const { error } = await supabase
      .from('production_order_items')
      .update({ artwork_id: artworkId })
      .eq('id', convertItem.id);

    if (!error) {
      setConvertItem(null);
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

  if (!productionOrder) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="font-display text-xl font-semibold text-primary-900">
          Production order not found
        </h2>
        <p className="mt-2 text-sm text-primary-500">
          The production order you are looking for does not exist or has been deleted.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate('/production')}
          className="mt-6"
        >
          Back to Production Orders
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
        onClick={() => navigate('/production')}
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
        Back to Production Orders
      </Button>

      {/* Production order detail */}
      <ProductionOrderDetail
        order={productionOrder}
        items={items}
        onEdit={() => setShowEditModal(true)}
        onDelete={handleDelete}
        onAddItem={() => setShowAddItem(true)}
        onRemoveItem={handleRemoveItem}
        onStatusChange={handleStatusChange}
        onConvertItem={(itemId) => {
          const found = items.find((i) => i.id === itemId);
          if (found) setConvertItem(found);
        }}
      />

      {/* Add Item Modal */}
      <Modal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        title="Add Production Item"
        size="lg"
      >
        <ProductionItemEditor
          productionOrderId={id!}
          onSubmit={handleAddItem}
          onCancel={() => setShowAddItem(false)}
        />
      </Modal>

      {/* Edit Production Order Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Production Order"
        size="lg"
      >
        <ProductionOrderForm
          orderNumber={productionOrder.order_number}
          initialData={productionOrder}
          onSubmit={handleEdit}
          onCancel={() => setShowEditModal(false)}
          loading={editLoading}
        />
      </Modal>

      {/* Convert to Artwork Dialog */}
      <ConvertToArtworkDialog
        isOpen={!!convertItem}
        onClose={() => setConvertItem(null)}
        item={convertItem}
        onConvert={handleConvertToArtwork}
      />
    </div>
  );
}
