// ---------------------------------------------------------------------------
// useExhibitionFloorPlans — CRUD for floor plan files attached to exhibitions.
// Accepts PDFs and images. Stored in the media-files bucket.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { sanitizeStoragePath } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { ExhibitionFloorPlanRow } from '../types/database';

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export function useExhibitionFloorPlans(exhibitionId: string | undefined) {
  const [floorPlans, setFloorPlans] = useState<ExhibitionFloorPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // ---- Fetch ----------------------------------------------------------------

  const fetchFloorPlans = useCallback(async () => {
    if (!exhibitionId) { setFloorPlans([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exhibition_floor_plans')
        .select('*')
        .eq('exhibition_id', exhibitionId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setFloorPlans((data ?? []) as ExhibitionFloorPlanRow[]);
    } catch {
      toast({ title: 'Error', description: 'Failed to load floor plans.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [exhibitionId, toast]);

  useEffect(() => { fetchFloorPlans(); }, [fetchFloorPlans]);

  // ---- Upload ---------------------------------------------------------------

  const uploadFloorPlan = useCallback(async (file: File): Promise<ExhibitionFloorPlanRow | null> => {
    if (!exhibitionId) return null;

    if (file.size > MAX_SIZE) {
      toast({ title: 'File too large', description: 'Maximum size is 50 MB.', variant: 'error' });
      return null;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Only PDF, JPEG, PNG or WebP allowed.', variant: 'error' });
      return null;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { toast({ title: 'Error', description: 'Not logged in.', variant: 'error' }); return null; }

      const safeName = sanitizeStoragePath(file.name);
      const storagePath = `exhibition-floor-plans/${exhibitionId}/${Date.now()}_${Math.random().toString(36).substring(2)}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('media-files')
        .upload(storagePath, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      // Next sort_order
      const { data: maxRow } = await supabase
        .from('exhibition_floor_plans')
        .select('sort_order')
        .eq('exhibition_id', exhibitionId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextSortOrder = maxRow ? maxRow.sort_order + 1 : 0;

      const { data: created, error: insertError } = await supabase
        .from('exhibition_floor_plans')
        .insert({
          user_id: session.user.id,
          exhibition_id: exhibitionId,
          storage_path: storagePath,
          file_name: file.name,
          sort_order: nextSortOrder,
        } as never)
        .select()
        .single();

      if (insertError) throw insertError;

      toast({ title: 'Floor plan uploaded', variant: 'success' });
      await fetchFloorPlans();
      return created as ExhibitionFloorPlanRow;
    } catch {
      toast({ title: 'Error', description: 'Failed to upload floor plan.', variant: 'error' });
      return null;
    }
  }, [exhibitionId, fetchFloorPlans, toast]);

  // ---- Update description --------------------------------------------------

  const updateDescription = useCallback(async (id: string, description: string): Promise<boolean> => {
    try {
      const trimmed = description.trim() || null;
      const { data, error } = await supabase
        .from('exhibition_floor_plans')
        .update({ description: trimmed } as never)
        .eq('id', id)
        .select('id, description')
        .single();
      if (error) throw error;
      // Sync local state with what DB actually stored
      const saved = (data as { id: string; description: string | null } | null)?.description ?? trimmed;
      setFloorPlans((prev) =>
        prev.map((fp) => fp.id === id ? { ...fp, description: saved } : fp),
      );
      return true;
    } catch (err) {
      console.error('[useExhibitionFloorPlans] updateDescription error:', err);
      toast({ title: 'Error', description: 'Failed to save description.', variant: 'error' });
      return false;
    }
  }, [toast]);

  // ---- Delete ---------------------------------------------------------------

  const deleteFloorPlan = useCallback(async (id: string, storagePath: string): Promise<boolean> => {
    try {
      await supabase.storage.from('media-files').remove([storagePath]);
      const { error } = await supabase
        .from('exhibition_floor_plans')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Floor plan deleted', variant: 'success' });
      await fetchFloorPlans();
      return true;
    } catch {
      toast({ title: 'Error', description: 'Failed to delete floor plan.', variant: 'error' });
      return false;
    }
  }, [fetchFloorPlans, toast]);

  return { floorPlans, loading, uploadFloorPlan, deleteFloorPlan, updateDescription, refetch: fetchFloorPlans };
}
