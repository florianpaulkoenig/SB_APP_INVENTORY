// ---------------------------------------------------------------------------
// NOA Inventory -- Bulk Operations Hook
// Batch operations for art fair preparation: bulk status changes, price
// updates, and gallery assignments.
// ---------------------------------------------------------------------------

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BulkSelectionItem {
  artworkId: string;
  artworkTitle: string;
  series: string | null;
  currentStatus: string;
  currentPrice: number | null;
  currency: string | null;
  galleryName: string | null;
}

export interface BulkOperationResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export interface UseBulkOperationsReturn {
  // Selection
  selectedItems: BulkSelectionItem[];
  loadArtworks: (filters: {
    galleryId?: string;
    series?: string;
    status?: string;
    exhibitionId?: string;
  }) => Promise<void>;
  toggleSelection: (artworkId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  loading: boolean;
  availableItems: BulkSelectionItem[];

  // Operations
  bulkStatusChange: (
    artworkIds: string[],
    newStatus: string,
  ) => Promise<BulkOperationResult>;
  bulkPriceUpdate: (
    artworkIds: string[],
    changeType: 'percentage' | 'fixed',
    value: number,
    note: string,
  ) => Promise<BulkOperationResult>;
  bulkAssignGallery: (
    artworkIds: string[],
    galleryId: string,
  ) => Promise<BulkOperationResult>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBulkOperations(): UseBulkOperationsReturn {
  const { toast } = useToast();

  const [availableItems, setAvailableItems] = useState<BulkSelectionItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // ---- Load artworks with optional filters --------------------------------

  const loadArtworks = useCallback(
    async (filters: {
      galleryId?: string;
      series?: string;
      status?: string;
      exhibitionId?: string;
    }) => {
      setLoading(true);
      setSelectedIds(new Set());

      try {
        // If filtering by exhibition, first get artwork IDs from junction table
        let exhibitionArtworkIds: string[] | null = null;
        if (filters.exhibitionId) {
          const { data: exArtworks, error: exErr } = await supabase
            .from('exhibition_artworks')
            .select('artwork_id')
            .eq('exhibition_id', filters.exhibitionId);
          if (exErr) throw exErr;
          exhibitionArtworkIds = (exArtworks ?? []).map((ea) => ea.artwork_id);
          if (exhibitionArtworkIds.length === 0) {
            setAvailableItems([]);
            setLoading(false);
            return;
          }
        }

        let query = supabase
          .from('artworks')
          .select('id, title, series, status, price, currency, gallery_id, galleries!artworks_gallery_id_fkey(name)');

        if (filters.galleryId) {
          query = query.eq('gallery_id', filters.galleryId);
        }
        if (filters.series) {
          query = query.eq('series', filters.series);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (exhibitionArtworkIds) {
          query = query.in('id', exhibitionArtworkIds);
        }

        query = query.order('title', { ascending: true });

        const { data, error } = await query;
        if (error) throw error;

        const items: BulkSelectionItem[] = (data ?? []).map((row: Record<string, unknown>) => {
          const galleries = row.galleries as { name: string } | null;
          return {
            artworkId: row.id as string,
            artworkTitle: (row.title as string) || 'Untitled',
            series: (row.series as string) || null,
            currentStatus: row.status as string,
            currentPrice: (row.price as number) ?? null,
            currency: (row.currency as string) ?? null,
            galleryName: galleries?.name ?? null,
          };
        });

        setAvailableItems(items);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load artworks';
        toast({ title: 'Error', description: message, variant: 'error' });
        setAvailableItems([]);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // ---- Selection management -----------------------------------------------

  const toggleSelection = useCallback((artworkId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(artworkId)) {
        next.delete(artworkId);
      } else {
        next.add(artworkId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(availableItems.map((item) => item.artworkId)));
  }, [availableItems]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedItems = availableItems.filter((item) => selectedIds.has(item.artworkId));

  // ---- Bulk status change -------------------------------------------------

  const bulkStatusChange = useCallback(
    async (artworkIds: string[], newStatus: string): Promise<BulkOperationResult> => {
      const result: BulkOperationResult = {
        total: artworkIds.length,
        success: 0,
        failed: 0,
        errors: [],
      };

      const { error } = await supabase
        .from('artworks')
        .update({ status: newStatus } as never)
        .in('id', artworkIds);

      if (error) {
        result.failed = artworkIds.length;
        result.errors.push(error.message);
      } else {
        result.success = artworkIds.length;
        // Update local state
        setAvailableItems((prev) =>
          prev.map((item) =>
            artworkIds.includes(item.artworkId)
              ? { ...item, currentStatus: newStatus }
              : item,
          ),
        );
      }

      return result;
    },
    [],
  );

  // ---- Bulk price update --------------------------------------------------

  const bulkPriceUpdate = useCallback(
    async (
      artworkIds: string[],
      changeType: 'percentage' | 'fixed',
      value: number,
      note: string,
    ): Promise<BulkOperationResult> => {
      const result: BulkOperationResult = {
        total: artworkIds.length,
        success: 0,
        failed: 0,
        errors: [],
      };

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        result.failed = artworkIds.length;
        result.errors.push('Not authenticated');
        return result;
      }

      const today = new Date().toISOString().slice(0, 10);

      // Get current prices for affected artworks
      const { data: artworks, error: fetchErr } = await supabase
        .from('artworks')
        .select('id, price, currency')
        .in('id', artworkIds);

      if (fetchErr || !artworks) {
        result.failed = artworkIds.length;
        result.errors.push(fetchErr?.message ?? 'Failed to fetch artwork prices');
        return result;
      }

      for (const artwork of artworks) {
        const currentPrice = artwork.price as number | null;
        if (currentPrice == null) {
          result.failed++;
          result.errors.push(`${artwork.id}: no current price`);
          continue;
        }

        let newPrice: number;
        if (changeType === 'percentage') {
          newPrice = Math.round(currentPrice * (1 + value / 100));
        } else {
          newPrice = currentPrice + value;
        }
        newPrice = Math.max(0, newPrice);

        const { error: updateErr } = await supabase
          .from('artworks')
          .update({ price: newPrice } as never)
          .eq('id', artwork.id);

        if (updateErr) {
          result.failed++;
          result.errors.push(`${artwork.id}: ${updateErr.message}`);
          continue;
        }

        // Insert price history entry
        await supabase.from('price_history').insert({
          user_id: session.user.id,
          artwork_id: artwork.id,
          price: newPrice,
          currency: artwork.currency,
          effective_date: today,
          notes: note,
        } as never);

        result.success++;

        // Update local state
        setAvailableItems((prev) =>
          prev.map((item) =>
            item.artworkId === artwork.id
              ? { ...item, currentPrice: newPrice }
              : item,
          ),
        );
      }

      return result;
    },
    [],
  );

  // ---- Bulk assign gallery ------------------------------------------------

  const bulkAssignGallery = useCallback(
    async (artworkIds: string[], galleryId: string): Promise<BulkOperationResult> => {
      const result: BulkOperationResult = {
        total: artworkIds.length,
        success: 0,
        failed: 0,
        errors: [],
      };

      // Get gallery name for local state update
      const { data: gallery } = await supabase
        .from('galleries')
        .select('name')
        .eq('id', galleryId)
        .single();

      const { error } = await supabase
        .from('artworks')
        .update({ gallery_id: galleryId } as never)
        .in('id', artworkIds);

      if (error) {
        result.failed = artworkIds.length;
        result.errors.push(error.message);
      } else {
        result.success = artworkIds.length;
        // Update local state
        const galleryName = gallery?.name ?? null;
        setAvailableItems((prev) =>
          prev.map((item) =>
            artworkIds.includes(item.artworkId)
              ? { ...item, galleryName }
              : item,
          ),
        );
      }

      return result;
    },
    [],
  );

  // ---- Return -------------------------------------------------------------

  return {
    selectedItems,
    loadArtworks,
    toggleSelection,
    selectAll,
    clearSelection,
    loading,
    availableItems,
    bulkStatusChange,
    bulkPriceUpdate,
    bulkAssignGallery,
  };
}
