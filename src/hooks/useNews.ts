import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from '../components/ui/Toast';

export interface NewsPost {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  external_link: string | null;
  published: boolean;
  published_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface UseNewsOptions {
  publishedOnly?: boolean;
}

export function useNews(options?: UseNewsOptions) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  const publishedOnly = options?.publishedOnly ?? false;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('news_posts')
        .select('id, title, body, image_url, external_link, published, published_at, created_by, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (publishedOnly) {
        query = query.eq('published', true);
      }

      const { data, error } = await query;

      if (error) {
        toast({ title: 'Error', description: 'Failed to load news posts.', variant: 'error' });
        return;
      }

      setPosts((data as NewsPost[]) || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load news posts.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [publishedOnly, toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const createPost = useCallback(async (data: {
    title: string;
    body: string;
    image_url?: string;
    external_link?: string;
  }): Promise<NewsPost | null> => {
    if (!user) return null;

    try {
      const { data: created, error } = await supabase
        .from('news_posts')
        .insert({
          title: data.title,
          body: data.body,
          image_url: data.image_url || null,
          external_link: data.external_link || null,
          published: false,
          created_by: user.id,
        } as never)
        .select()
        .single();

      if (error) {
        toast({ title: 'Error', description: 'Failed to create post.', variant: 'error' });
        return null;
      }

      toast({ title: 'Success', description: 'Post saved as draft.', variant: 'success' });
      await fetchPosts();
      return created as NewsPost;
    } catch {
      toast({ title: 'Error', description: 'Failed to create post.', variant: 'error' });
      return null;
    }
  }, [user, toast, fetchPosts]);

  const updatePost = useCallback(async (id: string, data: Partial<NewsPost>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('news_posts')
        .update(data as never)
        .eq('id', id);

      if (error) {
        toast({ title: 'Error', description: 'Failed to update post.', variant: 'error' });
        return false;
      }

      toast({ title: 'Success', description: 'Post updated.', variant: 'success' });
      await fetchPosts();
      return true;
    } catch {
      toast({ title: 'Error', description: 'Failed to update post.', variant: 'error' });
      return false;
    }
  }, [toast, fetchPosts]);

  const deletePost = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('news_posts')
        .delete()
        .eq('id', id);

      if (error) {
        toast({ title: 'Error', description: 'Failed to delete post.', variant: 'error' });
        return false;
      }

      toast({ title: 'Success', description: 'Post deleted.', variant: 'success' });
      await fetchPosts();
      return true;
    } catch {
      toast({ title: 'Error', description: 'Failed to delete post.', variant: 'error' });
      return false;
    }
  }, [toast, fetchPosts]);

  const publishPost = useCallback(async (id: string): Promise<boolean> => {
    try {
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('news_posts')
        .update({ published: true, published_at: now } as never)
        .eq('id', id);

      if (updateError) {
        toast({ title: 'Error', description: 'Failed to publish post.', variant: 'error' });
        return false;
      }

      // Fetch the post for notification
      const post = posts.find((p) => p.id === id);
      const postTitle = post?.title || 'New Update';
      const postBody = post?.body || '';

      // Fetch gallery users for email notifications
      const { data: galleryUsers } = await supabase
        .from('user_profiles')
        .select('user_id, auth.users!inner(email)')
        .eq('role', 'gallery');

      if (galleryUsers && galleryUsers.length > 0) {
        const emailPromises = galleryUsers.map((gu: Record<string, unknown>) => {
          const usersData = gu.users as { email: string } | null;
          const email = usersData?.email;
          if (!email) return Promise.resolve();

          return supabase.functions.invoke('send-email', {
            body: {
              to: email,
              subject: `NOA News: ${postTitle}`,
              html: `<p>${postBody}</p>`,
            },
          });
        });

        await Promise.allSettled(emailPromises);
      }

      toast({ title: 'Published', description: 'Published and notifications sent.', variant: 'success' });
      await fetchPosts();
      return true;
    } catch {
      toast({ title: 'Error', description: 'Failed to publish post.', variant: 'error' });
      return false;
    }
  }, [toast, fetchPosts, posts]);

  const refetch = useCallback(async () => {
    await fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    createPost,
    updatePost,
    deletePost,
    publishPost,
    refetch,
  };
}
