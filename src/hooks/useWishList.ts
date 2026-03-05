import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { WishListItemRow, ArtworkRow } from '../types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WishListItemWithArtwork extends WishListItemRow {
  artworks: ArtworkRow | null;
}

export interface UseWishListReturn {
  items: WishListItemWithArtwork[];
  loading: boolean;
  refetch: () => Promise<void>;
  addItem: (artworkId: string, notes?: string) => Promise<WishListItemRow | null>;
  removeItem: (id: string) => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWishList(contactId: string): UseWishListReturn {
  const [items, setItems] = useState<WishListItemWithArtwork[]>([]);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

  // ---- Fetch wish list items ----------------------------------------------

  const fetchItems = useCallback(async () => {
    if (!contactId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('wish_list_items')
        .select('*, artworks(*)')
        .eq('contact_id', contactId)
        .order('added_date', { ascending: false });

      if (fetchError) throw fetchError;

      setItems((data as WishListItemWithArtwork[]) ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch wish list';
      toast({ title: 'Error', description: message, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [contactId, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ---- Add item -----------------------------------------------------------

  const addItem = useCallback(
    async (artworkId: string, notes?: string): Promise<WishListItemRow | null> => {
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
          .from('wish_list_items')
          .insert({
            user_id: session.user.id,
            contact_id: contactId,
            artwork_id: artworkId,
            notes: notes ?? null,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        toast({ title: 'Added to wish list', description: 'Artwork has been added to the wish list.', variant: 'success' });

        return created as WishListItemRow;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to add to wish list';
        toast({ title: 'Error', description: message, variant: 'error' });
        return null;
      }
    },
    [contactId, toast],
  );

  // ---- Remove item --------------------------------------------------------

  const removeItem = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await supabase
          .from('wish_list_items')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        toast({ title: 'Removed from wish list', variant: 'success' });

        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to remove from wish list';
        toast({ title: 'Error', description: message, variant: 'error' });
        return false;
      }
    },
    [toast],
  );

  return {
    items,
    loading,
    refetch: fetchItems,
    addItem,
    removeItem,
  };
}
