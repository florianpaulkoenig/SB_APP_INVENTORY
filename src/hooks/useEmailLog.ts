import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { EmailLogRow, EmailStatus } from '../types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailLogWithJoins extends EmailLogRow {
  contacts?: {
    first_name: string;
    last_name: string;
  } | null;
}

export interface EmailLogFilters {
  contactId?: string;
  search?: string; // ilike on subject or to_email
  templateType?: string;
  status?: EmailStatus;
}

export interface UseEmailLogOptions {
  filters?: EmailLogFilters;
  page?: number;
  pageSize?: number;
}

export interface UseEmailLogReturn {
  emails: EmailLogWithJoins[];
  loading: boolean;
  totalCount: number;
  refetch: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook -- email log (read-only)
// ---------------------------------------------------------------------------

export function useEmailLog(options: UseEmailLogOptions = {}): UseEmailLogReturn {
  const { filters = {}, page = 1, pageSize = 24 } = options;

  const [emails, setEmails] = useState<EmailLogWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  // ---- Fetch emails -------------------------------------------------------

  const fetchEmails = useCallback(async () => {
    setLoading(true);

    try {
      let query = supabase
        .from('email_log')
        .select('*, contacts(first_name, last_name)', { count: 'exact' });

      // Filter by contact
      if (filters.contactId) {
        query = query.eq('contact_id', filters.contactId);
      }

      // Search filter: match subject or to_email
      if (filters.search) {
        const term = `%${filters.search}%`;
        query = query.or(
          `subject.ilike.${term},to_email.ilike.${term}`,
        );
      }

      // Template type filter
      if (filters.templateType) {
        query = query.eq('template_type', filters.templateType);
      }

      // Status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Order by sent_at descending (newest first)
      query = query.order('sent_at', { ascending: false });

      // Pagination (offset-based via .range)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setEmails((data as EmailLogWithJoins[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch email log';
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [
    filters.contactId,
    filters.search,
    filters.templateType,
    filters.status,
    page,
    pageSize,
    toast,
  ]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  return {
    emails,
    loading,
    totalCount,
    refetch: fetchEmails,
  };
}
