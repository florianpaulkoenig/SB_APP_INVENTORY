import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type {
  GalleryForwardingOrderRow,
  GalleryForwardingOrderInsert,
  GalleryForwardingOrderUpdate,
  GalleryForwardingItemRow,
  GalleryForwardingItemInsert,
  GalleryForwardingItemUpdate,
  ForwardingStatus,
} from '../types/database';

// ---------------------------------------------------------------------------
// Extended row types with joined data
// ---------------------------------------------------------------------------

export interface GalleryForwardingItemWithJoins extends GalleryForwardingItemRow {
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

export interface GalleryForwardingFilters {
  status?: ForwardingStatus;
  search?: string;
}

export interface UseGalleryForwardingsOptions {
  filters?: GalleryForwardingFilters;
  page?: number;
  pageSize?: number;
}

export interface UseGalleryForwardingsReturn {
  forwardings: GalleryForwardingOrderRow[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
  createForwarding: (data: GalleryForwardingOrderInsert) => Promise<GalleryForwardingOrderRow | null>;
  updateForwarding: (id: string, data: GalleryForwardingOrderUpdate) => Promise<GalleryForwardingOrderRow | null>;
  deleteForwarding: (id: string) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Joined select strings
// ---------------------------------------------------------------------------

const FORWARDING_ITEM_SELECT = `*, artworks(title, reference_code, medium, year, height, width, depth, dimension_unit, status)`;

// ---------------------------------------------------------------------------
// Hook -- list all forwarding orders with optional filters
// ---------------------------------------------------------------------------

export function useGalleryForwardings(options: UseGalleryForwardingsOptions = {}): UseGalleryForwardingsReturn {
  const { filters = {}, page = 1, pageSize = 24 } = options;

  const [forwardings, setForwardings] = useState<GalleryForwardingOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  const fetchForwardings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('gallery_forwarding_orders')
        .select('*', { count: 'exact' });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.search) {
        const term = `%${filters.search}%`;
        query = query.or(`forwarding_number.ilike.${term},title.ilike.${term}`);
      }

      query = query.order('created_at', { ascending: false });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setForwardings((data as GalleryForwardingOrderRow[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch forwarding orders';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.search, page, pageSize, toast]);

  useEffect(() => {
    fetchForwardings();
  }, [fetchForwardings]);

  // ---- Create ---------------------------------------------------------------

  const createForwarding = useCallback(
    async (data: GalleryForwardingOrderInsert): Promise<GalleryForwardingOrderRow | null> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return null;
        }

        const { data: created, error: insertError } = await supabase
          .from('gallery_forwarding_orders')
          .insert({ ...data, user_id: session.user.id } as never)
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Forwarding order created', variant: 'success' });
        await fetchForwardings();

        return created as GalleryForwardingOrderRow;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create forwarding order';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchForwardings],
  );

  // ---- Update ---------------------------------------------------------------

  const updateForwarding = useCallback(
    async (id: string, data: GalleryForwardingOrderUpdate): Promise<GalleryForwardingOrderRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('gallery_forwarding_orders')
          .update(data as never)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Forwarding order updated', variant: 'success' });
        await fetchForwardings();

        return updated as GalleryForwardingOrderRow;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update forwarding order';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchForwardings],
  );

  // ---- Delete ---------------------------------------------------------------

  const deleteForwarding = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('gallery_forwarding_orders')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Forwarding order deleted', variant: 'success' });
        await fetchForwardings();

        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete forwarding order';
        toast({ title: 'Error', description: message, variant: 'error' });
        return false;
      }
    },
    [toast, fetchForwardings],
  );

  return {
    forwardings,
    loading,
    error,
    totalCount,
    refetch: fetchForwardings,
    createForwarding,
    updateForwarding,
    deleteForwarding,
  };
}

// ---------------------------------------------------------------------------
// Hook -- single forwarding order by ID
// ---------------------------------------------------------------------------

export interface UseGalleryForwardingReturn {
  forwarding: GalleryForwardingOrderRow | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGalleryForwarding(id: string): UseGalleryForwardingReturn {
  const [forwarding, setForwarding] = useState<GalleryForwardingOrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchForwarding = useCallback(async () => {
    if (!id) {
      setForwarding(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('gallery_forwarding_orders')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setForwarding((data as GalleryForwardingOrderRow) ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch forwarding order';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchForwarding();
  }, [fetchForwarding]);

  return {
    forwarding,
    loading,
    error,
    refetch: fetchForwarding,
  };
}

// ---------------------------------------------------------------------------
// Hook -- forwarding items for a given order
// ---------------------------------------------------------------------------

export interface UseGalleryForwardingItemsReturn {
  items: GalleryForwardingItemWithJoins[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addItem: (artworkId: string) => Promise<GalleryForwardingItemRow | null>;
  removeItem: (id: string) => Promise<boolean>;
}

export function useGalleryForwardingItems(forwardingOrderId: string): UseGalleryForwardingItemsReturn {
  const [items, setItems] = useState<GalleryForwardingItemWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    if (!forwardingOrderId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('gallery_forwarding_items')
        .select(FORWARDING_ITEM_SELECT)
        .eq('forwarding_order_id', forwardingOrderId)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      setItems((data as GalleryForwardingItemWithJoins[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch forwarding items';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [forwardingOrderId, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ---- Add item (by artwork ID) -------------------------------------------

  const addItem = useCallback(
    async (artworkId: string): Promise<GalleryForwardingItemRow | null> => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          toast({ title: 'Error', description: 'You must be logged in', variant: 'error' });
          return null;
        }

        const { data: created, error: insertError } = await supabase
          .from('gallery_forwarding_items')
          .insert({
            forwarding_order_id: forwardingOrderId,
            artwork_id: artworkId,
            user_id: session.user.id,
          } as never)
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Artwork added', variant: 'success' });
        await fetchItems();

        return created as GalleryForwardingItemRow;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to add artwork';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [forwardingOrderId, toast, fetchItems],
  );

  // ---- Remove item ----------------------------------------------------------

  const removeItem = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('gallery_forwarding_items')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Artwork removed', variant: 'success' });
        await fetchItems();

        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to remove artwork';
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
    removeItem,
  };
}
