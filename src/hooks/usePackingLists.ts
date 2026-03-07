import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { sanitizeFilterTerm } from '../lib/utils';
import type {
  PackingListRow,
  PackingListInsert,
  PackingListUpdate,
  PackingListItemRow,
  PackingListItemInsert,
  PackingListItemUpdate,
} from '../types/database';

// ---------------------------------------------------------------------------
// Extended row types with joined data
// ---------------------------------------------------------------------------

export interface PackingListWithJoins extends PackingListRow {
  deliveries?: { delivery_number: string } | null;
}

export interface PackingListItemWithJoins extends PackingListItemRow {
  artworks?: {
    title: string;
    reference_code: string;
    medium: string | null;
    height: number | null;
    width: number | null;
    depth: number | null;
    dimension_unit: string | null;
    weight: number | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Filter / pagination types
// ---------------------------------------------------------------------------

export interface PackingListFilters {
  deliveryId?: string;
  search?: string; // searches packing_number or recipient_name
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UsePackingListsOptions {
  filters?: PackingListFilters;
  page?: number;
  pageSize?: number;
}

export interface UsePackingListsReturn {
  packingLists: PackingListWithJoins[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
  createPackingList: (data: PackingListInsert) => Promise<PackingListRow | null>;
  updatePackingList: (id: string, data: PackingListUpdate) => Promise<PackingListRow | null>;
  deletePackingList: (id: string) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Joined select strings
// ---------------------------------------------------------------------------

const PACKING_LIST_SELECT = `*, deliveries(delivery_number)`;

const PACKING_LIST_ITEM_SELECT = `*, artworks(title, reference_code, medium, height, width, depth, dimension_unit, weight)`;

// ---------------------------------------------------------------------------
// Hook -- list all packing lists with optional filters
// ---------------------------------------------------------------------------

export function usePackingLists(options: UsePackingListsOptions = {}): UsePackingListsReturn {
  const { filters = {}, page = 1, pageSize = 24 } = options;

  const [packingLists, setPackingLists] = useState<PackingListWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  // ---- Fetch packing lists --------------------------------------------------

  const fetchPackingLists = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('packing_lists')
        .select(
          PACKING_LIST_SELECT,
          { count: 'exact' },
        );

      // Delivery filter
      if (filters.deliveryId) {
        query = query.eq('delivery_id', filters.deliveryId);
      }

      // Search filter: match packing_number or recipient_name
      if (filters.search) {
        const term = `%${sanitizeFilterTerm(filters.search)}%`;
        query = query.or(`packing_number.ilike.${term},recipient_name.ilike.${term}`);
      }

      // Sorting
      const sortBy = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination (offset-based via .range)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setPackingLists((data as PackingListWithJoins[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch packing lists';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters.deliveryId, filters.search, filters.sortBy, filters.sortOrder, page, pageSize, toast]);

  useEffect(() => {
    fetchPackingLists();
  }, [fetchPackingLists]);

  // ---- Create packing list --------------------------------------------------

  const createPackingList = useCallback(
    async (data: PackingListInsert): Promise<PackingListRow | null> => {
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
          .from('packing_lists')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Packing list created', description: 'Packing list has been added.', variant: 'success' });
        await fetchPackingLists();

        return created as PackingListRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create packing list';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast, fetchPackingLists],
  );

  // ---- Update packing list --------------------------------------------------

  const updatePackingList = useCallback(
    async (id: string, data: PackingListUpdate): Promise<PackingListRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('packing_lists')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Packing list updated', description: 'Packing list has been saved.', variant: 'success' });
        await fetchPackingLists();

        return updated as PackingListRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update packing list';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast, fetchPackingLists],
  );

  // ---- Delete packing list --------------------------------------------------

  const deletePackingList = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('packing_lists')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Packing list deleted', variant: 'success' });
        await fetchPackingLists();

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete packing list';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return false;
      }
    },
    [toast, fetchPackingLists],
  );

  return {
    packingLists,
    loading,
    error,
    totalCount,
    refetch: fetchPackingLists,
    createPackingList,
    updatePackingList,
    deletePackingList,
  };
}

// ---------------------------------------------------------------------------
// Hook -- single packing list by ID
// ---------------------------------------------------------------------------

export interface UsePackingListReturn {
  packingList: PackingListWithJoins | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePackingList(id: string): UsePackingListReturn {
  const [packingList, setPackingList] = useState<PackingListWithJoins | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchPackingList = useCallback(async () => {
    if (!id) {
      setPackingList(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('packing_lists')
        .select(
          PACKING_LIST_SELECT,
        )
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setPackingList((data as PackingListWithJoins) ?? null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch packing list';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchPackingList();
  }, [fetchPackingList]);

  return {
    packingList,
    loading,
    error,
    refetch: fetchPackingList,
  };
}

// ---------------------------------------------------------------------------
// Hook -- packing list items for a given packing list
// ---------------------------------------------------------------------------

export interface UsePackingListItemsReturn {
  items: PackingListItemWithJoins[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addItem: (data: PackingListItemInsert) => Promise<PackingListItemRow | null>;
  updateItem: (id: string, data: PackingListItemUpdate) => Promise<PackingListItemRow | null>;
  removeItem: (id: string) => Promise<boolean>;
}

export function usePackingListItems(packingListId: string): UsePackingListItemsReturn {
  const [items, setItems] = useState<PackingListItemWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // ---- Fetch items --------------------------------------------------------

  const fetchItems = useCallback(async () => {
    if (!packingListId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('packing_list_items')
        .select(
          PACKING_LIST_ITEM_SELECT,
        )
        .eq('packing_list_id', packingListId)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      setItems((data as PackingListItemWithJoins[]) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch packing list items';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [packingListId, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ---- Add item -----------------------------------------------------------

  const addItem = useCallback(
    async (data: PackingListItemInsert): Promise<PackingListItemRow | null> => {
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
          .from('packing_list_items')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Item added', description: 'Packing list item has been added.', variant: 'success' });
        await fetchItems();

        return created as PackingListItemRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to add packing list item';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast, fetchItems],
  );

  // ---- Update item --------------------------------------------------------

  const updateItem = useCallback(
    async (id: string, data: PackingListItemUpdate): Promise<PackingListItemRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('packing_list_items')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Item updated', description: 'Packing list item has been saved.', variant: 'success' });
        await fetchItems();

        return updated as PackingListItemRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update packing list item';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
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
          .from('packing_list_items')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Item removed', variant: 'success' });
        await fetchItems();

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to remove packing list item';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
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
