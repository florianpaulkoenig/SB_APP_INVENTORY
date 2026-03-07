import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { sanitizeFilterTerm } from '../lib/utils';
import type { ContactRow, ContactInsert, ContactUpdate } from '../types/database';

// ---------------------------------------------------------------------------
// Filter / pagination types
// ---------------------------------------------------------------------------

export interface ContactFilters {
  search?: string; // searches first_name, last_name, company, email
  type?: string; // 'collector' | 'prospect' | 'institution'
  country?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseContactsOptions {
  filters?: ContactFilters;
  page?: number;
  pageSize?: number;
}

export interface UseContactsReturn {
  contacts: ContactRow[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
  createContact: (data: ContactInsert) => Promise<ContactRow | null>;
  updateContact: (id: string, data: ContactUpdate) => Promise<ContactRow | null>;
  deleteContact: (id: string) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Hook – list with pagination
// ---------------------------------------------------------------------------

export function useContacts(options: UseContactsOptions = {}): UseContactsReturn {
  const { filters = {}, page = 1, pageSize = 24 } = options;

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  // ---- Fetch contacts -----------------------------------------------------

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('contacts')
        .select('*', { count: 'exact' });

      // Search filter: match first_name, last_name, company, or email
      if (filters.search) {
        const term = `%${sanitizeFilterTerm(filters.search)}%`;
        query = query.or(
          `first_name.ilike.${term},last_name.ilike.${term},company.ilike.${term},email.ilike.${term}`,
        );
      }

      // Type filter
      if (filters.type) {
        query = query.eq('type', filters.type);
      }

      // Country filter
      if (filters.country) {
        query = query.eq('country', filters.country);
      }

      // Sorting (whitelist to prevent SQL injection via arbitrary column names)
      const VALID_SORT_COLUMNS: readonly string[] = ['created_at', 'first_name', 'last_name', 'email', 'company', 'role', 'city', 'country'];
      const rawSortBy = filters.sortBy || 'last_name';
      const safeSortBy = VALID_SORT_COLUMNS.includes(rawSortBy) ? rawSortBy : 'last_name';
      const sortOrder = filters.sortOrder || 'asc';
      query = query.order(safeSortBy, { ascending: sortOrder === 'asc' });

      // Pagination (offset-based via .range)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setContacts((data as ContactRow[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch contacts';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters.search, filters.type, filters.country, filters.sortBy, filters.sortOrder, page, pageSize, toast]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // ---- Create contact -----------------------------------------------------

  const createContact = useCallback(
    async (data: ContactInsert): Promise<ContactRow | null> => {
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
          .from('contacts')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Contact created', description: `"${created.first_name} ${created.last_name}" has been added.`, variant: 'success' });

        return created as ContactRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create contact';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast],
  );

  // ---- Update contact -----------------------------------------------------

  const updateContact = useCallback(
    async (id: string, data: ContactUpdate): Promise<ContactRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('contacts')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Contact updated', description: `"${updated.first_name} ${updated.last_name}" has been saved.`, variant: 'success' });

        return updated as ContactRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update contact';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return null;
      }
    },
    [toast],
  );

  // ---- Delete contact -----------------------------------------------------

  const deleteContact = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('contacts')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Contact deleted', variant: 'success' });

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete contact';
        toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
        return false;
      }
    },
    [toast],
  );

  return {
    contacts,
    loading,
    error,
    totalCount,
    refetch: fetchContacts,
    createContact,
    updateContact,
    deleteContact,
  };
}

// ---------------------------------------------------------------------------
// Hook – single contact by ID
// ---------------------------------------------------------------------------

export interface UseContactReturn {
  contact: ContactRow | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useContact(id: string): UseContactReturn {
  const [contact, setContact] = useState<ContactRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchContact = useCallback(async () => {
    if (!id) {
      setContact(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setContact((data as ContactRow) ?? null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch contact';
      setError(message);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  return {
    contact,
    loading,
    error,
    refetch: fetchContact,
  };
}
