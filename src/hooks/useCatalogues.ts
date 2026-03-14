// ---------------------------------------------------------------------------
// NOA Inventory -- useCatalogues hook
// CRUD for saved catalogue configurations (not PDFs — the config to regenerate).
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CatalogueConfig {
  // Cover page
  title: string;
  subtitle: string;
  coverText: string;
  showDate: boolean;
  showContactDetails: boolean;
  coverImageArtworkId: string | null; // artwork ID whose image is used as cover background

  // Optional text page (after cover, before artworks)
  textPageContent: string;

  // Layout & language
  layout: 'full-page' | 'list';
  language: 'en' | 'de' | 'fr';

  // Section dividers
  dividerMode: 'none' | 'series' | 'category';

  // Field visibility toggles
  showReferenceCode: boolean;
  showMedium: boolean;
  showYear: boolean;
  showDimensions: boolean;
  showEdition: boolean;
  showPrice: boolean;

  artworkIds: string[];

  // Legacy (backward compat — ignored in new code)
  catalogueType?: string;
  showPrices?: boolean;
}

export interface CatalogueRow {
  id: string;
  user_id: string;
  name: string;
  config: CatalogueConfig;
  created_at: string;
  updated_at: string;
}

export interface CatalogueInsert {
  name: string;
  config: CatalogueConfig;
}

// ---------------------------------------------------------------------------
// Hook: useCatalogues (list + CRUD)
// ---------------------------------------------------------------------------

export function useCatalogues() {
  const [catalogues, setCatalogues] = useState<CatalogueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCatalogues = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('catalogues')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setCatalogues((data ?? []) as CatalogueRow[]);
    } catch {
      toast({ title: 'Error', description: 'Failed to load saved catalogues.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchCatalogues(); }, [fetchCatalogues]);

  const saveCatalogue = useCallback(async (data: CatalogueInsert): Promise<CatalogueRow | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const { data: row, error } = await supabase
        .from('catalogues')
        .insert({
          user_id: session.user.id,
          name: data.name,
          config: data.config,
        } as never)
        .select()
        .single();

      if (error) throw error;
      toast({ title: 'Saved', description: 'Catalogue configuration saved.' });
      await fetchCatalogues();
      return row as CatalogueRow;
    } catch {
      toast({ title: 'Error', description: 'Failed to save catalogue.', variant: 'error' });
      return null;
    }
  }, [toast, fetchCatalogues]);

  const updateCatalogue = useCallback(async (id: string, data: Partial<CatalogueInsert>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('catalogues')
        .update({ ...data, updated_at: new Date().toISOString() } as never)
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Updated', description: 'Catalogue updated.' });
      await fetchCatalogues();
      return true;
    } catch {
      toast({ title: 'Error', description: 'Failed to update catalogue.', variant: 'error' });
      return false;
    }
  }, [toast, fetchCatalogues]);

  const deleteCatalogue = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('catalogues')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Deleted', description: 'Catalogue deleted.' });
      await fetchCatalogues();
      return true;
    } catch {
      toast({ title: 'Error', description: 'Failed to delete catalogue.', variant: 'error' });
      return false;
    }
  }, [toast, fetchCatalogues]);

  const duplicateCatalogue = useCallback(async (id: string): Promise<CatalogueRow | null> => {
    const original = catalogues.find((c) => c.id === id);
    if (!original) return null;

    return saveCatalogue({
      name: `${original.name} (Copy)`,
      config: { ...original.config },
    });
  }, [catalogues, saveCatalogue]);

  return {
    catalogues,
    loading,
    saveCatalogue,
    updateCatalogue,
    deleteCatalogue,
    duplicateCatalogue,
    refetch: fetchCatalogues,
  };
}
