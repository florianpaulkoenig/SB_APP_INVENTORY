import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { sanitizeFilterTerm } from '../lib/utils';
import type {
  InvoiceRow,
  InvoiceInsert,
  InvoiceUpdate,
  InvoiceItemRow,
  InvoiceItemInsert,
  InvoiceItemUpdate,
  InvoiceStatus,
} from '../types/database';

// ---------------------------------------------------------------------------
// Extended row types with joined data
// ---------------------------------------------------------------------------

export interface InvoiceWithJoins extends InvoiceRow {
  contacts?: { first_name: string; last_name: string } | null;
  galleries?: { name: string } | null;
}

export interface InvoiceItemWithJoins extends InvoiceItemRow {
  artworks?: { title: string; reference_code: string } | null;
}

// ---------------------------------------------------------------------------
// Filter / pagination types
// ---------------------------------------------------------------------------

export interface InvoiceFilters {
  status?: InvoiceStatus;
  contactId?: string;
  galleryId?: string;
  search?: string; // searches invoice_number
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseInvoicesOptions {
  filters?: InvoiceFilters;
  page?: number;
  pageSize?: number;
}

export interface UseInvoicesReturn {
  invoices: InvoiceWithJoins[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
  createInvoice: (data: InvoiceInsert) => Promise<InvoiceRow | null>;
  updateInvoice: (id: string, data: InvoiceUpdate) => Promise<InvoiceRow | null>;
  deleteInvoice: (id: string) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Hook -- list all invoices with optional filters
// ---------------------------------------------------------------------------

export function useInvoices(options: UseInvoicesOptions = {}): UseInvoicesReturn {
  const { filters = {}, page = 1, pageSize = 24 } = options;

  const [invoices, setInvoices] = useState<InvoiceWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  // ---- Fetch invoices -----------------------------------------------------

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('invoices')
        .select(
          `*, contacts(first_name, last_name), galleries(name)`,
          { count: 'exact' },
        );

      // Status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Contact filter
      if (filters.contactId) {
        query = query.eq('contact_id', filters.contactId);
      }

      // Gallery filter
      if (filters.galleryId) {
        query = query.eq('gallery_id', filters.galleryId);
      }

      // Search filter: match invoice_number
      if (filters.search) {
        const term = `%${sanitizeFilterTerm(filters.search)}%`;
        query = query.ilike('invoice_number', term);
      }

      // Sorting (whitelist to prevent SQL injection via arbitrary column names)
      const VALID_SORT_COLUMNS: readonly string[] = ['created_at', 'invoice_number', 'issue_date', 'due_date', 'status', 'total'];
      const rawSortBy = filters.sortBy || 'issue_date';
      const safeSortBy = VALID_SORT_COLUMNS.includes(rawSortBy) ? rawSortBy : 'issue_date';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.order(safeSortBy, { ascending: sortOrder === 'asc' });

      // Pagination (offset-based via .range)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setInvoices((data as InvoiceWithJoins[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch invoices';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.contactId, filters.galleryId, filters.search, filters.sortBy, filters.sortOrder, page, pageSize, toast]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // ---- Create invoice -----------------------------------------------------

  const createInvoice = useCallback(
    async (data: InvoiceInsert): Promise<InvoiceRow | null> => {
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
          .from('invoices')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Invoice created', description: `Invoice ${created.invoice_number} has been added.`, variant: 'success' });
        await fetchInvoices();

        return created as InvoiceRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create invoice';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchInvoices],
  );

  // ---- Update invoice -----------------------------------------------------

  const updateInvoice = useCallback(
    async (id: string, data: InvoiceUpdate): Promise<InvoiceRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('invoices')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Invoice updated', description: `Invoice ${updated.invoice_number} has been saved.`, variant: 'success' });
        await fetchInvoices();

        return updated as InvoiceRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update invoice';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchInvoices],
  );

  // ---- Delete invoice -----------------------------------------------------

  const deleteInvoice = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('invoices')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Invoice deleted', variant: 'success' });
        await fetchInvoices();

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete invoice';
        toast({ title: 'Error', description: message, variant: 'error' });
        return false;
      }
    },
    [toast, fetchInvoices],
  );

  return {
    invoices,
    loading,
    error,
    totalCount,
    refetch: fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
  };
}

// ---------------------------------------------------------------------------
// Hook -- single invoice by ID
// ---------------------------------------------------------------------------

export interface UseInvoiceReturn {
  invoice: InvoiceWithJoins | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateInvoice: (data: InvoiceUpdate) => Promise<InvoiceRow | null>;
  deleteInvoice: () => Promise<boolean>;
}

export function useInvoice(id: string): UseInvoiceReturn {
  const [invoice, setInvoice] = useState<InvoiceWithJoins | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchInvoice = useCallback(async () => {
    if (!id) {
      setInvoice(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select(
          `*, contacts(first_name, last_name), galleries(name)`,
        )
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setInvoice((data as InvoiceWithJoins) ?? null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch invoice';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // ---- Update invoice (single-record) ------------------------------------

  const updateInvoice = useCallback(
    async (data: InvoiceUpdate): Promise<InvoiceRow | null> => {
      if (!id) return null;
      try {
        const { data: updated, error: updateError } = await supabase
          .from('invoices')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Invoice updated', description: `Invoice ${updated.invoice_number} has been saved.`, variant: 'success' });
        await fetchInvoice();
        return updated as InvoiceRow;
      } catch {
        toast({ title: 'Error', description: 'Failed to update invoice. Please try again.', variant: 'error' });
        return null;
      }
    },
    [id, toast, fetchInvoice],
  );

  // ---- Delete invoice (single-record) ------------------------------------

  const deleteInvoice = useCallback(
    async (): Promise<boolean> => {
      if (!id) return false;
      try {
        const { error: deleteError } = await supabase
          .from('invoices')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Invoice deleted', variant: 'success' });
        return true;
      } catch {
        toast({ title: 'Error', description: 'Failed to delete invoice. Please try again.', variant: 'error' });
        return false;
      }
    },
    [id, toast],
  );

  return {
    invoice,
    loading,
    error,
    refetch: fetchInvoice,
    updateInvoice,
    deleteInvoice,
  };
}

// ---------------------------------------------------------------------------
// Hook -- invoice items for a given invoice
// ---------------------------------------------------------------------------

export interface UseInvoiceItemsReturn {
  items: InvoiceItemWithJoins[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addItem: (data: InvoiceItemInsert) => Promise<InvoiceItemRow | null>;
  updateItem: (id: string, data: InvoiceItemUpdate) => Promise<InvoiceItemRow | null>;
  removeItem: (id: string) => Promise<boolean>;
}

export function useInvoiceItems(invoiceId: string): UseInvoiceItemsReturn {
  const [items, setItems] = useState<InvoiceItemWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  // ---- Recalculate invoice total ------------------------------------------

  const recalculateTotal = useCallback(
    async (currentItems: InvoiceItemWithJoins[]) => {
      if (!invoiceId) return;

      const total = currentItems.reduce(
        (sum, item) => sum + (Number(item.total) || 0),
        0,
      );

      try {
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ total })
          .eq('id', invoiceId);

        if (updateError) throw updateError;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update invoice total';
        toast({ title: 'Error', description: message, variant: 'error' });
      }
    },
    [invoiceId, toast],
  );

  // ---- Fetch items --------------------------------------------------------

  const fetchItems = useCallback(async () => {
    if (!invoiceId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('invoice_items')
        .select(
          `*, artworks(title, reference_code)`,
        )
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setItems((data as InvoiceItemWithJoins[]) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch invoice items';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [invoiceId, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ---- Add item -----------------------------------------------------------

  const addItem = useCallback(
    async (data: InvoiceItemInsert): Promise<InvoiceItemRow | null> => {
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
          .from('invoice_items')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Item added', description: 'Invoice item has been added.', variant: 'success' });

        // Refetch items and recalculate total
        const { data: updatedItems, error: refetchError } = await supabase
          .from('invoice_items')
          .select(`*, artworks(title, reference_code)`)
          .eq('invoice_id', invoiceId)
          .order('created_at', { ascending: true });

        if (!refetchError && updatedItems) {
          const typedItems = updatedItems as InvoiceItemWithJoins[];
          setItems(typedItems);
          await recalculateTotal(typedItems);
        }

        return created as InvoiceItemRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to add invoice item';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, invoiceId, recalculateTotal],
  );

  // ---- Update item --------------------------------------------------------

  const updateItem = useCallback(
    async (id: string, data: InvoiceItemUpdate): Promise<InvoiceItemRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('invoice_items')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Item updated', description: 'Invoice item has been saved.', variant: 'success' });

        // Refetch items and recalculate total
        const { data: updatedItems, error: refetchError } = await supabase
          .from('invoice_items')
          .select(`*, artworks(title, reference_code)`)
          .eq('invoice_id', invoiceId)
          .order('created_at', { ascending: true });

        if (!refetchError && updatedItems) {
          const typedItems = updatedItems as InvoiceItemWithJoins[];
          setItems(typedItems);
          await recalculateTotal(typedItems);
        }

        return updated as InvoiceItemRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update invoice item';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, invoiceId, recalculateTotal],
  );

  // ---- Remove item --------------------------------------------------------

  const removeItem = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Item removed', variant: 'success' });

        // Refetch items and recalculate total
        const { data: updatedItems, error: refetchError } = await supabase
          .from('invoice_items')
          .select(`*, artworks(title, reference_code)`)
          .eq('invoice_id', invoiceId)
          .order('created_at', { ascending: true });

        if (!refetchError && updatedItems) {
          const typedItems = updatedItems as InvoiceItemWithJoins[];
          setItems(typedItems);
          await recalculateTotal(typedItems);
        }

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to remove invoice item';
        toast({ title: 'Error', description: message, variant: 'error' });
        return false;
      }
    },
    [toast, invoiceId, recalculateTotal],
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
