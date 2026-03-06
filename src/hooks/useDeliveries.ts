import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { sanitizeFilterTerm } from '../lib/utils';
import type {
  DeliveryRow,
  DeliveryInsert,
  DeliveryUpdate,
  DeliveryItemRow,
  DeliveryItemInsert,
  DeliveryItemUpdate,
  DeliveryStatus,
} from '../types/database';

// ---------------------------------------------------------------------------
// Extended row types with joined data
// ---------------------------------------------------------------------------

export interface DeliveryWithJoins extends DeliveryRow {
  galleries?: { name: string } | null;
}

export interface DeliveryItemWithJoins extends DeliveryItemRow {
  artworks?: {
    title: string;
    reference_code: string;
    medium: string | null;
    year: number | null;
    height: number | null;
    width: number | null;
    depth: number | null;
    dimension_unit: string | null;
    status: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Filter / pagination types
// ---------------------------------------------------------------------------

export interface DeliveryFilters {
  status?: DeliveryStatus;
  galleryId?: string;
  search?: string; // searches delivery_number or recipient_name
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseDeliveriesOptions {
  filters?: DeliveryFilters;
  page?: number;
  pageSize?: number;
}

export interface UseDeliveriesReturn {
  deliveries: DeliveryWithJoins[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
  createDelivery: (data: DeliveryInsert) => Promise<DeliveryRow | null>;
  updateDelivery: (id: string, data: DeliveryUpdate) => Promise<DeliveryRow | null>;
  deleteDelivery: (id: string) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Joined select string
// ---------------------------------------------------------------------------

const DELIVERY_SELECT = `*, galleries(name)`;

const DELIVERY_ITEM_SELECT = `*, artworks(title, reference_code, medium, year, height, width, depth, dimension_unit, status)`;

// ---------------------------------------------------------------------------
// Hook -- list all deliveries with optional filters
// ---------------------------------------------------------------------------

export function useDeliveries(options: UseDeliveriesOptions = {}): UseDeliveriesReturn {
  const { filters = {}, page = 1, pageSize = 24 } = options;

  const [deliveries, setDeliveries] = useState<DeliveryWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  // ---- Fetch deliveries -----------------------------------------------------

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('deliveries')
        .select(
          DELIVERY_SELECT,
          { count: 'exact' },
        );

      // Status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Gallery filter
      if (filters.galleryId) {
        query = query.eq('gallery_id', filters.galleryId);
      }

      // Search filter: match delivery_number or recipient_name
      if (filters.search) {
        const term = `%${sanitizeFilterTerm(filters.search)}%`;
        query = query.or(`delivery_number.ilike.${term},recipient_name.ilike.${term}`);
      }

      // Sorting
      if (filters.sortBy) {
        const sortOrder = filters.sortOrder || 'desc';
        query = query.order(filters.sortBy, { ascending: sortOrder === 'asc' });
      } else {
        // Default: delivery_date desc (nulls last), then created_at desc
        query = query
          .order('delivery_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
      }

      // Pagination (offset-based via .range)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setDeliveries((data as DeliveryWithJoins[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch deliveries';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.galleryId, filters.search, filters.sortBy, filters.sortOrder, page, pageSize, toast]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // ---- Create delivery ------------------------------------------------------

  const createDelivery = useCallback(
    async (data: DeliveryInsert): Promise<DeliveryRow | null> => {
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
          .from('deliveries')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Delivery created', description: 'Delivery has been added.', variant: 'success' });
        await fetchDeliveries();

        return created as DeliveryRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create delivery';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchDeliveries],
  );

  // ---- Update delivery ------------------------------------------------------

  const updateDelivery = useCallback(
    async (id: string, data: DeliveryUpdate): Promise<DeliveryRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('deliveries')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Delivery updated', description: 'Delivery has been saved.', variant: 'success' });
        await fetchDeliveries();

        return updated as DeliveryRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update delivery';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchDeliveries],
  );

  // ---- Delete delivery ------------------------------------------------------

  const deleteDelivery = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('deliveries')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Delivery deleted', variant: 'success' });
        await fetchDeliveries();

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete delivery';
        toast({ title: 'Error', description: message, variant: 'error' });
        return false;
      }
    },
    [toast, fetchDeliveries],
  );

  return {
    deliveries,
    loading,
    error,
    totalCount,
    refetch: fetchDeliveries,
    createDelivery,
    updateDelivery,
    deleteDelivery,
  };
}

// ---------------------------------------------------------------------------
// Hook -- single delivery by ID
// ---------------------------------------------------------------------------

export interface UseDeliveryReturn {
  delivery: DeliveryWithJoins | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDelivery(id: string): UseDeliveryReturn {
  const [delivery, setDelivery] = useState<DeliveryWithJoins | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchDelivery = useCallback(async () => {
    if (!id) {
      setDelivery(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('deliveries')
        .select(
          DELIVERY_SELECT,
        )
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setDelivery((data as DeliveryWithJoins) ?? null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch delivery';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchDelivery();
  }, [fetchDelivery]);

  return {
    delivery,
    loading,
    error,
    refetch: fetchDelivery,
  };
}

// ---------------------------------------------------------------------------
// Hook -- delivery items for a given delivery
// ---------------------------------------------------------------------------

export interface UseDeliveryItemsReturn {
  items: DeliveryItemWithJoins[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addItem: (data: DeliveryItemInsert) => Promise<DeliveryItemRow | null>;
  updateItem: (id: string, data: DeliveryItemUpdate) => Promise<DeliveryItemRow | null>;
  removeItem: (id: string) => Promise<boolean>;
}

export function useDeliveryItems(deliveryId: string): UseDeliveryItemsReturn {
  const [items, setItems] = useState<DeliveryItemWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // ---- Fetch items --------------------------------------------------------

  const fetchItems = useCallback(async () => {
    if (!deliveryId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('delivery_items')
        .select(
          DELIVERY_ITEM_SELECT,
        )
        .eq('delivery_id', deliveryId)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      setItems((data as DeliveryItemWithJoins[]) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch delivery items';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [deliveryId, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ---- Add item -----------------------------------------------------------

  const addItem = useCallback(
    async (data: DeliveryItemInsert): Promise<DeliveryItemRow | null> => {
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
          .from('delivery_items')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Item added', description: 'Delivery item has been added.', variant: 'success' });
        await fetchItems();

        return created as DeliveryItemRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to add delivery item';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchItems],
  );

  // ---- Update item --------------------------------------------------------

  const updateItem = useCallback(
    async (id: string, data: DeliveryItemUpdate): Promise<DeliveryItemRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('delivery_items')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Item updated', description: 'Delivery item has been saved.', variant: 'success' });
        await fetchItems();

        return updated as DeliveryItemRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update delivery item';
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
          .from('delivery_items')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Item removed', variant: 'success' });
        await fetchItems();

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to remove delivery item';
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
