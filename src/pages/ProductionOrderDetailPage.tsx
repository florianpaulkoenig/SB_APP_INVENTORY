import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useProductionOrder,
  useProductionOrderItems,
  useProductionOrders,
} from '../hooks/useProductionOrders';
import { ProductionOrderDetail } from '../components/production/ProductionOrderDetail';
import { ProductionOrderForm } from '../components/production/ProductionOrderForm';
import { ProductionOrderImages } from '../components/production/ProductionOrderImages';
import { ProductionItemEditor } from '../components/production/ProductionItemEditor';
import { ConvertToArtworkDialog } from '../components/production/ConvertToArtworkDialog';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { generateArtworkRefCode } from '../lib/utils';
import { DOC_PREFIXES } from '../lib/constants';
import type {
  ProductionOrderUpdate,
  ProductionOrderItemInsert,
  ProductionOrderItemRow,
  ProductionStatus,
  ArtworkStatus,
  Currency,
  DimensionUnit,
  EditionType,
  ArtworkCategory,
  ArtworkMotif,
  ArtworkSeries,
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
  const { toast } = useToast();

  // ---- Resolve gallery & contact names -------------------------------------
  const [galleryName, setGalleryName] = useState<string | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);

  const fetchRelatedNames = useCallback(async () => {
    if (!productionOrder) return;

    if (productionOrder.gallery_id) {
      const { data } = await supabase
        .from('galleries')
        .select('name')
        .eq('id', productionOrder.gallery_id)
        .single();
      if (data) setGalleryName(data.name);
    } else {
      setGalleryName(null);
    }

    if (productionOrder.contact_id) {
      const { data } = await supabase
        .from('contacts')
        .select('first_name, last_name, company')
        .eq('id', productionOrder.contact_id)
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
  }, [productionOrder]);

  useEffect(() => {
    fetchRelatedNames();
  }, [fetchRelatedNames]);

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
      // Auto-convert all unconverted items to artworks when completing
      if (newStatus === 'completed') {
        await autoConvertItems();
      }

      await refetchOrder();
      await refetchItems();
    }
  }

  // ---- Auto-convert all items to artworks ----------------------------------

  async function autoConvertItems() {
    const unconverted = items.filter((item) => !item.artwork_id);
    if (unconverted.length === 0) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
      return;
    }

    const userId = session.user.id;
    let totalCreated = 0;

    for (const item of unconverted) {
      try {
        const qty = item.quantity || 1;
        let lastArtworkId: string | null = null;

        for (let i = 0; i < qty; i++) {
          // Generate inventory number
          const { data: invNumber } = await supabase.rpc('generate_document_number', {
            p_user_id: userId,
            p_prefix: DOC_PREFIXES.artwork,
          });

          if (!invNumber) continue;

          const refCode = generateArtworkRefCode();

          // Determine edition numbering for multi-quantity items
          let editionType = (item.edition_type ?? 'unique') as EditionType;
          let editionNumber = item.edition_number;
          let editionTotal = item.edition_total;

          if (qty > 1) {
            editionType = 'numbered';
            editionNumber = i + 1;
            editionTotal = qty;
          }

          // Create the artwork
          const { data: artwork, error: artworkError } = await supabase
            .from('artworks')
            .insert({
              user_id: userId,
              inventory_number: invNumber,
              reference_code: refCode,
              title: item.description,
              medium: item.medium,
              year: item.year ?? new Date().getFullYear(),
              height: item.height,
              width: item.width,
              depth: item.depth,
              dimension_unit: (item.dimension_unit ?? 'cm') as DimensionUnit,
              framed_height: item.framed_height,
              framed_width: item.framed_width,
              framed_depth: item.framed_depth,
              weight: item.weight,
              edition_type: editionType,
              edition_number: editionNumber,
              edition_total: editionTotal,
              price: item.price,
              currency: (item.currency ?? 'EUR') as Currency,
              category: (item.category ?? null) as ArtworkCategory | null,
              motif: (item.motif ?? null) as ArtworkMotif | null,
              series: (item.series ?? null) as ArtworkSeries | null,
              status: 'available' as ArtworkStatus,
              gallery_id: productionOrder?.gallery_id ?? null,
            } as never)
            .select('id')
            .single();

          if (artworkError) {
            console.error('[autoConvert] Failed to create artwork:', artworkError);
            continue;
          }

          lastArtworkId = artwork.id;
          totalCreated++;

          // Auto-create certificate (best-effort)
          try {
            const { data: certNumber } = await supabase.rpc('generate_document_number', {
              p_user_id: userId,
              p_prefix: DOC_PREFIXES.certificate,
            });

            if (certNumber) {
              await supabase
                .from('certificates')
                .insert({
                  user_id: userId,
                  artwork_id: artwork.id,
                  certificate_number: certNumber,
                  issue_date: new Date().toISOString().split('T')[0],
                } as never);
            }
          } catch {
            console.warn('[autoConvert] Auto-certificate failed for', artwork.id);
          }
        }

        // Link the last created artwork_id back to the item
        if (lastArtworkId) {
          await supabase
            .from('production_order_items')
            .update({ artwork_id: lastArtworkId })
            .eq('id', item.id);
        }
      } catch (err) {
        console.error('[autoConvert] Error converting item:', item.id, err);
      }
    }

    if (totalCreated > 0) {
      toast({
        title: 'Artworks created',
        description: `${totalCreated} artwork${totalCreated > 1 ? 's' : ''} created from ${unconverted.length} item${unconverted.length > 1 ? 's' : ''}.`,
        variant: 'success',
      });
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
        galleryName={galleryName}
        contactName={contactName}
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

      {/* Reference Images */}
      <div className="mt-8">
        <ProductionOrderImages productionOrderId={id!} />
      </div>

      {/* Add Item Modal */}
      <Modal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        title="Add Production Item"
        size="3xl"
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
        size="2xl"
      >
        <ProductionOrderForm
          productionOrder={productionOrder}
          onSubmit={handleEdit}
          loading={editLoading}
        />
      </Modal>

      {/* Convert to Artwork Dialog */}
      {convertItem && (
        <ConvertToArtworkDialog
          isOpen
          onClose={() => setConvertItem(null)}
          item={convertItem}
          onConverted={handleConvertToArtwork}
        />
      )}
    </div>
  );
}
