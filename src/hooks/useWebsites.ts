import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { monthStart } from '../lib/socialMedia';
import type {
  WebsiteRow,
  WebsiteInsert,
  WebsiteUpdate,
  WebsiteMetricRow,
  WebsiteMetricInsert,
} from '../types/database';

const SITE_COLS = 'id, user_id, portfolio, domain, url, is_active, sort_order, created_at, updated_at';
const METRIC_COLS = 'id, website_id, month, unique_visitors, visits, pageviews, bounce_rate, avg_visit_duration, form_submissions, newsletter_signups, source_direct, source_search, source_social, source_referral, source_email, source_other, social_by_platform, notes, created_at, updated_at';

const errorToast = { title: 'Fehler', description: 'Speichern fehlgeschlagen. Bitte erneut versuchen.', variant: 'error' as const };

/** One website's figures for a month, as entered in the grid (null = empty cell) */
export type WebMonthEntry = Omit<WebsiteMetricInsert, 'month' | 'id' | 'created_at' | 'updated_at'>;

// PostgREST returns NUMERIC as a string on some setups — normalise once here
function normalise(r: WebsiteMetricRow): WebsiteMetricRow {
  return {
    ...r,
    bounce_rate: r.bounce_rate == null ? null : Number(r.bounce_rate),
    social_by_platform: r.social_by_platform ?? {},
  };
}

export function useWebsites(portfolio: string) {
  const [sites, setSites] = useState<WebsiteRow[]>([]);
  const [metrics, setMetrics] = useState<WebsiteMetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const fetchSeq = useRef(0);

  const fetchAll = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    const { data: siteData, error: siteErr } = await supabase
      .from('websites')
      .select(SITE_COLS)
      .eq('portfolio', portfolio)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (seq !== fetchSeq.current) return;
    if (siteErr) {
      toast({ title: 'Fehler', description: 'Webseiten konnten nicht geladen werden.', variant: 'error' });
      setLoading(false);
      return;
    }
    const list = (siteData ?? []) as WebsiteRow[];
    let rows: WebsiteMetricRow[] = [];
    if (list.length > 0) {
      const { data, error } = await supabase
        .from('website_metrics')
        .select(METRIC_COLS)
        .in('website_id', list.map((s) => s.id))
        .order('month', { ascending: true });
      if (seq !== fetchSeq.current) return;
      if (error) toast({ title: 'Fehler', description: 'Webseiten-Kennzahlen konnten nicht geladen werden.', variant: 'error' });
      else rows = ((data ?? []) as WebsiteMetricRow[]).map(normalise);
    }
    setSites(list);
    setMetrics(rows);
    setLoading(false);
  }, [portfolio, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createSite = useCallback(async (insert: Omit<WebsiteInsert, 'portfolio'>): Promise<boolean> => {
    const { data, error } = await supabase
      .from('websites')
      .insert({ ...insert, portfolio, sort_order: insert.sort_order ?? sites.length } as never)
      .select(SITE_COLS)
      .single();
    if (error) {
      toast(error.code === '23505'
        ? { title: 'Webseite existiert bereits', variant: 'error' }
        : errorToast);
      return false;
    }
    setSites((prev) => [...prev, data as WebsiteRow]);
    toast({ title: 'Webseite hinzugefügt', variant: 'success' });
    return true;
  }, [portfolio, sites.length, toast]);

  const updateSite = useCallback(async (id: string, update: WebsiteUpdate): Promise<boolean> => {
    const { error } = await supabase
      .from('websites')
      .update({ ...update, updated_at: new Date().toISOString() } as never)
      .eq('id', id);
    if (error) {
      toast(error.code === '23505' ? { title: 'Webseite existiert bereits', variant: 'error' } : errorToast);
      return false;
    }
    setSites((prev) => prev.map((s) => (s.id === id ? { ...s, ...update } : s)));
    return true;
  }, [toast]);

  const deleteSite = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('websites').delete().eq('id', id);
    if (error) { toast(errorToast); return false; }
    setSites((prev) => prev.filter((s) => s.id !== id));
    setMetrics((prev) => prev.filter((m) => m.website_id !== id));
    toast({ title: 'Webseite gelöscht', variant: 'success' });
    return true;
  }, [toast]);

  /**
   * Saves the website grid for one month — same contract as the social grid:
   * rows with any value are upserted as a whole, rows now empty are deleted.
   * Silent on success so a combined save shows a single toast.
   */
  const saveMonth = useCallback(async (monthKey: string, entries: WebMonthEntry[]): Promise<boolean> => {
    const month = monthStart(monthKey);
    const hasValue = (e: WebMonthEntry) => Object.entries(e).some(([k, v]) => {
      if (k === 'website_id') return false;
      if (k === 'social_by_platform') return v != null && Object.keys(v as object).length > 0;
      return v != null && v !== '';
    });

    const upserts = entries.filter(hasValue).map((e) => ({ ...e, social_by_platform: e.social_by_platform ?? {}, month, updated_at: new Date().toISOString() }));
    const emptyIds = new Set(entries.filter((e) => !hasValue(e)).map((e) => e.website_id));
    const toDelete = metrics.filter((m) => m.month === month && emptyIds.has(m.website_id)).map((m) => m.id);

    if (upserts.length > 0) {
      const { error } = await supabase
        .from('website_metrics')
        .upsert(upserts as never, { onConflict: 'website_id,month' });
      if (error) { toast(errorToast); return false; }
    }
    if (toDelete.length > 0) {
      const { error } = await supabase.from('website_metrics').delete().in('id', toDelete);
      if (error) { toast(errorToast); return false; }
    }
    await fetchAll();
    return true;
  }, [metrics, fetchAll, toast]);

  const deleteMetric = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('website_metrics').delete().eq('id', id);
    if (error) { toast(errorToast); return false; }
    setMetrics((prev) => prev.filter((m) => m.id !== id));
    toast({ title: 'Eintrag gelöscht', variant: 'success' });
    return true;
  }, [toast]);

  return { sites, metrics, loading, createSite, updateSite, deleteSite, saveMonth, deleteMetric, refresh: fetchAll };
}
