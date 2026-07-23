import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { sanitizeFilterTerm, generateArtworkRefCode } from '../lib/utils';
import { DOC_PREFIXES } from '../lib/constants';
import type {
  ProductionOrderRow,
  ProductionOrderInsert,
  ProductionOrderUpdate,
  ProductionOrderItemRow,
  ProductionOrderItemInsert,
  ProductionOrderItemUpdate,
  ProductionStatus,
  ProductionRecordType,
} from '../types/database';

// ---------------------------------------------------------------------------
// Extended row types with joined data
// ---------------------------------------------------------------------------

export interface ProductionOrderItemWithJoins extends ProductionOrderItemRow {
  artworks?: {
    title: string;
    reference_code: string;
    status: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Filter / pagination types
// ---------------------------------------------------------------------------

export interface ProductionOrderFilters {
  status?: ProductionStatus;
  search?: string; // searches order_number or title
  galleryIds?: string[]; // gallery IDs matching search (resolved from gallery name)
  /** 'order' (default) or 'request' — requests share the table but never mix into order lists */
  recordType?: ProductionRecordType;
}

export interface UseProductionOrdersOptions {
  filters?: ProductionOrderFilters;
  page?: number;
  pageSize?: number;
}

export interface UseProductionOrdersReturn {
  productionOrders: ProductionOrderRow[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
  createProductionOrder: (data: ProductionOrderInsert) => Promise<ProductionOrderRow | null>;
  updateProductionOrder: (id: string, data: ProductionOrderUpdate) => Promise<ProductionOrderRow | null>;
  deleteProductionOrder: (id: string) => Promise<boolean>;
  /** Confirm a request: becomes a real order with a fresh PO number (REQ number kept in request_number) */
  convertRequestToOrder: (id: string) => Promise<ProductionOrderRow | null>;
  /** Decline a request: status 'rejected', stays in the requests list for sell-through analytics */
  rejectRequest: (id: string) => Promise<ProductionOrderRow | null>;
}

// ---------------------------------------------------------------------------
// Joined select strings
// ---------------------------------------------------------------------------

const PRODUCTION_ORDER_ITEM_SELECT = `*, artworks(title, reference_code, status)`;

// ---------------------------------------------------------------------------
// Hook -- list all production orders with optional filters
// ---------------------------------------------------------------------------

export function useProductionOrders(options: UseProductionOrdersOptions = {}): UseProductionOrdersReturn {
  const { filters = {}, page = 1, pageSize = 24 } = options;

  const [productionOrders, setProductionOrders] = useState<ProductionOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  // ---- Fetch production orders ----------------------------------------------

  // Monotonic fetch generation — lets stale responses be discarded when
  // filters change faster than the network answers
  const fetchGenRef = useRef(0);

  const fetchProductionOrders = useCallback(async () => {
    const gen = ++fetchGenRef.current;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('production_orders')
        .select('id, order_number, title, gallery_id, contact_id, status, deadline, price, currency, created_at, record_type, request_number, converted_from_request_at, rejected_at', { count: 'exact' })
        .eq('record_type', filters.recordType ?? 'order');

      // Status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Search filter: match order_number, title, or gallery
      if (filters.search) {
        const term = `%${sanitizeFilterTerm(filters.search)}%`;
        const orParts = [`order_number.ilike.${term}`, `title.ilike.${term}`];
        if (filters.galleryIds && filters.galleryIds.length > 0) {
          orParts.push(`gallery_id.in.(${filters.galleryIds.join(',')})`);
        }
        query = query.or(orParts.join(','));
      }

      // Default ordering: deadline (nulls last), then created_at desc
      query = query.order('deadline', { ascending: true, nullsFirst: false })
                   .order('created_at', { ascending: false });

      // Pagination (offset-based via .range)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      // Stale response — a newer fetch superseded this one
      if (gen !== fetchGenRef.current) return;

      if (fetchError) throw fetchError;

      setProductionOrders((data as ProductionOrderRow[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: unknown) {
      // Stale response — a newer fetch superseded this one
      if (gen !== fetchGenRef.current) return;
      const message =
        err instanceof Error ? err.message : 'Failed to fetch production orders';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      if (gen === fetchGenRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.search, filters.recordType, JSON.stringify(filters.galleryIds), page, pageSize, toast]);

  useEffect(() => {
    fetchProductionOrders();
  }, [fetchProductionOrders]);

  // ---- Create production order ----------------------------------------------

  const createProductionOrder = useCallback(
    async (data: ProductionOrderInsert): Promise<ProductionOrderRow | null> => {
      try {
        // Auto-set user_id from current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return null;
        }

        const { data: created, error: insertError } = await supabase
          .from('production_orders')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Production order created', description: 'Production order has been added.', variant: 'success' });
        await fetchProductionOrders();

        return created as ProductionOrderRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create production order';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchProductionOrders],
  );

  // ---- Update production order ----------------------------------------------

  const updateProductionOrder = useCallback(
    async (id: string, data: ProductionOrderUpdate): Promise<ProductionOrderRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('production_orders')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Production order updated', description: 'Production order has been saved.', variant: 'success' });
        await fetchProductionOrders();

        return updated as ProductionOrderRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update production order';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchProductionOrders],
  );

  // ---- Convert request -> order ---------------------------------------------

  const convertRequestToOrder = useCallback(
    async (id: string): Promise<ProductionOrderRow | null> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return null;
        }

        const { data: current, error: fetchError } = await supabase
          .from('production_orders')
          .select('id, order_number, record_type')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if ((current as { record_type: string }).record_type !== 'request') {
          toast({ title: 'Error', description: 'This entry is already an order.', variant: 'error' });
          return null;
        }

        // Fresh PO number; the REQ number stays on the record as request_number
        const { data: orderNumber, error: numberError } = await supabase.rpc('generate_document_number', {
          p_user_id: session.user.id,
          p_prefix: DOC_PREFIXES.production,
        });

        if (numberError || !orderNumber) throw numberError ?? new Error('Could not generate order number');

        const { data: updated, error: updateError } = await supabase
          .from('production_orders')
          .update({
            record_type: 'order',
            order_number: orderNumber,
            request_number: (current as { order_number: string }).order_number,
            status: 'ordered',
            ordered_date: new Date().toISOString().split('T')[0],
            converted_from_request_at: new Date().toISOString(),
            rejected_at: null,
          } as never)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({
          title: 'Request converted',
          description: `Now production order ${orderNumber}.`,
          variant: 'success',
        });
        await fetchProductionOrders();

        return updated as ProductionOrderRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to convert request';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchProductionOrders],
  );

  // ---- Reject request -------------------------------------------------------

  const rejectRequest = useCallback(
    async (id: string): Promise<ProductionOrderRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('production_orders')
          .update({
            status: 'rejected',
            rejected_at: new Date().toISOString(),
          } as never)
          .eq('id', id)
          .eq('record_type', 'request')
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Request rejected', variant: 'success' });
        await fetchProductionOrders();

        return updated as ProductionOrderRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to reject request';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchProductionOrders],
  );

  // ---- Delete production order ----------------------------------------------

  const deleteProductionOrder = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('production_orders')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Production order deleted', variant: 'success' });
        await fetchProductionOrders();

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete production order';
        toast({ title: 'Error', description: message, variant: 'error' });
        return false;
      }
    },
    [toast, fetchProductionOrders],
  );

  return {
    productionOrders,
    loading,
    error,
    totalCount,
    refetch: fetchProductionOrders,
    createProductionOrder,
    updateProductionOrder,
    deleteProductionOrder,
    convertRequestToOrder,
    rejectRequest,
  };
}

// ---------------------------------------------------------------------------
// Unique reference code for a production item — same format & namespace as
// artwork reference codes, since the code is carried over on conversion.
// ---------------------------------------------------------------------------

export async function generateUniqueItemRefCode(): Promise<string> {
  let code = generateArtworkRefCode();

  for (let attempt = 0; attempt < 5; attempt++) {
    const [artworkHit, itemHit] = await Promise.all([
      supabase.from('artworks').select('id').eq('reference_code', code).maybeSingle(),
      supabase.from('production_order_items').select('id').eq('reference_code', code).maybeSingle(),
    ]);
    if (!artworkHit.data && !itemHit.data) return code;
    code = generateArtworkRefCode();
  }

  return code;
}

// ---------------------------------------------------------------------------
// Hook -- single production order by ID
// ---------------------------------------------------------------------------

export interface UseProductionOrderReturn {
  productionOrder: ProductionOrderRow | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProductionOrder(id: string): UseProductionOrderReturn {
  const [productionOrder, setProductionOrder] = useState<ProductionOrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchProductionOrder = useCallback(async () => {
    if (!id) {
      setProductionOrder(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('production_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setProductionOrder((data as ProductionOrderRow) ?? null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch production order';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchProductionOrder();
  }, [fetchProductionOrder]);

  return {
    productionOrder,
    loading,
    error,
    refetch: fetchProductionOrder,
  };
}

// ---------------------------------------------------------------------------
// Hook -- production order items for a given production order
// ---------------------------------------------------------------------------

export interface UseProductionOrderItemsReturn {
  items: ProductionOrderItemWithJoins[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addItem: (data: ProductionOrderItemInsert) => Promise<ProductionOrderItemRow | null>;
  updateItem: (id: string, data: ProductionOrderItemUpdate) => Promise<ProductionOrderItemRow | null>;
  removeItem: (id: string) => Promise<boolean>;
  reorderItems: (orderedIds: string[]) => Promise<void>;
}

export function useProductionOrderItems(productionOrderId: string): UseProductionOrderItemsReturn {
  const [items, setItems] = useState<ProductionOrderItemWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // ---- Fetch items --------------------------------------------------------

  const fetchItems = useCallback(async () => {
    if (!productionOrderId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('production_order_items')
        .select(
          PRODUCTION_ORDER_ITEM_SELECT,
        )
        .eq('production_order_id', productionOrderId)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      setItems((data as ProductionOrderItemWithJoins[]) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch production order items';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [productionOrderId, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ---- Add item -----------------------------------------------------------

  const addItem = useCallback(
    async (data: ProductionOrderItemInsert): Promise<ProductionOrderItemRow | null> => {
      try {
        // Auto-set user_id from current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return null;
        }

        // Every item gets its own reference code at creation — the artwork
        // record itself is only created once production completes
        const referenceCode = data.reference_code ?? (await generateUniqueItemRefCode());

        const { data: created, error: insertError } = await supabase
          .from('production_order_items')
          .insert({ ...data, reference_code: referenceCode, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Item added', description: 'Production order item has been added.', variant: 'success' });
        await fetchItems();

        return created as ProductionOrderItemRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to add production order item';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchItems],
  );

  // ---- Update item --------------------------------------------------------

  const updateItem = useCallback(
    async (id: string, data: ProductionOrderItemUpdate): Promise<ProductionOrderItemRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('production_order_items')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Item updated', description: 'Production order item has been saved.', variant: 'success' });
        await fetchItems();

        return updated as ProductionOrderItemRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update production order item';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchItems],
  );

  // ---- Remove item --------------------------------------------------------

  const removeItem = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('production_order_items')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Item removed', variant: 'success' });
        await fetchItems();

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to remove production order item';
        toast({ title: 'Error', description: message, variant: 'error' });
        return false;
      }
    },
    [toast, fetchItems],
  );

  // ---- Reorder items (drag-and-drop) ----------------------------------------

  const reorderItems = useCallback(
    async (orderedIds: string[]): Promise<void> => {
      // Optimistic update — reorder local state immediately
      setItems((prev) => {
        const map = new Map(prev.map((item) => [item.id, item]));
        return orderedIds
          .map((id, idx) => {
            const item = map.get(id);
            return item ? { ...item, sort_order: idx + 1 } : null;
          })
          .filter((item): item is ProductionOrderItemWithJoins => item !== null);
      });

      try {
        await Promise.all(
          orderedIds.map((id, index) =>
            supabase
              .from('production_order_items')
              .update({ sort_order: index + 1 } as never)
              .eq('id', id),
          ),
        );
      } catch {
        toast({ title: 'Error', description: 'Could not save new order.', variant: 'error' });
        await fetchItems(); // revert on failure
      }
    },
    [fetchItems, toast],
  );

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
    addItem,
    updateItem,
    removeItem,
    reorderItems,
  };
}
