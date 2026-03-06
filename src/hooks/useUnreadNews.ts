import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useUnreadNews() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      // Fetch all published news IDs
      const { data: publishedPosts } = await supabase
        .from('news_posts')
        .select('id')
        .eq('published', true);

      if (!publishedPosts || publishedPosts.length === 0) {
        setUnreadCount(0);
        return;
      }

      // Fetch read news IDs for current user
      const { data: readEntries } = await supabase
        .from('news_read_status')
        .select('news_id')
        .eq('user_id', user.id);

      const readIds = new Set((readEntries || []).map((r: { news_id: string }) => r.news_id));
      const unread = publishedPosts.filter((p: { id: string }) => !readIds.has(p.id));

      setUnreadCount(unread.length);
    } catch {
      setUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const markAsRead = useCallback(async (newsId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('news_read_status')
        .insert({
          news_id: newsId,
          user_id: user.id,
        } as never);

      // Update local count
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail — may already be marked as read (unique constraint)
    }
  }, [user]);

  const refetch = useCallback(async () => {
    await fetchUnreadCount();
  }, [fetchUnreadCount]);

  return {
    unreadCount,
    markAsRead,
    refetch,
  };
}
