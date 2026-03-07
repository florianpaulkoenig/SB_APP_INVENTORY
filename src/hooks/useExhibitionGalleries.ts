import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ExhibitionGalleryRow, ExhibitionGalleryInsert } from '../types/database';

interface ExhibitionGalleryWithName extends ExhibitionGalleryRow {
  gallery_name?: string;
}

export function useExhibitionGalleries(exhibitionId?: string) {
  const [galleries, setGalleries] = useState<ExhibitionGalleryWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetch = useCallback(async () => {
    if (!exhibitionId) {
      setGalleries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('exhibition_galleries')
      .select('*, galleries(name)')
      .eq('exhibition_id', exhibitionId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({ title: 'Failed to load exhibition galleries', variant: 'error' });
    }
    const mapped = (data || []).map((row: Record<string, unknown>) => ({
      ...row,
      gallery_name: (row.galleries as { name?: string } | null)?.name || '',
    })) as ExhibitionGalleryWithName[];
    setGalleries(mapped);
    setLoading(false);
  }, [exhibitionId, toast]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const linkGallery = useCallback(
    async (data: Omit<ExhibitionGalleryInsert, 'exhibition_id'>) => {
      if (!exhibitionId) return null;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return null;

      const { data: created, error } = await supabase
        .from('exhibition_galleries')
        .insert({ ...data, exhibition_id: exhibitionId, user_id: session.user.id } as never)
        .select()
        .single();

      if (error) {
        toast({ title: 'Failed to link gallery', variant: 'error' });
        return null;
      }
      toast({ title: 'Gallery linked', variant: 'success' });
      fetch();
      return created as ExhibitionGalleryRow;
    },
    [exhibitionId, toast, fetch],
  );

  const unlinkGallery = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('exhibition_galleries').delete().eq('id', id);
      if (error) {
        toast({ title: 'Failed to unlink gallery', variant: 'error' });
        return false;
      }
      toast({ title: 'Gallery removed', variant: 'success' });
      fetch();
      return true;
    },
    [toast, fetch],
  );

  return { galleries, loading, refetch: fetch, linkGallery, unlinkGallery };
}
