import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PlatformDot, Delta, KpiTile, MonthStepper } from '../components/social-media/ui';
import { Tabs } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { cn } from '../lib/utils';
import { usePortfolio } from '../contexts/PortfolioContext';
import { PORTFOLIO_LABELS } from '../components/layout/navConfig';
import { useSocialMedia, type MonthEntry } from '../hooks/useSocialMedia';
import { useWebsites, type WebMonthEntry } from '../hooks/useWebsites';
import { useToast } from '../components/ui/Toast';
import { WebEntryGrid, WebsiteStatsTab, WebsitesManager } from '../components/social-media/WebsiteSections';
import {
  splitPlatforms, webRowFromMetric, webEntryFromRow, webGridHasInvalid, type WebGridRow,
} from '../components/social-media/websiteGrid';
import {
  FollowerGrowthChart, MonthlyMetricChart, AccountTrendChart, type MonthlyValue,
} from '../components/social-media/SocialMediaCharts';
import {
  PLATFORMS, PLATFORM_MAP, METRICS, FLOW_METRICS, accountLabel,
  computeSocialStats, latestDataMonth, earliestDataMonth, currentMonthKey,
  addMonths, monthDiff, monthLabel, toMonthKey, engagementOf,
  fmtInt, fmtCompact, fmtSigned, fmtPct, parseCount, PERIODS,
  type MetricKey, type FlowMetricKey, type SocialStats,
} from '../lib/socialMedia';
import type { SocialMediaAccountRow, SocialMediaMetricRow, SocialMediaPlatform, WebsiteRow, WebsiteMetricRow } from '../types/database';

const TABS = [
  { key: 'overview', label: 'Statistik Social' },
  { key: 'web',      label: 'Webseiten & Conversion' },
  { key: 'entry',    label: 'Monat erfassen' },
  { key: 'history',  label: 'Verlauf pro Konto' },
  { key: 'accounts', label: 'Konten & Webseiten' },
];

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Overview / statistics
// ---------------------------------------------------------------------------


type BarMetric = 'netNew' | 'engagement' | FlowMetricKey;

const BAR_METRICS: { value: BarMetric; label: string }[] = [
  { value: 'netNew', label: 'Neue Follower (netto)' },
  { value: 'views', label: 'Views' },
  { value: 'engagement', label: 'Engagement (Likes + Komm. + Shares + Saves)' },
  ...METRICS.filter((m) => m.key !== 'followers' && m.key !== 'views').map((m) => ({ value: m.key as BarMetric, label: m.label })),
];

const barValue = (metric: BarMetric): MonthlyValue => (am) =>
  metric === 'netNew' ? am.netNew : metric === 'engagement' ? am.engagement : am.flow[metric];

function Insights({ stats }: { stats: SocialStats }) {
  const withData = stats.accounts.filter((a) => a.followers != null);
  if (withData.length === 0) return null;
  const best = (pick: (a: (typeof withData)[number]) => number | null) =>
    withData.reduce<{ a: (typeof withData)[number]; v: number } | null>((acc, a) => {
      const v = pick(a);
      return v != null && (acc == null || v > acc.v) ? { a, v } : acc;
    }, null);

  const items = [
    { label: 'Meiste Neufollower', r: best((a) => a.deltaPeriod), fmt: (v: number) => fmtSigned(v) },
    { label: 'Stärkstes Wachstum', r: best((a) => a.deltaPeriodPct), fmt: (v: number) => fmtPct(v) },
    { label: 'Beste Engagement-Rate', r: best((a) => a.engagementRate), fmt: (v: number) => fmtPct(v, 1, false) },
    { label: 'Meiste Views', r: best((a) => a.views), fmt: (v: number) => fmtCompact(v) },
  ].filter((i) => i.r && i.r.v > 0);

  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ label, r, fmt }) => (
        <div key={label} className="flex items-center gap-3 border border-primary-100 bg-primary-50/40 px-4 py-2.5">
          <PlatformDot platform={r!.a.account.platform} />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-primary-400">{label}</p>
            <p className="truncate text-sm text-primary-800">
              {accountLabel(r!.a.account)} <span className="font-semibold tabular-nums">{fmt(r!.v)}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function OverviewTab({ accounts, metrics, onGoToEntry }: {
  accounts: SocialMediaAccountRow[];
  metrics: SocialMediaMetricRow[];
  onGoToEntry: (month?: string) => void;
}) {
  const [period, setPeriod] = useState('12');
  const [barMetric, setBarMetric] = useState<BarMetric>('netNew');

  const latest = latestDataMonth(metrics);
  const earliest = earliestDataMonth(metrics);

  const stats = useMemo(() => {
    if (!latest || !earliest) return null;
    const n = period === 'all' ? monthDiff(earliest, latest) + 1 : Number(period);
    const from = period === 'all' ? earliest : addMonths(latest, -(n - 1));
    return computeSocialStats(accounts, metrics, from, latest);
  }, [accounts, metrics, period, latest, earliest]);

  if (!stats || !latest) {
    return (
      <EmptyState
        title="Noch keine Zahlen erfasst"
        description="Trage die Kennzahlen des letzten Monats ein — danach erscheinen hier Wachstum, Vergleiche und Trends."
        action={<Button onClick={() => onGoToEntry()}>Ersten Monat erfassen</Button>}
      />
    );
  }

  // Accounts that show up anywhere in the window
  const chartAccounts = accounts.filter((a) => stats.series.some((m) => {
    const am = m.byAccount[a.id];
    return am && (am.followers != null || FLOW_METRICS.some((k) => am.flow[k] != null));
  }));
  const tableRows = stats.accounts
    .filter((s) => chartAccounts.some((a) => a.id === s.account.id))
    .sort((a, b) => (b.followers ?? -1) - (a.followers ?? -1));
  const missing = stats.accounts.filter((s) => s.missingLast && s.account.is_active);
  const k = stats.kpis;
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-primary-500">
          Stand: <span className="font-medium text-primary-800">{monthLabel(latest, true)}</span>
          <span className="text-primary-300"> · {monthLabel(stats.months[0], true)} – {monthLabel(latest, true)}</span>
        </p>
        <Select options={PERIODS} value={period} onChange={(e) => setPeriod(e.target.value)} className="w-48" />
      </div>

      {missing.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <span>
            Für {monthLabel(latest, true)} fehlen noch Zahlen von: {missing.map((m) => accountLabel(m.account)).join(', ')}.
            {' '}Follower werden bis dahin mit dem letzten bekannten Stand weitergeführt.
          </span>
          <Button size="sm" variant="secondary" onClick={() => onGoToEntry(latest)}>Nachtragen</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiTile
          label="Follower gesamt"
          value={fmtInt(k.followers)}
          sub={<>Vormonat <Delta value={k.deltaMonth} /> (<Delta pct={k.deltaMonthPct} />)</>}
        />
        <KpiTile
          label={`Wachstum · ${periodLabel.replace('Letzte ', '')}`}
          value={k.deltaPeriod != null ? fmtSigned(k.deltaPeriod) : '—'}
          sub={<><Delta pct={k.deltaPeriodPct} /> · Ø {fmtPct(k.cmgr, 2)} / Monat</>}
          hint="Nur Konten, die zu Beginn des Zeitraums schon Zahlen hatten — neu hinzugekommene Plattformen zählen nicht als Wachstum"
        />
        <KpiTile
          label="Ø Neufollower / Monat"
          value={k.netNewAvg != null ? fmtSigned(Math.round(k.netNewAvg)) : '—'}
          sub="netto, alle Plattformen"
        />
        <KpiTile
          label={`Views · ${monthLabel(latest)}`}
          value={fmtCompact(k.views)}
          sub={k.viewsPrev != null ? <>vs. Vormonat <Delta pct={k.viewsPrev > 0 ? ((k.views - k.viewsPrev) / k.viewsPrev) * 100 : null} /></> : undefined}
        />
        <KpiTile
          label={`Engagement · ${monthLabel(latest)}`}
          value={fmtCompact(k.engagement)}
          sub={<>Rate {fmtPct(k.engagementRate, 2, false)}{k.engagementPrev != null && k.engagementPrev > 0 && <> · <Delta pct={((k.engagement - k.engagementPrev) / k.engagementPrev) * 100} /></>}</>}
          hint="Likes + Kommentare + Shares + Saves; Rate = Engagement / Follower"
        />
      </div>

      <Insights stats={stats} />

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-primary-500">Follower-Entwicklung</h2>
        <p className="mb-4 text-xs text-primary-400">Gestapelt nach Plattform · Stand jeweils Monatsende</p>
        <FollowerGrowthChart series={stats.series} accounts={chartAccounts} />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {chartAccounts.map((a) => (
            <span key={a.id} className="flex items-center gap-1.5 text-xs text-primary-500">
              <PlatformDot platform={a.platform} />{accountLabel(a)}
            </span>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-500">Pro Monat</h2>
          <Select options={BAR_METRICS} value={barMetric} onChange={(e) => setBarMetric(e.target.value as BarMetric)} className="w-72" />
        </div>
        <MonthlyMetricChart series={stats.series} accounts={chartAccounts} value={barValue(barMetric)} />
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-500">Plattform-Vergleich</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-primary-100 bg-primary-50/50 text-xs text-primary-400">
                <th className="px-4 py-2 text-left font-medium">Konto</th>
                <th className="px-3 py-2 text-right font-medium">Follower</th>
                <th className="px-3 py-2 text-right font-medium">Anteil</th>
                <th className="px-3 py-2 text-right font-medium">Δ Vormonat</th>
                <th className="px-3 py-2 text-right font-medium">Δ Zeitraum</th>
                <th className="px-3 py-2 text-right font-medium" title="Durchschnittliches monatliches Wachstum (zusammengesetzt)">Ø / Monat</th>
                <th className="px-3 py-2 text-right font-medium">Views</th>
                <th className="px-3 py-2 text-right font-medium">Engagement</th>
                <th className="px-4 py-2 text-right font-medium">Eng.-Rate</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((s) => (
                <tr key={s.account.id} className="border-b border-primary-50 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2 text-primary-800">
                      <PlatformDot platform={s.account.platform} />
                      {accountLabel(s.account)}
                      {s.missingLast && <span className="text-[10px] text-amber-600" title="Für den letzten Monat nicht erfasst">fehlt</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums text-primary-900">{fmtInt(s.followers)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 bg-primary-50">
                        <div className="h-full" style={{ width: `${s.share ?? 0}%`, backgroundColor: PLATFORM_MAP[s.account.platform].color }} />
                      </div>
                      <span className="w-12 tabular-nums text-primary-500">{fmtPct(s.share, 1, false)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right"><Delta value={s.deltaMonth} /> <span className="text-xs"><Delta pct={s.deltaMonthPct} /></span></td>
                  <td className="px-3 py-2.5 text-right"><Delta value={s.deltaPeriod} /> <span className="text-xs"><Delta pct={s.deltaPeriodPct} /></span></td>
                  <td className="px-3 py-2.5 text-right text-xs"><Delta pct={s.cmgr} /></td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-primary-700">{fmtCompact(s.views)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-primary-700">{fmtCompact(s.engagement)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-primary-700">{fmtPct(s.engagementRate, 2, false)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-primary-200 bg-primary-50/40 font-medium">
                <td className="px-4 py-2.5 text-primary-800">Total</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-primary-900">{fmtInt(k.followers)}</td>
                <td />
                <td className="px-3 py-2.5 text-right"><Delta value={k.deltaMonth} /> <span className="text-xs"><Delta pct={k.deltaMonthPct} /></span></td>
                <td className="px-3 py-2.5 text-right"><Delta value={k.deltaPeriod} /> <span className="text-xs"><Delta pct={k.deltaPeriodPct} /></span></td>
                <td className="px-3 py-2.5 text-right text-xs"><Delta pct={k.cmgr} /></td>
                <td className="px-3 py-2.5 text-right tabular-nums text-primary-800">{fmtCompact(k.views)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-primary-800">{fmtCompact(k.engagement)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-primary-800">{fmtPct(k.engagementRate, 2, false)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="border-t border-primary-100 px-5 py-2 text-[11px] text-primary-400">
          Views und Engagement beziehen sich auf {monthLabel(latest, true)}. Δ Zeitraum vergleicht mit dem Stand vor Beginn des Zeitraums
          (oder dem ersten erfassten Monat, falls das Konto später dazukam).
        </p>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monthly entry grid
// ---------------------------------------------------------------------------

type GridRow = Record<MetricKey, string> & { notes: string };

const METRIC_KEYS = METRICS.map((m) => m.key);

function rowFromMetric(r: SocialMediaMetricRow | undefined): GridRow {
  const out = { notes: r?.notes ?? '' } as GridRow;
  for (const key of METRIC_KEYS) out[key] = r?.[key] != null ? fmtInt(r[key]) : '';
  return out;
}

function EntryTab({ accounts, metrics, sites, webMetrics, month, onMonthChange, onSave, onSaveWeb }: {
  accounts: SocialMediaAccountRow[];
  metrics: SocialMediaMetricRow[];
  sites: WebsiteRow[];
  webMetrics: WebsiteMetricRow[];
  month: string;
  onMonthChange: (m: string) => void;
  onSave: (month: string, entries: MonthEntry[], opts?: { silent?: boolean }) => Promise<boolean>;
  onSaveWeb: (month: string, entries: WebMonthEntry[]) => Promise<boolean>;
}) {
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingMonth, setPendingMonth] = useState<string | null>(null);

  const active = useMemo(() => {
    // Inactive accounts stay visible for months where they already have data
    const withData = new Set(metrics.filter((m) => toMonthKey(m.month) === month).map((m) => m.account_id));
    return accounts.filter((a) => a.is_active || withData.has(a.id));
  }, [accounts, metrics, month]);

  const saved = useMemo(() => {
    const map: Record<string, GridRow> = {};
    for (const a of active) map[a.id] = rowFromMetric(metrics.find((m) => m.account_id === a.id && toMonthKey(m.month) === month));
    return map;
  }, [active, metrics, month]);

  // Last known followers before this month, per account (hint + live delta)
  const previous = useMemo(() => {
    const map: Record<string, { followers: number; month: string } | null> = {};
    for (const a of active) {
      const prior = metrics
        .filter((m) => m.account_id === a.id && toMonthKey(m.month) < month && m.followers != null)
        .sort((x, y) => (x.month < y.month ? 1 : -1))[0];
      map[a.id] = prior ? { followers: prior.followers!, month: toMonthKey(prior.month) } : null;
    }
    return map;
  }, [active, metrics, month]);

  const [grid, setGrid] = useState<Record<string, GridRow>>(saved);
  useEffect(() => { setGrid(saved); }, [saved]);

  // Websites — same month, same save button
  const activeSites = useMemo(() => {
    const withData = new Set(webMetrics.filter((m) => toMonthKey(m.month) === month).map((m) => m.website_id));
    return sites.filter((s) => s.is_active || withData.has(s.id));
  }, [sites, webMetrics, month]);
  const savedWeb = useMemo(() => {
    const map: Record<string, WebGridRow> = {};
    for (const s of activeSites) map[s.id] = webRowFromMetric(webMetrics.find((m) => m.website_id === s.id && toMonthKey(m.month) === month));
    return map;
  }, [activeSites, webMetrics, month]);
  const previousWeb = useMemo(() => {
    const map: Record<string, WebsiteMetricRow | undefined> = {};
    const prevMonth = addMonths(month, -1);
    for (const s of activeSites) map[s.id] = webMetrics.find((m) => m.website_id === s.id && toMonthKey(m.month) === prevMonth);
    return map;
  }, [activeSites, webMetrics, month]);
  const [webGrid, setWebGrid] = useState<Record<string, WebGridRow>>(savedWeb);
  useEffect(() => { setWebGrid(savedWeb); }, [savedWeb]);
  const webDirty = activeSites.some((s) => JSON.stringify(webGrid[s.id]) !== JSON.stringify(savedWeb[s.id]));
  const webInvalid = activeSites.some((s) => webGridHasInvalid(webGrid[s.id]));

  const cols = METRICS.filter((m) => showAll || m.core);
  const invalid = (v: string) => v.trim() !== '' && parseCount(v) == null;
  const socialDirty = active.some((a) => JSON.stringify(grid[a.id]) !== JSON.stringify(saved[a.id]));
  const dirty = socialDirty || webDirty;
  const hasInvalid = webInvalid || active.some((a) => grid[a.id] && METRIC_KEYS.some((k) => invalid(grid[a.id][k])));
  // A value hidden by the collapsed view still counts — show a hint so it is not forgotten
  const hiddenFilled = !showAll && active.some((a) => METRICS.some((m) => !m.core && grid[a.id]?.[m.key]));

  function setCell(accountId: string, key: MetricKey | 'notes', value: string) {
    setGrid((g) => ({ ...g, [accountId]: { ...g[accountId], [key]: value } }));
  }

  function requestMonth(m: string) {
    if (dirty) setPendingMonth(m);
    else onMonthChange(m);
  }

  async function handleSave() {
    const entries: MonthEntry[] = active.map((a) => {
      const row = grid[a.id];
      const e: MonthEntry = { account_id: a.id, notes: row.notes.trim() || null };
      for (const key of METRIC_KEYS) (e as Record<string, unknown>)[key] = parseCount(row[key]);
      return e;
    });
    setSaving(true);
    // Websites first (silent), then social; one toast for the whole month
    let ok = true;
    if (webDirty) ok = await onSaveWeb(month, activeSites.map((s) => webEntryFromRow(s.id, webGrid[s.id])));
    if (ok && socialDirty) ok = await onSave(month, entries, { silent: true });
    if (ok) toast({ title: `${monthLabel(month, true)} gespeichert`, variant: 'success' });
    setSaving(false);
  }

  const lastFullMonth = addMonths(currentMonthKey(), -1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MonthStepper month={month} onChange={requestMonth} max={currentMonthKey()} />
          <span className="text-sm font-medium text-primary-800">{monthLabel(month, true)}</span>
          {month > lastFullMonth && <span className="text-xs text-amber-600">laufender Monat</span>}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-primary-600">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Alle Kennzahlen
          </label>
          <Button variant="ghost" size="sm" disabled={!dirty || saving} onClick={() => { setGrid(saved); setWebGrid(savedWeb); }}>Verwerfen</Button>
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!dirty || hasInvalid}>Speichern</Button>
        </div>
      </div>

      <h2 className="pt-2 text-sm font-semibold uppercase tracking-wider text-primary-500">Social Media</h2>
      <p className="text-xs text-primary-400">
        Follower = Stand am Monatsende. Alle anderen Werte = Aktivität im Monat (aus den Insights der Plattform).
        Leere Felder bleiben leer (≠ 0). Eingaben wie <span className="font-mono">12'345</span>, <span className="font-mono">12.3k</span> oder <span className="font-mono">1.2M</span> sind möglich.
      </p>
      {hiddenFilled && (
        <p className="text-xs text-amber-600">Einige ausgeblendete Kennzahlen enthalten Werte — „Alle Kennzahlen" zeigt sie.</p>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary-100 bg-primary-50/50 text-xs text-primary-400">
              <th className="sticky left-0 z-10 min-w-[180px] bg-primary-50 px-4 py-2 text-left font-medium">Konto</th>
              {cols.map((c) => (
                <th key={c.key} className="min-w-[110px] px-2 py-2 text-left font-medium" title={`${c.label} — ${c.hint}`}>
                  {c.label}
                  <span className="block text-[10px] font-normal text-primary-300">{c.hint}</span>
                </th>
              ))}
              {showAll && <th className="min-w-[180px] px-2 py-2 text-left font-medium">Notiz</th>}
            </tr>
          </thead>
          <tbody>
            {active.map((a) => {
              const row = grid[a.id];
              if (!row) return null;
              const prev = previous[a.id];
              const followers = parseCount(row.followers);
              const delta = followers != null && prev ? followers - prev.followers : null;
              const engagement = engagementOf(Object.fromEntries(METRIC_KEYS.map((k) => [k, parseCount(row[k])])));
              return (
                <tr key={a.id} className="border-b border-primary-50 last:border-0">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2">
                    <span className="flex items-center gap-2 text-primary-800">
                      <PlatformDot platform={a.platform} />
                      <span className="truncate">{accountLabel(a)}</span>
                    </span>
                    {engagement != null && (
                      <span className="ml-4.5 block text-[10px] text-primary-400">Engagement {fmtInt(engagement)}</span>
                    )}
                  </td>
                  {cols.map((c) => (
                    <td key={c.key} className="px-2 py-1.5 align-top">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row[c.key]}
                        onChange={(e) => setCell(a.id, c.key, e.target.value)}
                        onBlur={(e) => { const n = parseCount(e.target.value); if (n != null) setCell(a.id, c.key, fmtInt(n)); }}
                        placeholder={c.key === 'followers' && prev ? fmtInt(prev.followers) : ''}
                        className={cn(
                          'w-full rounded border bg-white px-2 py-1 text-right tabular-nums text-primary-900 placeholder:text-primary-200 focus:border-primary-500 focus:outline-none',
                          invalid(row[c.key]) ? 'border-red-400 bg-red-50' : 'border-primary-200',
                        )}
                        aria-label={`${accountLabel(a)} ${c.label}`}
                      />
                      {c.key === 'followers' && (
                        <span className="mt-0.5 block text-right text-[10px]">
                          {delta != null
                            ? <Delta value={delta} />
                            : prev ? <span className="text-primary-300">{monthLabel(prev.month)}: {fmtInt(prev.followers)}</span> : null}
                        </span>
                      )}
                    </td>
                  ))}
                  {showAll && (
                    <td className="px-2 py-1.5 align-top">
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) => setCell(a.id, 'notes', e.target.value)}
                        placeholder="z. B. Viral-Reel, Kampagne…"
                        className="w-full rounded border border-primary-200 bg-white px-2 py-1 text-primary-900 placeholder:text-primary-200 focus:border-primary-500 focus:outline-none"
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {activeSites.length > 0 && (
        <section className="space-y-2 pt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-500">Webseiten</h2>
          <p className="text-xs text-primary-400">
            Aus Squarespace/Wix Analytics für {monthLabel(month, true)}. Graue Werte = Vormonat.
          </p>
          <WebEntryGrid
            key={month}
            sites={activeSites}
            grid={webGrid}
            onChange={(id, next) => setWebGrid((g) => ({ ...g, [id]: next }))}
            platforms={splitPlatforms(accounts)}
            previous={previousWeb}
          />
        </section>
      )}

      <ConfirmDialog
        isOpen={pendingMonth != null}
        onClose={() => setPendingMonth(null)}
        onConfirm={() => { if (pendingMonth) onMonthChange(pendingMonth); setPendingMonth(null); }}
        title="Ungespeicherte Änderungen"
        message={`Die Eingaben für ${monthLabel(month, true)} sind noch nicht gespeichert. Trotzdem wechseln und verwerfen?`}
        confirmLabel="Verwerfen"
        variant="danger"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// History per account
// ---------------------------------------------------------------------------

function HistoryTab({ accounts, metrics, onEditMonth, onDelete }: {
  accounts: SocialMediaAccountRow[];
  metrics: SocialMediaMetricRow[];
  onEditMonth: (month: string) => void;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [barMetric, setBarMetric] = useState<FlowMetricKey | 'engagement'>('views');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const rows = useMemo(
    () => metrics.filter((m) => m.account_id === account?.id).sort((a, b) => (a.month < b.month ? -1 : 1)),
    [metrics, account],
  );

  if (!account) return null;
  const color = PLATFORM_MAP[account.platform].color;
  const barOptions = [
    { value: 'engagement', label: 'Engagement' },
    ...METRICS.filter((m) => m.key !== 'followers').map((m) => ({ value: m.key, label: m.label })),
  ];
  const points = rows.map((r) => ({
    month: toMonthKey(r.month),
    followers: r.followers,
    bar: barMetric === 'engagement' ? engagementOf(r) : r[barMetric],
  }));
  const shownCols = METRICS.filter((m) => rows.some((r) => r[m.key] != null));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          options={accounts.map((a) => ({ value: a.id, label: accountLabel(a) + (a.is_active ? '' : ' (inaktiv)') }))}
          value={account.id}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-64"
        />
        {account.url && (
          <a href={account.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 underline hover:text-primary-700">
            Profil öffnen
          </a>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Keine Einträge" description={`Für ${accountLabel(account)} wurden noch keine Monatszahlen erfasst.`} />
      ) : (
        <>
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary-500">
                <PlatformDot platform={account.platform} />{accountLabel(account)}
              </h2>
              <Select options={barOptions} value={barMetric} onChange={(e) => setBarMetric(e.target.value as FlowMetricKey | 'engagement')} className="w-56" />
            </div>
            <AccountTrendChart points={points} color={color} barLabel={barOptions.find((o) => o.value === barMetric)?.label ?? ''} />
          </Card>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-100 bg-primary-50/50 text-xs text-primary-400">
                  <th className="px-4 py-2 text-left font-medium">Monat</th>
                  {shownCols.map((c) => <th key={c.key} className="px-3 py-2 text-right font-medium">{c.short}</th>)}
                  {shownCols.some((c) => c.key === 'followers') && <th className="px-3 py-2 text-right font-medium">Δ</th>}
                  <th className="px-3 py-2 text-right font-medium">Engagement</th>
                  <th className="px-3 py-2 text-left font-medium">Notiz</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((r, i, arr) => {
                  const older = arr.slice(i + 1).find((x) => x.followers != null);
                  const delta = r.followers != null && older ? r.followers - older.followers! : null;
                  return (
                    <tr key={r.id} className="group border-b border-primary-50 last:border-0 hover:bg-primary-50/40">
                      <td className="px-4 py-2 text-primary-800">{monthLabel(toMonthKey(r.month), true)}</td>
                      {shownCols.map((c) => <td key={c.key} className="px-3 py-2 text-right tabular-nums text-primary-700">{fmtInt(r[c.key])}</td>)}
                      {shownCols.some((c) => c.key === 'followers') && <td className="px-3 py-2 text-right text-xs"><Delta value={delta} /></td>}
                      <td className="px-3 py-2 text-right tabular-nums text-primary-700">{fmtInt(engagementOf(r))}</td>
                      <td className="max-w-[220px] truncate px-3 py-2 text-xs text-primary-400" title={r.notes ?? ''}>{r.notes}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={() => onEditMonth(toMonthKey(r.month))} className="rounded p-1 text-primary-400 hover:bg-primary-100 hover:text-primary-600" title="Monat bearbeiten">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" /></svg>
                          </button>
                          <button onClick={() => setConfirmId(r.id)} className="rounded p-1 text-red-300 hover:bg-red-50 hover:text-red-500" title="Eintrag löschen">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a1 1 0 00-1 1v1h6V4a1 1 0 00-1-1m-4 0h4" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <ConfirmDialog
        isOpen={confirmId != null}
        onClose={() => setConfirmId(null)}
        onConfirm={async () => { if (confirmId) await onDelete(confirmId); setConfirmId(null); }}
        title="Eintrag löschen"
        message="Alle Zahlen dieses Kontos für diesen Monat werden gelöscht."
        confirmLabel="Löschen"
        variant="danger"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

function AccountsTab({ accounts, metrics, onCreate, onCreateMissing, onUpdate, onDelete }: {
  accounts: SocialMediaAccountRow[];
  metrics: SocialMediaMetricRow[];
  onCreate: (a: { platform: SocialMediaPlatform; handle: string; url: string | null }) => Promise<boolean>;
  onCreateMissing: () => Promise<boolean>;
  onUpdate: (id: string, u: Partial<SocialMediaAccountRow>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [platform, setPlatform] = useState<SocialMediaPlatform>('instagram');
  const [handle, setHandle] = useState('');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<SocialMediaAccountRow | null>(null);
  const [edits, setEdits] = useState<Record<string, { handle: string; url: string }>>({});

  const missingPlatforms = PLATFORMS.filter((p) => !accounts.some((a) => a.platform === p.key));
  const countFor = (id: string) => metrics.filter((m) => m.account_id === id).length;

  async function add() {
    setAdding(true);
    const ok = await onCreate({ platform, handle: handle.trim(), url: url.trim() || null });
    setAdding(false);
    if (ok) { setHandle(''); setUrl(''); }
  }

  async function commit(a: SocialMediaAccountRow) {
    const e = edits[a.id];
    if (!e) return;
    const next = { handle: e.handle.trim(), url: e.url.trim() || null };
    if (next.handle !== a.handle || next.url !== a.url) await onUpdate(a.id, next);
    setEdits((x) => { const { [a.id]: _, ...rest } = x; return rest; });
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-500">Konto hinzufügen</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <Select label="Plattform" options={PLATFORMS.map((p) => ({ value: p.key, label: p.label }))} value={platform} onChange={(e) => setPlatform(e.target.value as SocialMediaPlatform)} />
          </div>
          <div className="w-52">
            <Input label="Handle / Name" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@simonberger" />
          </div>
          <div className="min-w-[220px] flex-1">
            <Input label="Profil-URL (optional)" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </div>
          <Button onClick={add} loading={adding}>Hinzufügen</Button>
        </div>
        {missingPlatforms.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-primary-100 pt-4 text-sm text-primary-500">
            <span>Noch ohne Konto: {missingPlatforms.map((p) => p.label).join(', ')}</span>
            <Button size="sm" variant="secondary" onClick={onCreateMissing}>Alle anlegen</Button>
          </div>
        )}
      </Card>

      {accounts.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-primary-100 bg-primary-50/50 text-xs text-primary-400">
                <th className="px-4 py-2 text-left font-medium">Plattform</th>
                <th className="px-3 py-2 text-left font-medium">Handle / Name</th>
                <th className="px-3 py-2 text-left font-medium">Profil-URL</th>
                <th className="px-3 py-2 text-right font-medium">Monate</th>
                <th className="px-3 py-2 text-center font-medium" title="Inaktive Konten erscheinen nicht mehr in der Monatserfassung; ihre Historie bleibt in der Statistik">Aktiv</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const e = edits[a.id] ?? { handle: a.handle, url: a.url ?? '' };
                const setE = (patch: Partial<typeof e>) => setEdits((x) => ({ ...x, [a.id]: { ...e, ...patch } }));
                return (
                  <tr key={a.id} className={cn('border-b border-primary-50 last:border-0', !a.is_active && 'opacity-50')}>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-2 text-primary-800"><PlatformDot platform={a.platform} />{PLATFORM_MAP[a.platform].label}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={e.handle}
                        onChange={(ev) => setE({ handle: ev.target.value })}
                        onBlur={() => commit(a)}
                        onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
                        placeholder="—"
                        className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-primary-800 hover:border-primary-200 focus:border-primary-500 focus:bg-white focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        value={e.url}
                        onChange={(ev) => setE({ url: ev.target.value })}
                        onBlur={() => commit(a)}
                        onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
                        placeholder="—"
                        className="w-full rounded border border-transparent bg-transparent px-2 py-1 text-primary-600 hover:border-primary-200 focus:border-primary-500 focus:bg-white focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-primary-500">{countFor(a.id)}</td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={a.is_active} onChange={(ev) => onUpdate(a.id, { is_active: ev.target.checked })} aria-label="Aktiv" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => setConfirm(a)} className="rounded p-1 text-red-300 hover:bg-red-50 hover:text-red-500" title="Konto löschen">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a1 1 0 00-1 1v1h6V4a1 1 0 00-1-1m-4 0h4" /></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmDialog
        isOpen={confirm != null}
        onClose={() => setConfirm(null)}
        onConfirm={async () => { if (confirm) await onDelete(confirm.id); setConfirm(null); }}
        title="Konto löschen"
        message={confirm
          ? `${accountLabel(confirm)} und alle ${countFor(confirm.id)} erfassten Monate werden endgültig gelöscht. Wenn das Konto nur nicht mehr gepflegt wird, besser „Aktiv" abwählen — dann bleibt die Historie erhalten.`
          : ''}
        confirmLabel="Endgültig löschen"
        variant="danger"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SocialMediaPage() {
  const { portfolio } = usePortfolio();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  // Monthly figures are entered after the month closes → default to last month
  const entryMonth = searchParams.get('month') || addMonths(currentMonthKey(), -1);

  const sm = useSocialMedia(portfolio);
  const web = useWebsites(portfolio);

  const go = (tab: string, month?: string) => {
    const p: Record<string, string> = { tab };
    if (month) p.month = month;
    else if (tab === 'entry' && searchParams.get('month')) p.month = searchParams.get('month')!;
    setSearchParams(p);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-900">Social Media & Web</h1>
        <p className="mt-1 text-sm text-primary-400">
          Monatliche Kennzahlen, Wachstum und Conversion zur Webseite · {PORTFOLIO_LABELS[portfolio]?.name}
        </p>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onChange={(k) => go(k)} />

      {sm.loading || web.loading ? (
        <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : sm.accounts.length === 0 && (activeTab === 'overview' || activeTab === 'history') ? (
        <EmptyState
          title="Noch keine Konten"
          description="Lege zuerst die Social-Media-Konten an, deren Zahlen du monatlich erfassen willst."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={sm.createMissingPlatforms}>Alle 10 Plattformen anlegen</Button>
              <Button variant="secondary" onClick={() => go('accounts')}>Einzeln anlegen</Button>
            </div>
          }
        />
      ) : (
        <>
          {activeTab === 'overview' && (
            <OverviewTab accounts={sm.accounts} metrics={sm.metrics} onGoToEntry={(m) => go('entry', m)} />
          )}
          {activeTab === 'web' && (
            <WebsiteStatsTab
              sites={web.sites}
              metrics={web.metrics}
              accounts={sm.accounts}
              socialMetrics={sm.metrics}
              onGoToEntry={(m) => go('entry', m)}
              onDeleteMetric={web.deleteMetric}
            />
          )}
          {activeTab === 'entry' && (
            <EntryTab
              accounts={sm.accounts}
              metrics={sm.metrics}
              sites={web.sites}
              webMetrics={web.metrics}
              month={entryMonth}
              onMonthChange={(m) => go('entry', m)}
              onSave={sm.saveMonth}
              onSaveWeb={web.saveMonth}
            />
          )}
          {activeTab === 'history' && (
            <HistoryTab
              accounts={sm.accounts}
              metrics={sm.metrics}
              onEditMonth={(m) => go('entry', m)}
              onDelete={sm.deleteMetric}
            />
          )}
          {activeTab === 'accounts' && (
            <div className="space-y-6">
              <AccountsTab
                accounts={sm.accounts}
                metrics={sm.metrics}
                onCreate={sm.createAccount}
                onCreateMissing={sm.createMissingPlatforms}
                onUpdate={sm.updateAccount}
                onDelete={sm.deleteAccount}
              />
              <WebsitesManager
                sites={web.sites}
                metrics={web.metrics}
                onCreate={web.createSite}
                onUpdate={web.updateSite}
                onDelete={web.deleteSite}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
