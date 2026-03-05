import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type {
  ProductionOrderRow,
  ProductionOrderInsert,
  ProductionOrderUpdate,
  ProductionOrderItemRow,
  ProductionOrderItemInsert,
  ProductionOrderItemUpdate,
  ProductionStatus,
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

  const fetchProductionOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('production_orders')
        .select(
          '*',
          { count: 'exact' },
        );

      // Status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Search filter: match order_number or title
      if (filters.search) {
        const term = `%${filters.search}%`;
        query = query.or(`order_number.ilike.${term},title.ilike.${term}`);
      }

      // Default ordering: created_at desc
      query = query.order('created_at', { ascending: false });

      // Pagination (offset-based via .range)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setProductionOrders((data as ProductionOrderRow[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch production orders';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.search, page, pageSize, toast]);

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
  };
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
      toast({ title: 'Error', description: message, variant: 'error' });
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
      toast({ title: 'Error', description: message, variant: 'error' });
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

        const { data: created, error: insertError } = await supabase
          .from('production_order_items')
          .insert({ ...data, user_id: session.user.id })
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

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
    addItem,
    updateItem,
    removeItem,
  };
}
