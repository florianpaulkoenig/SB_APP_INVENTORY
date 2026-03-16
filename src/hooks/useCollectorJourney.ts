import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JourneyEvent {
  id: string;
  type: 'enquiry' | 'interaction' | 'viewing_room' | 'deal' | 'sale' | 'wishlist';
  date: string;
  title: string;
  description: string | null;
  value: number | null;
  currency: string | null;
  metadata: Record<string, unknown>;
}

export interface CollectorJourneyData {
  events: JourneyEvent[];
  totalTouchpoints: number;
  firstContact: string | null;
  lastContact: string | null;
  totalSpent: number;
  journeyDurationDays: number;
  avgDaysBetweenTouchpoints: number | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCollectorJourney(contactId: string): {
  data: CollectorJourneyData | null;
  loading: boolean;
} {
  const [data, setData] = useState<CollectorJourneyData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJourney = useCallback(async () => {
    if (!contactId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch all touchpoints in parallel
      const [
        enquiriesRes,
        interactionsRes,
        dealsRes,
        salesRes,
        wishlistRes,
        viewingRoomsRes,
      ] = await Promise.all([
        // 1. Enquiries where converted_contact_id matches
        supabase
          .from('enquiries')
          .select('id, created_at, subject, interest_description, estimated_value, currency')
          .eq('converted_contact_id', contactId),

        // 2. Interactions
        supabase
          .from('interactions')
          .select('id, interaction_date, type, subject, body')
          .eq('contact_id', contactId),

        // 3. Deals
        supabase
          .from('deals')
          .select('id, created_at, stage, stage_changed_at, value, currency, notes')
          .eq('contact_id', contactId),

        // 4. Sales with artwork title
        supabase
          .from('sales')
          .select('id, sale_date, sale_price, currency, notes, artwork_id, artworks(title)')
          .eq('contact_id', contactId),

        // 5. Wish list items with artwork title
        supabase
          .from('wish_list_items')
          .select('id, added_date, notes, artwork_id, artworks(title)')
          .eq('contact_id', contactId),

        // 6. Viewing rooms linked to this contact
        supabase
          .from('viewing_rooms')
          .select('id, created_at, title, description')
          .eq('contact_id', contactId),
      ]);

      const events: JourneyEvent[] = [];

      // Map enquiries
      if (enquiriesRes.data) {
        for (const e of enquiriesRes.data) {
          events.push({
            id: `enquiry-${e.id}`,
            type: 'enquiry',
            date: e.created_at,
            title: `Enquiry: ${e.subject || 'Untitled'}`,
            description: (e as Record<string, unknown>).interest_description as string | null,
            value: (e as Record<string, unknown>).estimated_value as number | null,
            currency: e.currency as string | null,
            metadata: { enquiryId: e.id },
          });
        }
      }

      // Map interactions
      if (interactionsRes.data) {
        for (const i of interactionsRes.data) {
          events.push({
            id: `interaction-${i.id}`,
            type: 'interaction',
            date: i.interaction_date,
            title: `${i.type}: ${i.subject || 'No subject'}`,
            description: i.body as string | null,
            value: null,
            currency: null,
            metadata: { interactionId: i.id, interactionType: i.type },
          });
        }
      }

      // Map deals
      if (dealsRes.data) {
        for (const d of dealsRes.data) {
          events.push({
            id: `deal-${d.id}`,
            type: 'deal',
            date: (d.stage_changed_at as string) || d.created_at,
            title: `Deal: ${d.stage}`,
            description: d.notes as string | null,
            value: d.value as number | null,
            currency: d.currency as string | null,
            metadata: { dealId: d.id, stage: d.stage },
          });
        }
      }

      // Map sales
      if (salesRes.data) {
        for (const s of salesRes.data) {
          const artworkTitle =
            (s as Record<string, unknown>).artworks &&
            typeof (s as Record<string, unknown>).artworks === 'object' &&
            ((s as Record<string, unknown>).artworks as Record<string, unknown>)?.title
              ? String(((s as Record<string, unknown>).artworks as Record<string, unknown>).title)
              : 'Unknown artwork';

          events.push({
            id: `sale-${s.id}`,
            type: 'sale',
            date: s.sale_date,
            title: `Purchase: ${artworkTitle}`,
            description: s.notes as string | null,
            value: s.sale_price,
            currency: s.currency as string | null,
            metadata: { saleId: s.id, artworkId: s.artwork_id },
          });
        }
      }

      // Map wish list items
      if (wishlistRes.data) {
        for (const w of wishlistRes.data) {
          const artworkTitle =
            (w as Record<string, unknown>).artworks &&
            typeof (w as Record<string, unknown>).artworks === 'object' &&
            ((w as Record<string, unknown>).artworks as Record<string, unknown>)?.title
              ? String(((w as Record<string, unknown>).artworks as Record<string, unknown>).title)
              : 'Unknown artwork';

          events.push({
            id: `wishlist-${w.id}`,
            type: 'wishlist',
            date: w.added_date,
            title: `Added to wish list: ${artworkTitle}`,
            description: w.notes as string | null,
            value: null,
            currency: null,
            metadata: { wishlistId: w.id, artworkId: w.artwork_id },
          });
        }
      }

      // Map viewing rooms
      if (viewingRoomsRes.data) {
        for (const vr of viewingRoomsRes.data) {
          events.push({
            id: `viewing_room-${vr.id}`,
            type: 'viewing_room',
            date: vr.created_at,
            title: `Viewing Room: ${vr.title}`,
            description: vr.description as string | null,
            value: null,
            currency: null,
            metadata: { viewingRoomId: vr.id },
          });
        }
      }

      // Sort by date descending (newest first)
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate journey stats
      const totalTouchpoints = events.length;
      const firstContact = totalTouchpoints > 0 ? events[events.length - 1].date : null;
      const lastContact = totalTouchpoints > 0 ? events[0].date : null;

      const totalSpent = events
        .filter((e) => e.type === 'sale' && e.value != null)
        .reduce((sum, e) => sum + (e.value ?? 0), 0);

      let journeyDurationDays = 0;
      if (firstContact && lastContact) {
        const diffMs = new Date(lastContact).getTime() - new Date(firstContact).getTime();
        journeyDurationDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      }

      let avgDaysBetweenTouchpoints: number | null = null;
      if (totalTouchpoints > 1) {
        avgDaysBetweenTouchpoints = Math.round(journeyDurationDays / (totalTouchpoints - 1));
      }

      setData({
        events,
        totalTouchpoints,
        firstContact,
        lastContact,
        totalSpent,
        journeyDurationDays,
        avgDaysBetweenTouchpoints,
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchJourney();
  }, [fetchJourney]);

  return { data, loading };
}
