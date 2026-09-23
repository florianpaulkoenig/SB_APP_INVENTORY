import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { PLATFORMS, monthStart } from '../lib/socialMedia';
import type {
  SocialMediaAccountRow,
  SocialMediaAccountInsert,
  SocialMediaAccountUpdate,
  SocialMediaMetricRow,
  SocialMediaMetricInsert,
} from '../types/database';

const ACCOUNT_COLS = 'id, user_id, portfolio, platform, handle, url, is_active, sort_order, created_at, updated_at';
const METRIC_COLS = 'id, account_id, month, followers, posts, views, reach, impressions, likes, comments, shares, saves, profile_visits, link_clicks, notes, created_at, updated_at';

const errorToast = { title: 'Fehler', description: 'Speichern fehlgeschlagen. Bitte erneut versuchen.', variant: 'error' as const };

/** One account's figures for a month, as entered in the grid (null = empty cell) */
export type MonthEntry = Omit<SocialMediaMetricInsert, 'month' | 'id' | 'created_at' | 'updated_at'>;

export function useSocialMedia(portfolio: string) {
  const [accounts, setAccounts] = useState<SocialMediaAccountRow[]>([]);
  const [metrics, setMetrics] = useState<SocialMediaMetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  // Ignore responses of a fetch that was superseded (portfolio switch)
  const fetchSeq = useRef(0);

  const fetchAll = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    const { data: accData, error: accErr } = await supabase
      .from('social_media_accounts')
      .select(ACCOUNT_COLS)
      .eq('portfolio', portfolio)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (seq !== fetchSeq.current) return;
    if (accErr) {
      toast({ title: 'Fehler', description: 'Social-Media-Konten konnten nicht geladen werden.', variant: 'error' });
      setLoading(false);
      return;
    }
    const accs = (accData ?? []) as SocialMediaAccountRow[];
    let rows: SocialMediaMetricRow[] = [];
    if (accs.length > 0) {
      const { data, error } = await supabase
        .from('social_media_metrics')
        .select(METRIC_COLS)
        .in('account_id', accs.map((a) => a.id))
        .order('month', { ascending: true });
      if (seq !== fetchSeq.current) return;
      if (error) toast({ title: 'Fehler', description: 'Kennzahlen konnten nicht geladen werden.', variant: 'error' });
      else rows = (data ?? []) as SocialMediaMetricRow[];
    }
    setAccounts(accs);
    setMetrics(rows);
    setLoading(false);
  }, [portfolio, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // -------------------------------------------------------------------------
  // Accounts
  // -------------------------------------------------------------------------

  const createAccount = useCallback(async (insert: Omit<SocialMediaAccountInsert, 'portfolio'>): Promise<boolean> => {
    const sort_order = insert.sort_order ?? PLATFORMS.findIndex((p) => p.key === insert.platform);
    const { data, error } = await supabase
      .from('social_media_accounts')
      .insert({ ...insert, portfolio, sort_order } as never)
      .select(ACCOUNT_COLS)
      .single();
    if (error) {
      toast(error.code === '23505'
        ? { title: 'Konto existiert bereits', description: 'Dieses Konto ist für diese Plattform schon erfasst.', variant: 'error' }
        : errorToast);
      return false;
    }
    setAccounts((prev) => [...prev, data as SocialMediaAccountRow].sort((a, b) => a.sort_order - b.sort_order));
    toast({ title: 'Konto hinzugefügt', variant: 'success' });
    return true;
  }, [portfolio, toast]);

  /** Adds one account (without handle) for every platform that has none yet */
  const createMissingPlatforms = useCallback(async (): Promise<boolean> => {
    const have = new Set(accounts.map((a) => a.platform));
    const inserts = PLATFORMS
      .map((p, i) => ({ platform: p.key, portfolio, sort_order: i }))
      .filter((p) => !have.has(p.platform));
    if (inserts.length === 0) return true;
    const { data, error } = await supabase
      .from('social_media_accounts')
      .insert(inserts as never)
      .select(ACCOUNT_COLS);
    if (error) { toast(errorToast); return false; }
    setAccounts((prev) => [...prev, ...((data ?? []) as SocialMediaAccountRow[])].sort((a, b) => a.sort_order - b.sort_order));
    toast({ title: `${inserts.length} Plattformen angelegt`, variant: 'success' });
    return true;
  }, [accounts, portfolio, toast]);

  const updateAccount = useCallback(async (id: string, update: SocialMediaAccountUpdate): Promise<boolean> => {
    const { error } = await supabase
      .from('social_media_accounts')
      .update({ ...update, updated_at: new Date().toISOString() } as never)
      .eq('id', id);
    if (error) {
      toast(error.code === '23505'
        ? { title: 'Konto existiert bereits', description: 'Dieser Handle ist für diese Plattform schon erfasst.', variant: 'error' }
        : errorToast);
      return false;
    }
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...update } : a)));
    return true;
  }, [toast]);

  const deleteAccount = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('social_media_accounts').delete().eq('id', id);
    if (error) { toast(errorToast); return false; }
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setMetrics((prev) => prev.filter((m) => m.account_id !== id));
    toast({ title: 'Konto gelöscht', variant: 'success' });
    return true;
  }, [toast]);

  // -------------------------------------------------------------------------
  // Monthly figures
  // -------------------------------------------------------------------------

  /**
   * Saves the grid for one month. Rows with at least one value are upserted
   * (replacing the whole row, so a cleared cell really becomes empty); rows
   * that are now completely empty are deleted.
   */
  const saveMonth = useCallback(async (monthKey: string, entries: MonthEntry[], opts?: { silent?: boolean }): Promise<boolean> => {
    const month = monthStart(monthKey);
    const hasValue = (e: MonthEntry) =>
      Object.entries(e).some(([k, v]) => k !== 'account_id' && v != null && v !== '');

    const upserts = entries.filter(hasValue).map((e) => ({ ...e, month, updated_at: new Date().toISOString() }));
    const emptyIds = new Set(entries.filter((e) => !hasValue(e)).map((e) => e.account_id));
    const toDelete = metrics.filter((m) => m.month === month && emptyIds.has(m.account_id)).map((m) => m.id);

    if (upserts.length > 0) {
      const { error } = await supabase
        .from('social_media_metrics')
        .upsert(upserts as never, { onConflict: 'account_id,month' });
      if (error) { toast(errorToast); return false; }
    }
    if (toDelete.length > 0) {
      const { error } = await supabase.from('social_media_metrics').delete().in('id', toDelete);
      if (error) { toast(errorToast); return false; }
    }
    if (!opts?.silent) toast({ title: 'Monat gespeichert', variant: 'success' });
    await fetchAll();
    return true;
  }, [metrics, fetchAll, toast]);

  const deleteMetric = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('social_media_metrics').delete().eq('id', id);
    if (error) { toast(errorToast); return false; }
    setMetrics((prev) => prev.filter((m) => m.id !== id));
    toast({ title: 'Eintrag gelöscht', variant: 'success' });
    return true;
  }, [toast]);

  return {
    accounts,
    metrics,
    loading,
    createAccount,
    createMissingPlatforms,
    updateAccount,
    deleteAccount,
    saveMonth,
    deleteMetric,
    refresh: fetchAll,
  };
}
