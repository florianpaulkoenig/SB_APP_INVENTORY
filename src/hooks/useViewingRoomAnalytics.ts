// ---------------------------------------------------------------------------
// useViewingRoomAnalytics -- Viewing Room Analytics Deep Dive
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ViewingRoomPerformance {
  roomId: string;
  roomTitle: string;
  totalViews: number;
  uniqueDays: number;
  artworkCount: number;
  published: boolean;
  createdAt: string;
  viewsPerDay: number;
  convertedToEnquiry: number;
  convertedToSale: number;
  conversionRate: number;
}

export interface ViewingRoomAnalyticsData {
  rooms: ViewingRoomPerformance[];
  totalViews: number;
  totalRooms: number;
  publishedRooms: number;
  avgViewsPerRoom: number;
  topPerformingRoom: string | null;
  viewsTrend: { date: string; views: number }[];
  overallConversionRate: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check whether two string[] share at least one element */
function hasOverlap(a: string[], b: string[]): boolean {
  const setB = new Set(b);
  return a.some((id) => setB.has(id));
}

/** Format date as YYYY-MM-DD */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useViewingRoomAnalytics() {
  const [data, setData] = useState<ViewingRoomAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      // 1. Fetch all required data in parallel
      const [roomsRes, viewsRes, enquiriesRes, salesRes] = await Promise.all([
        supabase
          .from('viewing_rooms')
          .select('id, title, artwork_ids, published, created_at')
          .eq('user_id', session.user.id),
        supabase
          .from('viewing_room_views')
          .select('id, viewing_room_id, viewed_at'),
        supabase
          .from('enquiries')
          .select('id, interested_artwork_ids, created_at'),
        supabase
          .from('sales')
          .select('id, artwork_id, sale_date'),
      ]);

      if (roomsRes.error) throw roomsRes.error;
      if (viewsRes.error) throw viewsRes.error;
      if (enquiriesRes.error) throw enquiriesRes.error;
      if (salesRes.error) throw salesRes.error;

      const rooms = roomsRes.data ?? [];
      const views = viewsRes.data ?? [];
      const enquiries = enquiriesRes.data ?? [];
      const sales = salesRes.data ?? [];

      // 2. Index views by room
      const viewsByRoom = new Map<string, { viewed_at: string }[]>();
      for (const v of views) {
        const list = viewsByRoom.get(v.viewing_room_id) ?? [];
        list.push({ viewed_at: v.viewed_at });
        viewsByRoom.set(v.viewing_room_id, list);
      }

      // 3. Build per-room performance
      const now = new Date();
      const roomPerfs: ViewingRoomPerformance[] = rooms.map((room) => {
        const roomViews = viewsByRoom.get(room.id) ?? [];
        const totalViews = roomViews.length;
        const artworkIds: string[] = room.artwork_ids ?? [];
        const artworkCount = artworkIds.length;

        // Unique days with views
        const daySet = new Set(roomViews.map((v) => v.viewed_at.slice(0, 10)));
        const uniqueDays = daySet.size;

        // Views per day (since creation)
        const createdDate = new Date(room.created_at);
        const daysSinceCreation = Math.max(1, Math.ceil((now.getTime() - createdDate.getTime()) / 86400000));
        const viewsPerDay = Math.round((totalViews / daysSinceCreation) * 100) / 100;

        // Correlate enquiries: enquiry created_at within 7 days of a view AND
        // interested_artwork_ids overlaps with room artwork_ids
        let convertedToEnquiry = 0;
        if (artworkIds.length > 0 && roomViews.length > 0) {
          for (const enq of enquiries) {
            const enqArtworkIds: string[] = enq.interested_artwork_ids ?? [];
            if (enqArtworkIds.length === 0) continue;
            if (!hasOverlap(artworkIds, enqArtworkIds)) continue;

            const enqDate = new Date(enq.created_at);
            const withinWindow = roomViews.some((v) => {
              const viewDate = new Date(v.viewed_at);
              const diffMs = enqDate.getTime() - viewDate.getTime();
              return diffMs >= 0 && diffMs <= 7 * 86400000;
            });
            if (withinWindow) convertedToEnquiry++;
          }
        }

        // Correlate sales: artwork_id is in room artwork_ids AND
        // sale_date within 30 days of a view
        let convertedToSale = 0;
        if (artworkIds.length > 0 && roomViews.length > 0) {
          const artworkIdSet = new Set(artworkIds);
          for (const sale of sales) {
            if (!artworkIdSet.has(sale.artwork_id)) continue;

            const saleDate = new Date(sale.sale_date);
            const withinWindow = roomViews.some((v) => {
              const viewDate = new Date(v.viewed_at);
              const diffMs = saleDate.getTime() - viewDate.getTime();
              return diffMs >= 0 && diffMs <= 30 * 86400000;
            });
            if (withinWindow) convertedToSale++;
          }
        }

        const totalConversions = convertedToEnquiry + convertedToSale;
        const conversionRate = totalViews > 0
          ? Math.round((totalConversions / totalViews) * 10000) / 100
          : 0;

        return {
          roomId: room.id,
          roomTitle: room.title,
          totalViews,
          uniqueDays,
          artworkCount,
          published: room.published ?? false,
          createdAt: room.created_at,
          viewsPerDay,
          convertedToEnquiry,
          convertedToSale,
          conversionRate,
        };
      });

      // Sort by totalViews descending
      roomPerfs.sort((a, b) => b.totalViews - a.totalViews);

      // 4. Aggregate stats
      const totalViews = roomPerfs.reduce((sum, r) => sum + r.totalViews, 0);
      const totalRooms = rooms.length;
      const publishedRooms = rooms.filter((r) => r.published).length;
      const avgViewsPerRoom = totalRooms > 0
        ? Math.round((totalViews / totalRooms) * 10) / 10
        : 0;
      const topPerformingRoom = roomPerfs.length > 0 ? roomPerfs[0].roomTitle : null;

      // Overall conversion rate
      const totalConversions = roomPerfs.reduce(
        (sum, r) => sum + r.convertedToEnquiry + r.convertedToSale,
        0,
      );
      const overallConversionRate = totalViews > 0
        ? Math.round((totalConversions / totalViews) * 10000) / 100
        : 0;

      // 5. Views trend: daily counts over last 90 days
      const trendMap = new Map<string, number>();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Pre-fill all dates with 0
      for (let d = new Date(ninetyDaysAgo); d <= now; d.setDate(d.getDate() + 1)) {
        trendMap.set(toDateStr(d), 0);
      }

      for (const v of views) {
        const dateStr = v.viewed_at.slice(0, 10);
        if (trendMap.has(dateStr)) {
          trendMap.set(dateStr, (trendMap.get(dateStr) ?? 0) + 1);
        }
      }

      const viewsTrend = [...trendMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, viewCount]) => ({ date, views: viewCount }));

      setData({
        rooms: roomPerfs,
        totalViews,
        totalRooms,
        publishedRooms,
        avgViewsPerRoom,
        topPerformingRoom,
        viewsTrend,
        overallConversionRate,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch viewing room analytics';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refresh: fetch };
}
