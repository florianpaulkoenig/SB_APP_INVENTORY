import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ArtworkRow } from '../types/database';

interface PricePreview {
  id: string;
  title: string;
  currentPrice: number;
  currency: string;
  newPrice: number;
  change: number;
  galleryId: string | null;
}

export function useBulkPriceUpdate() {
  const { toast } = useToast();

  /**
   * Build a preview of price changes without applying them.
   */
  const previewPriceChange = useCallback(
    async (
      filters: { category?: string; series?: string; statuses?: string[] },
      changeType: 'percentage' | 'fixed',
      changeValue: number,
    ): Promise<PricePreview[]> => {
      let query = supabase
        .from('artworks')
        .select('id, title, price, currency, gallery_id, status')
        .not('price', 'is', null);

      // Only unsold statuses
      const statuses = filters.statuses?.length
        ? filters.statuses
        : ['available', 'on_consignment', 'reserved'];
      query = query.in('status', statuses);

      if (filters.category) query = query.eq('category', filters.category);
      if (filters.series) query = query.eq('series', filters.series);

      const { data, error } = await query;
      if (error || !data) return [];

      return (data as ArtworkRow[])
        .filter((a) => a.price != null && a.price > 0)
        .map((a) => {
          const currentPrice = a.price!;
          let newPrice: number;
          if (changeType === 'percentage') {
            newPrice = Math.round(currentPrice * (1 + changeValue / 100));
          } else {
            newPrice = changeValue;
          }
          return {
            id: a.id,
            title: a.title,
            currentPrice,
            currency: a.currency,
            newPrice: Math.max(0, newPrice),
            change: newPrice - currentPrice,
            galleryId: a.gallery_id,
          };
        });
    },
    [],
  );

  /**
   * Apply price changes: update artworks + insert price_history + optionally update deal values.
   */
  const applyPriceChange = useCallback(
    async (previews: PricePreview[], note: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return false;

      const today = new Date().toISOString().slice(0, 10);
      let successCount = 0;

      for (const p of previews) {
        // Update artwork price
        const { error: artErr } = await supabase
          .from('artworks')
          .update({ price: p.newPrice } as never)
          .eq('id', p.id);

        if (artErr) continue;

        // Insert price history entry
        await supabase.from('price_history').insert({
          user_id: session.user.id,
          artwork_id: p.id,
          price: p.newPrice,
          currency: p.currency,
          effective_date: today,
          notes: note,
        } as never);

        successCount++;
      }

      // Update open deals (quoted/negotiating) that reference affected artworks
      const artworkIds = previews.map((p) => p.id);
      const { data: openDeals } = await supabase
        .from('deals')
        .select('id, artwork_id')
        .in('artwork_id', artworkIds)
        .in('stage', ['quoted', 'negotiating']);

      if (openDeals) {
        for (const deal of openDeals) {
          const preview = previews.find((p) => p.id === deal.artwork_id);
          if (preview) {
            await supabase
              .from('deals')
              .update({ value: preview.newPrice } as never)
              .eq('id', deal.id);
          }
        }
      }

      toast({
        title: `Updated ${successCount} of ${previews.length} artworks`,
        variant: successCount === previews.length ? 'success' : 'info',
      });
      return successCount > 0;
    },
    [toast],
  );

  /**
   * Notify galleries holding affected artworks about price changes.
   */
  const notifyGalleries = useCallback(
    async (previews: PricePreview[]) => {
      const galleryIds = [...new Set(previews.filter((p) => p.galleryId).map((p) => p.galleryId!))];
      if (galleryIds.length === 0) return;

      const { data: galleries } = await supabase
        .from('galleries')
        .select('id, name, email')
        .in('id', galleryIds);

      if (!galleries) return;

      for (const gallery of galleries) {
        if (!gallery.email) continue;
        const affected = previews.filter((p) => p.galleryId === gallery.id);
        const artworkList = affected
          .map((p) => `• ${p.title}: ${p.currency} ${p.currentPrice.toLocaleString()} → ${p.currency} ${p.newPrice.toLocaleString()}`)
          .join('\n');

        await supabase.functions.invoke('send-email', {
          body: {
            to: gallery.email,
            subject: `Price Update — ${affected.length} artwork${affected.length > 1 ? 's' : ''} affected`,
            body: `Dear ${gallery.name},\n\nPlease note the following price updates for artworks consigned to your gallery:\n\n${artworkList}\n\nPlease update your records accordingly.\n\nBest regards,\nNOA Contemporary`,
          },
        });
      }

      toast({ title: `Notified ${galleries.filter((g) => g.email).length} galleries`, variant: 'success' });
    },
    [toast],
  );

  return { previewPriceChange, applyPriceChange, notifyGalleries };
}
