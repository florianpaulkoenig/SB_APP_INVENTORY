import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { sanitizeFilterTerm } from '../lib/utils';
import type { CertificateRow, CertificateInsert, CertificateUpdate } from '../types/database';

// ---------------------------------------------------------------------------
// Extended row type with joined data
// ---------------------------------------------------------------------------

export interface CertificateWithJoins extends CertificateRow {
  artworks?: {
    title: string;
    reference_code: string;
    medium: string | null;
    year: number | null;
    height: number | null;
    width: number | null;
    depth: number | null;
    dimension_unit: string | null;
    framed_height: number | null;
    framed_width: number | null;
    framed_depth: number | null;
    edition_type: string | null;
    edition_number: number | null;
    edition_total: number | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Filter / pagination types
// ---------------------------------------------------------------------------

export interface CertificateFilters {
  artworkId?: string;
  search?: string; // searches certificate_number
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseCertificatesOptions {
  filters?: CertificateFilters;
  page?: number;
  pageSize?: number;
}

export interface UseCertificatesReturn {
  certificates: CertificateWithJoins[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => Promise<void>;
  createCertificate: (data: CertificateInsert) => Promise<CertificateRow | null>;
  updateCertificate: (id: string, data: CertificateUpdate) => Promise<CertificateRow | null>;
  deleteCertificate: (id: string) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Joined select string
// ---------------------------------------------------------------------------

const CERTIFICATE_SELECT = `*, artworks(title, reference_code, medium, year, height, width, depth, dimension_unit, framed_height, framed_width, framed_depth, edition_type, edition_number, edition_total)`;

// ---------------------------------------------------------------------------
// Hook -- list all certificates with optional filters
// ---------------------------------------------------------------------------

export function useCertificates(options: UseCertificatesOptions = {}): UseCertificatesReturn {
  const { filters = {}, page = 1, pageSize = 24 } = options;

  const [certificates, setCertificates] = useState<CertificateWithJoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { toast } = useToast();

  // ---- Fetch certificates ---------------------------------------------------

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('certificates')
        .select(
          CERTIFICATE_SELECT,
          { count: 'exact' },
        );

      // Artwork filter
      if (filters.artworkId) {
        query = query.eq('artwork_id', filters.artworkId);
      }

      // Search filter: match certificate_number
      if (filters.search) {
        const term = `%${sanitizeFilterTerm(filters.search)}%`;
        query = query.ilike('certificate_number', term);
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

      setCertificates((data as CertificateWithJoins[]) ?? []);
      setTotalCount(count ?? 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch certificates';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters.artworkId, filters.search, filters.sortBy, filters.sortOrder, page, pageSize, toast]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  // ---- Create certificate ---------------------------------------------------

  const createCertificate = useCallback(
    async (data: CertificateInsert): Promise<CertificateRow | null> => {
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
          .from('certificates')
          .insert({ ...data, user_id: session.user.id })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Certificate created', description: 'Certificate has been added.', variant: 'success' });
        await fetchCertificates();

        return created as CertificateRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create certificate';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchCertificates],
  );

  // ---- Update certificate ---------------------------------------------------

  const updateCertificate = useCallback(
    async (id: string, data: CertificateUpdate): Promise<CertificateRow | null> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('certificates')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) throw updateError;

        toast({ title: 'Certificate updated', description: 'Certificate has been saved.', variant: 'success' });
        await fetchCertificates();

        return updated as CertificateRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update certificate';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [toast, fetchCertificates],
  );

  // ---- Delete certificate ---------------------------------------------------

  const deleteCertificate = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('certificates')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Certificate deleted', variant: 'success' });
        await fetchCertificates();

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete certificate';
        toast({ title: 'Error', description: message, variant: 'error' });
        return false;
      }
    },
    [toast, fetchCertificates],
  );

  return {
    certificates,
    loading,
    error,
    totalCount,
    refetch: fetchCertificates,
    createCertificate,
    updateCertificate,
    deleteCertificate,
  };
}

// ---------------------------------------------------------------------------
// Hook -- single certificate by ID
// ---------------------------------------------------------------------------

export interface UseCertificateReturn {
  certificate: CertificateWithJoins | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCertificate(id: string): UseCertificateReturn {
  const [certificate, setCertificate] = useState<CertificateWithJoins | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const fetchCertificate = useCallback(async () => {
    if (!id) {
      setCertificate(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('certificates')
        .select(
          CERTIFICATE_SELECT,
        )
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      setCertificate((data as CertificateWithJoins) ?? null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch certificate';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchCertificate();
  }, [fetchCertificate]);

  return {
    certificate,
    loading,
    error,
    refetch: fetchCertificate,
  };
}
