// ---------------------------------------------------------------------------
// Website parts of the Social Media page
//   WebEntryGrid       — controlled entry grid for one month (metrics × sites)
//   WebsiteStatsTab    — website statistics + social → web conversion
//   WebsitesManager    — add / edit / deactivate / delete websites
// ---------------------------------------------------------------------------

import { useMemo, useState, type ReactNode } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../lib/utils';
import {
  PLATFORM_MAP, addMonths, monthDiff, monthLabel, toMonthKey, computeSocialStats,
  fmtInt, fmtCompact, fmtPct, parseCount, PERIODS,
} from '../../lib/socialMedia';
import {
  WEB_METRICS, WEB_GROUPS, SOURCE_KEYS, SITE_COLORS,
  computeWebStats, computeSocialToWeb, latestWebMonth, earliestWebMonth,
  fmtDuration,
} from '../../lib/websiteMetrics';
import type {
  WebsiteRow, WebsiteMetricRow, SocialMediaAccountRow, SocialMediaMetricRow, SocialMediaPlatform,
} from '../../types/database';
import { formatValue, parseValue, isInvalid, type WebGridRow } from './websiteGrid';
import { PlatformDot, Delta, KpiTile } from './ui';
import { SiteMetricChart, SourceMixChart, SocialConversionChart } from './WebsiteCharts';

// ---------------------------------------------------------------------------
// Entry grid (metrics as rows, websites as columns)
// ---------------------------------------------------------------------------

export function WebEntryGrid({ sites, grid, onChange, platforms, previous }: {
  sites: WebsiteRow[];
  grid: Record<string, WebGridRow>;
  onChange: (siteId: string, next: WebGridRow) => void;
  /** Social platforms offered for the per-platform split */
  platforms: SocialMediaPlatform[];
  /** Previous month's row per site (placeholder hints) */
  previous: Record<string, WebsiteMetricRow | undefined>;
}) {
  const [showSplit, setShowSplit] = useState(() => sites.some((s) => Object.keys(grid[s.id]?.social ?? {}).length > 0));

  const inputCls = (bad: boolean) => cn(
    'w-full rounded border bg-white px-2 py-1 text-right tabular-nums text-primary-900 placeholder:text-primary-200 focus:border-primary-500 focus:outline-none',
    bad ? 'border-red-400 bg-red-50' : 'border-primary-200',
  );

  const warnings = sites.flatMap((s) => {
    const row = grid[s.id];
    if (!row) return [];
    const visits = parseCount(row.visits);
    const srcSum = SOURCE_KEYS.reduce((acc, k) => acc + (parseCount(row[k]) ?? 0), 0);
    const social = parseCount(row.source_social);
    const splitSum = Object.values(row.social).reduce((acc, v) => acc + (parseCount(v ?? '') ?? 0), 0);
    const out: string[] = [];
    if (visits != null && srcSum > visits) out.push(`${s.domain}: Summe der Quellen (${fmtInt(srcSum)}) ist grösser als die Besuche (${fmtInt(visits)}).`);
    if (social != null && splitSum > social) out.push(`${s.domain}: Social nach Plattform (${fmtInt(splitSum)}) ist grösser als Social gesamt (${fmtInt(social)}).`);
    if (social == null && splitSum > 0) out.push(`${s.domain}: Social gesamt fehlt — wird für die Conversion gebraucht.`);
    return out;
  });

  return (
    <div className="space-y-3">
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-primary-100 bg-primary-50/50 text-xs text-primary-400">
              <th className="px-4 py-2 text-left font-medium">Kennzahl</th>
              {sites.map((s, i) => (
                <th key={s.id} className="min-w-[150px] px-2 py-2 text-right font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SITE_COLORS[i % SITE_COLORS.length] }} />
                    {s.domain}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEB_GROUPS.map((g) => (
              <GroupRows key={g.key} label={g.label} hint={g.hint} span={sites.length + 1}>
                {WEB_METRICS.filter((m) => m.group === g.key).map((m) => (
                  <tr key={m.key} className="border-b border-primary-50 last:border-0">
                    <td className="px-4 py-1.5 text-primary-700">
                      {m.label}
                      {m.hint && <span className="ml-1.5 text-[10px] text-primary-300">{m.hint}</span>}
                    </td>
                    {sites.map((s) => {
                      const row = grid[s.id];
                      if (!row) return <td key={s.id} />;
                      const prev = previous[s.id]?.[m.key] ?? null;
                      return (
                        <td key={s.id} className="px-2 py-1">
                          <input
                            type="text"
                            inputMode={m.kind === 'count' ? 'numeric' : 'decimal'}
                            value={row[m.key]}
                            placeholder={formatValue(m, prev)}
                            onChange={(e) => onChange(s.id, { ...row, [m.key]: e.target.value })}
                            onBlur={(e) => { const n = parseValue(m, e.target.value); if (n != null) onChange(s.id, { ...row, [m.key]: formatValue(m, n) }); }}
                            className={inputCls(isInvalid(m, row[m.key]))}
                            aria-label={`${s.domain} ${m.label}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </GroupRows>
            ))}

            <tr className="border-b border-primary-100 bg-primary-50/40">
              <td colSpan={sites.length + 1} className="px-4 py-2">
                <button type="button" onClick={() => setShowSplit((v) => !v)} className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-500 hover:text-primary-800">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn('h-3 w-3 transition-transform', showSplit && 'rotate-90')}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5l5 5-5 5" /></svg>
                  Social-Besuche nach Plattform
                  <span className="font-normal normal-case tracking-normal text-primary-400">— für die Conversion pro Plattform (Traffic-Quellen → Social aufklappen)</span>
                </button>
              </td>
            </tr>
            {showSplit && platforms.map((p) => (
              <tr key={p} className="border-b border-primary-50 last:border-0">
                <td className="px-4 py-1.5 pl-8 text-primary-700">
                  <span className="flex items-center gap-2"><PlatformDot platform={p} />{PLATFORM_MAP[p].label}</span>
                </td>
                {sites.map((s) => {
                  const row = grid[s.id];
                  if (!row) return <td key={s.id} />;
                  const v = row.social[p] ?? '';
                  const prev = previous[s.id]?.social_by_platform?.[p];
                  return (
                    <td key={s.id} className="px-2 py-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={v}
                        placeholder={prev != null ? fmtInt(prev) : ''}
                        onChange={(e) => onChange(s.id, { ...row, social: { ...row.social, [p]: e.target.value } })}
                        onBlur={(e) => { const n = parseCount(e.target.value); if (n != null) onChange(s.id, { ...row, social: { ...row.social, [p]: fmtInt(n) } }); }}
                        className={inputCls(v.trim() !== '' && parseCount(v) == null)}
                        aria-label={`${s.domain} Social-Besuche ${PLATFORM_MAP[p].label}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}

            <tr>
              <td className="px-4 py-1.5 text-primary-700">Notiz</td>
              {sites.map((s) => {
                const row = grid[s.id];
                if (!row) return <td key={s.id} />;
                return (
                  <td key={s.id} className="px-2 py-1">
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => onChange(s.id, { ...row, notes: e.target.value })}
                      placeholder="z. B. Launch, Kampagne…"
                      className="w-full rounded border border-primary-200 bg-white px-2 py-1 text-primary-900 placeholder:text-primary-200 focus:border-primary-500 focus:outline-none"
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </Card>
      {warnings.length > 0 && (
        <ul className="space-y-0.5 text-xs text-amber-700">
          {warnings.map((w) => <li key={w}>⚠ {w}</li>)}
        </ul>
      )}
    </div>
  );
}

function GroupRows({ label, hint, span, children }: { label: string; hint?: string; span: number; children: ReactNode }) {
  return (
    <>
      <tr className="border-b border-primary-100 bg-primary-50/40">
        <td colSpan={span} className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-500">
          {label}{hint && <span className="ml-2 font-normal normal-case tracking-normal text-primary-400">{hint}</span>}
        </td>
      </tr>
      {children}
    </>
  );
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

type SiteMetric = 'unique_visitors' | 'visits' | 'pageviews' | 'form_submissions' | 'newsletter_signups' | 'conversions';

const SITE_METRIC_OPTIONS: { value: SiteMetric; label: string }[] = [
  { value: 'unique_visitors', label: 'Besucher' },
  { value: 'visits', label: 'Besuche' },
  { value: 'pageviews', label: 'Seitenaufrufe' },
  { value: 'conversions', label: 'Conversions (Formulare + Newsletter)' },
  { value: 'form_submissions', label: 'Formular-Einsendungen' },
  { value: 'newsletter_signups', label: 'Newsletter-Anmeldungen' },
];

const siteValue = (k: SiteMetric) => (r: WebsiteMetricRow): number | null =>
  k === 'conversions'
    ? (r.form_submissions == null && r.newsletter_signups == null ? null : (r.form_submissions ?? 0) + (r.newsletter_signups ?? 0))
    : r[k];

const pctChange = (a: number | null | undefined, b: number | null | undefined) =>
  a != null && b != null && b > 0 ? ((a - b) / b) * 100 : null;

const fmtRate = (v: number | null | undefined, digits = 2) => (v == null || !Number.isFinite(v) ? '—' : v.toFixed(digits));

export function WebsiteStatsTab({ sites, metrics, accounts, socialMetrics, onGoToEntry, onDeleteMetric }: {
  sites: WebsiteRow[];
  metrics: WebsiteMetricRow[];
  accounts: SocialMediaAccountRow[];
  socialMetrics: SocialMediaMetricRow[];
  onGoToEntry: (month?: string) => void;
  onDeleteMetric: (id: string) => Promise<boolean>;
}) {
  const [period, setPeriod] = useState('12');
  const [siteMetric, setSiteMetric] = useState<SiteMetric>('unique_visitors');
  const [sourceSite, setSourceSite] = useState<string>('all');
  const [historySite, setHistorySite] = useState<string>(sites[0]?.id ?? '');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const latest = latestWebMonth(metrics);
  const earliest = earliestWebMonth(metrics);

  const data = useMemo(() => {
    if (!latest || !earliest) return null;
    const n = period === 'all' ? monthDiff(earliest, latest) + 1 : Number(period);
    const from = period === 'all' ? earliest : addMonths(latest, -(n - 1));
    const web = computeWebStats(sites, metrics, from, latest);
    const social = computeSocialStats(accounts, socialMetrics, from, latest);
    return { web, conv: computeSocialToWeb(web, metrics, social, accounts) };
  }, [sites, metrics, accounts, socialMetrics, period, latest, earliest]);

  if (!data || !latest) {
    return (
      <EmptyState
        title="Noch keine Webseiten-Zahlen"
        description="Trage die Zahlen aus Squarespace/Wix Analytics unter „Monat erfassen“ ein. Danach erscheinen hier Traffic, Quellen und die Conversion von Social Media zur Webseite."
        action={<Button onClick={() => onGoToEntry()}>Monat erfassen</Button>}
      />
    );
  }

  const { web, conv } = data;
  const L = web.last;
  const P = web.prev;
  const Y = web.yearAgo;
  const conversions = L.form_submissions + L.newsletter_signups;
  const missing = sites.filter((s) => s.is_active && !L.bySite[s.id]);
  const hasSocialVisits = conv.totals.socialVisits != null;
  const historyRows = metrics.filter((m) => m.website_id === (historySite || sites[0]?.id)).sort((a, b) => (a.month < b.month ? 1 : -1));
  const periodLabel = PERIODS.find((p) => p.value === period)?.label.replace('Letzte ', '') ?? '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-primary-500">
          Stand: <span className="font-medium text-primary-800">{monthLabel(latest, true)}</span>
          <span className="text-primary-300"> · {monthLabel(web.months[0], true)} – {monthLabel(latest, true)}</span>
        </p>
        <Select options={PERIODS} value={period} onChange={(e) => setPeriod(e.target.value)} className="w-48" />
      </div>

      {missing.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <span>Für {monthLabel(latest, true)} fehlen noch Zahlen von: {missing.map((s) => s.domain).join(', ')}.</span>
          <Button size="sm" variant="secondary" onClick={() => onGoToEntry(latest)}>Nachtragen</Button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiTile
          label={`Besucher · ${monthLabel(latest)}`}
          value={fmtInt(L.unique_visitors)}
          sub={<>VM <Delta pct={pctChange(L.unique_visitors, P?.unique_visitors)} /> · VJ <Delta pct={pctChange(L.unique_visitors, Y?.unique_visitors)} /></>}
          hint="VM = Vormonat, VJ = gleicher Monat im Vorjahr"
        />
        <KpiTile
          label={`Besuche · ${periodLabel}`}
          value={fmtCompact(web.periodVisits)}
          sub={web.prevPeriodVisits != null ? <>vs. Vorperiode <Delta pct={pctChange(web.periodVisits, web.prevPeriodVisits)} /></> : 'keine Vorperiode erfasst'}
        />
        <KpiTile
          label="Seiten / Besuch"
          value={L.visits > 0 && L.pageviews > 0 ? (L.pageviews / L.visits).toFixed(2) : '—'}
          sub={`${fmtCompact(L.pageviews)} Seitenaufrufe`}
        />
        <KpiTile
          label="Absprungrate"
          value={fmtPct(L.bounce_rate, 1, false)}
          sub={P?.bounce_rate != null && L.bounce_rate != null ? <>VM <span className={cn('tabular-nums', L.bounce_rate < P.bounce_rate ? 'text-emerald-600' : L.bounce_rate > P.bounce_rate ? 'text-red-500' : '')}>{(L.bounce_rate - P.bounce_rate > 0 ? '+' : '') + (L.bounce_rate - P.bounce_rate).toFixed(1)} Pkt.</span></> : 'tiefer ist besser'}
        />
        <KpiTile
          label="Ø Besuchsdauer"
          value={fmtDuration(L.avg_visit_duration)}
          sub={P?.avg_visit_duration != null ? <>VM <Delta pct={pctChange(L.avg_visit_duration, P.avg_visit_duration)} /></> : 'Minuten:Sekunden'}
        />
        <KpiTile
          label={`Conversions · ${monthLabel(latest)}`}
          value={fmtInt(conversions)}
          sub={<>Rate {fmtPct(L.visits > 0 ? (conversions / L.visits) * 100 : null, 2, false)} der Besuche</>}
          hint="Formular-Einsendungen + Newsletter-Anmeldungen"
        />
      </div>

      {/* Social → Web */}
      <Card className="p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-500">Social Media → Webseite</h2>
          <span className="text-xs text-primary-400">{periodLabel} · alle Webseiten</span>
        </div>
        <p className="mb-4 text-xs text-primary-400">
          Wie gut Social Media Besucher auf die Webseiten bringt: Web-Besuche aus der Quelle „Social“ im Verhältnis zu Views, Follower und Link-Klicks der Social-Media-Konten.
        </p>

        {!hasSocialVisits ? (
          <p className="border border-dashed border-primary-200 px-4 py-6 text-center text-sm text-primary-400">
            Trage bei den Traffic-Quellen den Wert „Social“ ein, um die Conversion zu sehen.
          </p>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <MiniStat label="Web-Besuche aus Social" value={fmtInt(conv.totals.socialVisits)} />
              <MiniStat label="Anteil am Web-Traffic" value={fmtPct(conv.totals.socialShare, 1, false)} hint="Social-Besuche / alle Besuche" />
              <MiniStat label="Besuche pro 1'000 Views" value={fmtRate(conv.totals.per1kViews)} hint="Web-Besuche aus Social pro 1'000 Social-Views — die zentrale Conversion-Rate" />
              <MiniStat label="Besuche / Monat pro 1'000 Follower" value={fmtRate(conv.totals.per1kFollowers, 1)} hint="Durchschnitt der Monate" />
              <MiniStat label="Link-Klick → Besuch" value={fmtPct(conv.totals.clickToVisit, 0, false)} hint="Web-Besuche aus Social / Link-Klicks auf Social Media (über 100% = Besucher kommen auch ohne erfassten Link-Klick, z. B. über Stories oder Profil-Links)" />
            </div>
            <SocialConversionChart months={conv.months} />

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-primary-100 bg-primary-50/50 text-xs text-primary-400">
                    <th className="px-3 py-2 text-left font-medium">Plattform</th>
                    <th className="px-3 py-2 text-right font-medium">Web-Besuche</th>
                    <th className="px-3 py-2 text-right font-medium">Anteil</th>
                    <th className="px-3 py-2 text-right font-medium">Views</th>
                    <th className="px-3 py-2 text-right font-medium" title="Web-Besuche pro 1'000 Views dieser Plattform">pro 1'000 Views</th>
                    <th className="px-3 py-2 text-right font-medium">Follower</th>
                    <th className="px-3 py-2 text-right font-medium" title="Web-Besuche pro Monat pro 1'000 Follower">/ Mt. pro 1'000 Follower</th>
                    <th className="px-3 py-2 text-right font-medium">Link-Klick → Besuch</th>
                  </tr>
                </thead>
                <tbody>
                  {conv.platforms.map((p) => (
                    <tr key={p.platform} className={cn('border-b border-primary-50 last:border-0', p.webVisits === 0 && 'text-primary-300')}>
                      <td className="px-3 py-2"><span className="flex items-center gap-2"><PlatformDot platform={p.platform} />{p.label}</span></td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{p.webVisits > 0 ? fmtInt(p.webVisits) : '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {p.share != null && p.webVisits > 0 ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-14 bg-primary-50"><div className="h-full" style={{ width: `${p.share}%`, backgroundColor: p.color }} /></div>
                            <span className="w-10 tabular-nums text-primary-500">{fmtPct(p.share, 0, false)}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtCompact(p.views)}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{fmtRate(p.per1kViews)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtCompact(p.followers)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtRate(p.per1kFollowers, 1)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtPct(p.clickToVisit, 0, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!conv.hasPlatformSplit && (
                <p className="mt-2 text-xs text-amber-700">
                  Für die Auswertung pro Plattform unter „Monat erfassen“ → „Social-Besuche nach Plattform“ ausfüllen
                  (Squarespace: Traffic-Quellen → Social aufklappen; Wix: Traffic → Social).
                </p>
              )}
              <p className="mt-2 text-[11px] text-primary-400">
                Views, Follower und Link-Klicks stammen aus der Social-Media-Erfassung. Pro Plattform zählen nur Monate, in denen die Web-Besuche dieser Plattform erfasst sind.
              </p>
            </div>
          </>
        )}
      </Card>

      {/* Traffic per site */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-500">Pro Webseite</h2>
            <Select options={SITE_METRIC_OPTIONS} value={siteMetric} onChange={(e) => setSiteMetric(e.target.value as SiteMetric)} className="w-64" />
          </div>
          <SiteMetricChart stats={web} sites={sites} value={siteValue(siteMetric)} />
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-500">Traffic-Quellen</h2>
            <Select
              options={[{ value: 'all', label: 'Alle Webseiten' }, ...sites.map((s) => ({ value: s.id, label: s.domain }))]}
              value={sourceSite}
              onChange={(e) => setSourceSite(e.target.value)}
              className="w-52"
            />
          </div>
          <SourceMixChart stats={web} siteId={sourceSite} />
        </Card>
      </div>

      {/* Site comparison */}
      <Card className="overflow-hidden">
        <div className="border-b border-primary-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-500">Webseiten-Vergleich · {monthLabel(latest, true)}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-primary-100 bg-primary-50/50 text-xs text-primary-400">
                <th className="px-4 py-2 text-left font-medium">Webseite</th>
                <th className="px-3 py-2 text-right font-medium">Besucher</th>
                <th className="px-3 py-2 text-right font-medium">Δ VM</th>
                <th className="px-3 py-2 text-right font-medium">Δ VJ</th>
                <th className="px-3 py-2 text-right font-medium">Besucher {periodLabel}</th>
                <th className="px-3 py-2 text-right font-medium">Seiten/Besuch</th>
                <th className="px-3 py-2 text-right font-medium">Absprung</th>
                <th className="px-3 py-2 text-right font-medium">Ø Dauer</th>
                <th className="px-3 py-2 text-right font-medium">Social-Anteil</th>
                <th className="px-4 py-2 text-right font-medium">Conv.-Rate</th>
              </tr>
            </thead>
            <tbody>
              {web.sites.map((s, i) => (
                <tr key={s.site.id} className="border-b border-primary-50 last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2 text-primary-800">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SITE_COLORS[i % SITE_COLORS.length] }} />
                      {s.site.domain}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium tabular-nums">{fmtInt(s.last?.unique_visitors)}</td>
                  <td className="px-3 py-2.5 text-right text-xs"><Delta pct={s.visitorsDeltaPct} /></td>
                  <td className="px-3 py-2.5 text-right text-xs"><Delta pct={s.visitorsYoYPct} /></td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {fmtInt(s.periodVisitors)}
                    {s.prevPeriodVisitors != null && <span className="ml-1 text-xs"><Delta pct={pctChange(s.periodVisitors, s.prevPeriodVisitors)} /></span>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtRate(s.pagesPerVisit)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(s.last?.bounce_rate, 1, false)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtDuration(s.last?.avg_visit_duration)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(s.socialShare, 1, false)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmtPct(s.conversionRate, 2, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* History */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-primary-500">Verlauf</h2>
          <Select options={sites.map((s) => ({ value: s.id, label: s.domain }))} value={historySite || sites[0]?.id} onChange={(e) => setHistorySite(e.target.value)} className="w-52" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-primary-100 bg-primary-50/50 text-xs text-primary-400">
                <th className="px-4 py-2 text-left font-medium">Monat</th>
                {WEB_METRICS.filter((m) => m.group !== 'sources').map((m) => <th key={m.key} className="px-3 py-2 text-right font-medium">{m.short}</th>)}
                <th className="px-3 py-2 text-right font-medium">Social</th>
                <th className="px-3 py-2 text-left font-medium">Notiz</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {historyRows.map((r) => (
                <tr key={r.id} className="group border-b border-primary-50 last:border-0 hover:bg-primary-50/40">
                  <td className="px-4 py-2 text-primary-800">{monthLabel(toMonthKey(r.month), true)}</td>
                  {WEB_METRICS.filter((m) => m.group !== 'sources').map((m) => (
                    <td key={m.key} className="px-3 py-2 text-right tabular-nums text-primary-700">
                      {m.kind === 'duration' ? fmtDuration(r[m.key]) : m.kind === 'percent' ? fmtPct(r[m.key], 1, false) : fmtInt(r[m.key])}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right tabular-nums text-primary-700">{fmtInt(r.source_social)}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-xs text-primary-400" title={r.notes ?? ''}>{r.notes}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => onGoToEntry(toMonthKey(r.month))} className="rounded p-1 text-primary-400 hover:bg-primary-100 hover:text-primary-600" title="Monat bearbeiten">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.293-6.293a1 1 0 011.414 0l1.586 1.586a1 1 0 010 1.414L12 16H9v-3z" /></svg>
                      </button>
                      <button onClick={() => setConfirmId(r.id)} className="rounded p-1 text-red-300 hover:bg-red-50 hover:text-red-500" title="Eintrag löschen">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a1 1 0 00-1 1v1h6V4a1 1 0 00-1-1m-4 0h4" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {historyRows.length === 0 && (
                <tr><td colSpan={12} className="px-4 py-6 text-center text-sm text-primary-300">Keine Einträge für diese Webseite</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={confirmId != null}
        onClose={() => setConfirmId(null)}
        onConfirm={async () => { if (confirmId) await onDeleteMetric(confirmId); setConfirmId(null); }}
        title="Eintrag löschen"
        message="Alle Zahlen dieser Webseite für diesen Monat werden gelöscht."
        confirmLabel="Löschen"
        variant="danger"
      />
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-primary-100 bg-primary-50/40 px-3 py-2.5" title={hint}>
      <p className="text-[11px] text-primary-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-primary-900">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Website management (Konten tab)
// ---------------------------------------------------------------------------

export function WebsitesManager({ sites, metrics, onCreate, onUpdate, onDelete }: {
  sites: WebsiteRow[];
  metrics: WebsiteMetricRow[];
  onCreate: (s: { domain: string; url: string | null }) => Promise<boolean>;
  onUpdate: (id: string, u: Partial<WebsiteRow>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [domain, setDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<WebsiteRow | null>(null);
  const countFor = (id: string) => metrics.filter((m) => m.website_id === id).length;

  async function add() {
    const d = domain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!d) return;
    setAdding(true);
    const ok = await onCreate({ domain: d, url: `https://${d}` });
    setAdding(false);
    if (ok) setDomain('');
  }

  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-500">Webseiten</h2>
      <div className="mb-4 space-y-1">
        {sites.map((s, i) => (
          <div key={s.id} className={cn('flex items-center gap-3 border-b border-primary-50 py-2 last:border-0', !s.is_active && 'opacity-50')}>
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: SITE_COLORS[i % SITE_COLORS.length] }} />
            <a href={s.url ?? `https://${s.domain}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-primary-800 hover:underline">{s.domain}</a>
            <span className="text-xs tabular-nums text-primary-400">{countFor(s.id)} Monate</span>
            <label className="flex items-center gap-1.5 text-xs text-primary-500" title="Inaktive Webseiten erscheinen nicht mehr in der Monatserfassung">
              <input type="checkbox" checked={s.is_active} onChange={(e) => onUpdate(s.id, { is_active: e.target.checked })} />
              Aktiv
            </label>
            <button onClick={() => setConfirm(s)} className="rounded p-1 text-red-300 hover:bg-red-50 hover:text-red-500" title="Webseite löschen">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0a1 1 0 00-1 1v1h6V4a1 1 0 00-1-1m-4 0h4" /></svg>
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Input label="Weitere Webseite" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="beispiel.com" onKeyDown={(e) => e.key === 'Enter' && add()} />
        </div>
        <Button variant="secondary" onClick={add} loading={adding} disabled={!domain.trim()}>Hinzufügen</Button>
      </div>

      <ConfirmDialog
        isOpen={confirm != null}
        onClose={() => setConfirm(null)}
        onConfirm={async () => { if (confirm) await onDelete(confirm.id); setConfirm(null); }}
        title="Webseite löschen"
        message={confirm ? `${confirm.domain} und alle ${countFor(confirm.id)} erfassten Monate werden endgültig gelöscht. Nur nicht mehr pflegen? Dann besser „Aktiv“ abwählen.` : ''}
        confirmLabel="Endgültig löschen"
        variant="danger"
      />
    </Card>
  );
}
