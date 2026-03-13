import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { sanitizeFilterTerm } from '../lib/utils';
import type { AuctionAlertRow, AuctionAlertInsert, AuctionAlertUpdate } from '../types/database';

interface UseAuctionAlertsOptions {
  result?: string;
  auctionHouse?: string;
}

export function useAuctionAlerts(options?: UseAuctionAlertsOptions) {
  const [alerts, setAlerts] = useState<AuctionAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('auction_alerts')
      .select('*')
      .order('sale_date', { ascending: false, nullsFirst: false });

    if (options?.result) query = query.eq('result', options.result);
    if (options?.auctionHouse) query = query.eq('auction_house', options.auctionHouse);

    const { data, error } = await query;
    if (error) {
      toast({ title: 'Failed to load auction alerts', variant: 'error' });
    }
    setAlerts((data as AuctionAlertRow[]) || []);
    setLoading(false);
  }, [options?.result, options?.auctionHouse, toast]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createAlert = useCallback(
    async (data: AuctionAlertInsert) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return null;

      const { data: created, error } = await supabase
        .from('auction_alerts')
        .insert({ ...data, user_id: session.user.id } as never)
        .select()
        .single();

      if (error) {
        toast({ title: 'Failed to create alert', variant: 'error' });
        return null;
      }
      toast({ title: 'Auction alert created', variant: 'success' });
      fetch();
      return created as AuctionAlertRow;
    },
    [toast, fetch],
  );

  const updateAlert = useCallback(
    async (id: string, data: AuctionAlertUpdate) => {
      const { error } = await supabase
        .from('auction_alerts')
        .update(data as never)
        .eq('id', id);

      if (error) {
        toast({ title: 'Failed to update alert', variant: 'error' });
        return false;
      }
      toast({ title: 'Alert updated', variant: 'success' });
      fetch();
      return true;
    },
    [toast, fetch],
  );

  const deleteAlert = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('auction_alerts').delete().eq('id', id);
      if (error) {
        toast({ title: 'Failed to delete alert', variant: 'error' });
        return false;
      }
      toast({ title: 'Alert deleted', variant: 'success' });
      fetch();
      return true;
    },
    [toast, fetch],
  );

  const matchToDatabase = useCallback(
    async (alertId: string) => {
      const alert = alerts.find((a) => a.id === alertId);
      if (!alert) return false;

      // Search artworks by title similarity
      const { data: artworks } = await supabase
        .from('artworks')
        .select('id, title, gallery_id')
        .ilike('title', `%${sanitizeFilterTerm(alert.artwork_title)}%`)
        .limit(5);

      if (!artworks || artworks.length === 0) {
        toast({ title: 'No matching artworks found', variant: 'info' });
        return false;
      }

      // Auto-match first result
      const match = artworks[0];
      let galleryId = match.gallery_id;

      // If no gallery on artwork, check if it was ever sold through a gallery
      if (!galleryId) {
        const { data: sales } = await supabase
          .from('sales')
          .select('gallery_id')
          .eq('artwork_id', match.id)
          .not('gallery_id', 'is', null)
          .limit(1);
        if (sales && sales.length > 0) galleryId = sales[0].gallery_id;
      }

      await supabase
        .from('auction_alerts')
        .update({
          matched_artwork_id: match.id,
          matched_gallery_id: galleryId,
        } as never)
        .eq('id', alertId);

      toast({ title: `Matched to: ${match.title}`, variant: 'success' });
      fetch();
      return true;
    },
    [alerts, toast, fetch],
  );

  return { alerts, loading, refetch: fetch, createAlert, updateAlert, deleteAlert, matchToDatabase };
}
