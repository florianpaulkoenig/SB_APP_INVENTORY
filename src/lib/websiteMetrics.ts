// ---------------------------------------------------------------------------
// Website Tracker — metric metadata, parsing and statistics, plus the
// social → web conversion that joins website traffic with social figures.
// Pure functions; month keys are 'YYYY-MM' like in socialMedia.ts.
// ---------------------------------------------------------------------------

import type {
  WebsiteRow,
  WebsiteMetricRow,
  WebsiteMetricValues,
  SocialMediaAccountRow,
  SocialMediaPlatform,
} from '../types/database';
import { monthRange, addMonths, toMonthKey, PLATFORMS, type SocialStats } from './socialMedia';

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export type WebMetricKey = Exclude<keyof WebsiteMetricValues, 'social_by_platform'>;
export type WebMetricKind = 'count' | 'percent' | 'duration';

export interface WebMetricMeta {
  key: WebMetricKey;
  label: string;
  short: string;
  kind: WebMetricKind;
  group: 'traffic' | 'engagement' | 'conversion' | 'sources';
  hint?: string;
}

export const WEB_METRICS: WebMetricMeta[] = [
  { key: 'unique_visitors',    label: 'Besucher (eindeutig)', short: 'Besucher',   kind: 'count',    group: 'traffic' },
  { key: 'visits',             label: 'Besuche',              short: 'Besuche',    kind: 'count',    group: 'traffic' },
  { key: 'pageviews',          label: 'Seitenaufrufe',        short: 'Aufrufe',    kind: 'count',    group: 'traffic' },
  { key: 'bounce_rate',        label: 'Absprungrate',         short: 'Absprung',   kind: 'percent',  group: 'engagement', hint: 'in %, z. B. 58.4' },
  { key: 'avg_visit_duration', label: 'Ø Besuchsdauer',       short: 'Ø Dauer',    kind: 'duration', group: 'engagement', hint: 'm:ss, z. B. 1:45' },
  { key: 'form_submissions',   label: 'Formular-Einsendungen', short: 'Formulare', kind: 'count',    group: 'conversion', hint: 'Kontakt-/Anfrageformulare' },
  { key: 'newsletter_signups', label: 'Newsletter-Anmeldungen', short: 'Newsletter', kind: 'count',  group: 'conversion' },
  { key: 'source_direct',      label: 'Direkt',               short: 'Direkt',     kind: 'count',    group: 'sources' },
  { key: 'source_search',      label: 'Suche',                short: 'Suche',      kind: 'count',    group: 'sources' },
  { key: 'source_social',      label: 'Social',               short: 'Social',     kind: 'count',    group: 'sources' },
  { key: 'source_referral',    label: 'Verweise (Referral)',  short: 'Referral',   kind: 'count',    group: 'sources' },
  { key: 'source_email',       label: 'E-Mail',               short: 'E-Mail',     kind: 'count',    group: 'sources' },
  { key: 'source_other',       label: 'Andere / KI',          short: 'Andere',     kind: 'count',    group: 'sources' },
];

export const WEB_GROUPS: { key: WebMetricMeta['group']; label: string; hint?: string }[] = [
  { key: 'traffic',    label: 'Traffic' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'conversion', label: 'Conversions' },
  { key: 'sources',    label: 'Traffic-Quellen', hint: 'Besuche nach Quelle' },
];

export const SOURCE_KEYS = WEB_METRICS.filter((m) => m.group === 'sources').map((m) => m.key);

export const SOURCE_COLORS: Record<string, string> = {
  source_direct:   '#6B7280',
  source_search:   '#2563EB',
  source_social:   '#DB2777',
  source_referral: '#F97316',
  source_email:    '#14B8A6',
  source_other:    '#A78BFA',
};

export const SITE_COLORS = ['#1c1510', '#B08D57', '#2563EB', '#14B8A6'];

// ---------------------------------------------------------------------------
// Parsing & formatting
// ---------------------------------------------------------------------------

/** '1:45' → 105, '95' → 95, '1m 20s' → 80, '2m' → 120 */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;
  const colon = s.match(/^(\d+):([0-5]?\d)$/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);
  const unit = s.match(/^(?:(\d+)\s*m(?:in)?)?\s*(?:(\d+)\s*s(?:ek|ec)?)?$/);
  if (unit && (unit[1] || unit[2])) return Number(unit[1] ?? 0) * 60 + Number(unit[2] ?? 0);
  return /^\d+$/.test(s) ? Number(s) : null;
}

/** '58.4' | '58,4' | '58.4%' → 58.4 (0–100) */
export function parsePercent(input: string): number | null {
  const s = input.trim().replace('%', '').replace(',', '.').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? Math.round(n * 100) / 100 : null;
}

export function fmtDuration(sec: number | null | undefined): string {
  if (sec == null) return '—';
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Website statistics
// ---------------------------------------------------------------------------

export interface WebMonth {
  month: string;
  unique_visitors: number;
  visits: number;
  pageviews: number;
  /** Visit-weighted over the sites that report it */
  bounce_rate: number | null;
  avg_visit_duration: number | null;
  form_submissions: number;
  newsletter_signups: number;
  sources: Record<string, number>;
  bySite: Record<string, WebsiteMetricRow | undefined>;
  hasData: boolean;
}

export interface WebSiteSummary {
  site: WebsiteRow;
  last: WebsiteMetricRow | null;
  visitorsDeltaPct: number | null;       // vs previous month
  visitorsYoYPct: number | null;         // vs same month last year
  periodVisitors: number;
  prevPeriodVisitors: number | null;     // same-length window before
  pagesPerVisit: number | null;
  conversionRate: number | null;         // (forms + newsletter) / visits, %
  socialShare: number | null;            // source_social / visits, %
}

export interface WebStats {
  months: string[];
  series: WebMonth[];
  sites: WebSiteSummary[];
  last: WebMonth;
  prev: WebMonth | null;
  yearAgo: WebMonth | null;
  periodVisits: number;
  prevPeriodVisits: number | null;
}

const pct = (a: number, b: number): number | null => (b > 0 ? ((a - b) / b) * 100 : null);
const sumOf = (vals: (number | null | undefined)[]) => vals.reduce<number>((s, v) => s + (v ?? 0), 0);

function aggregateMonth(month: string, sites: WebsiteRow[], rows: Map<string, WebsiteMetricRow>): WebMonth {
  const bySite: Record<string, WebsiteMetricRow | undefined> = {};
  for (const s of sites) bySite[s.id] = rows.get(`${s.id}|${month}`);
  const present = Object.values(bySite).filter((r): r is WebsiteMetricRow => !!r);

  const weighted = (key: 'bounce_rate' | 'avg_visit_duration'): number | null => {
    let w = 0; let sum = 0; let plain = 0; let n = 0;
    for (const r of present) {
      const v = r[key];
      if (v == null) continue;
      plain += v; n++;
      if (r.visits) { sum += v * r.visits; w += r.visits; }
    }
    if (w > 0) return sum / w;
    return n > 0 ? plain / n : null;
  };

  const sources: Record<string, number> = {};
  for (const k of SOURCE_KEYS) sources[k] = sumOf(present.map((r) => r[k]));

  return {
    month,
    unique_visitors: sumOf(present.map((r) => r.unique_visitors)),
    visits: sumOf(present.map((r) => r.visits)),
    pageviews: sumOf(present.map((r) => r.pageviews)),
    bounce_rate: weighted('bounce_rate'),
    avg_visit_duration: weighted('avg_visit_duration'),
    form_submissions: sumOf(present.map((r) => r.form_submissions)),
    newsletter_signups: sumOf(present.map((r) => r.newsletter_signups)),
    sources,
    bySite,
    hasData: present.length > 0,
  };
}

export function latestWebMonth(metrics: Pick<WebsiteMetricRow, 'month'>[]): string | null {
  return metrics.reduce<string | null>((m, r) => (!m || toMonthKey(r.month) > m ? toMonthKey(r.month) : m), null);
}

export function earliestWebMonth(metrics: Pick<WebsiteMetricRow, 'month'>[]): string | null {
  return metrics.reduce<string | null>((m, r) => (!m || toMonthKey(r.month) < m ? toMonthKey(r.month) : m), null);
}

export function computeWebStats(sites: WebsiteRow[], metrics: WebsiteMetricRow[], from: string, to: string): WebStats {
  const rows = new Map<string, WebsiteMetricRow>();
  for (const r of metrics) rows.set(`${r.website_id}|${toMonthKey(r.month)}`, r);

  const months = monthRange(from, to);
  const series = months.map((m) => aggregateMonth(m, sites, rows));
  const last = series[series.length - 1];
  const prev = series.length > 1 ? series[series.length - 2] : aggregateMonth(addMonths(to, -1), sites, rows);
  const yearAgoMonth = aggregateMonth(addMonths(to, -12), sites, rows);

  const n = months.length;
  const prevWindow = monthRange(addMonths(from, -n), addMonths(from, -1)).map((m) => aggregateMonth(m, sites, rows));
  const prevHasData = prevWindow.some((m) => m.hasData);

  const summaries: WebSiteSummary[] = sites.map((site) => {
    const lastRow = rows.get(`${site.id}|${to}`) ?? null;
    const prevRow = rows.get(`${site.id}|${addMonths(to, -1)}`);
    const yoyRow = rows.get(`${site.id}|${addMonths(to, -12)}`);
    const periodVisitors = sumOf(months.map((m) => rows.get(`${site.id}|${m}`)?.unique_visitors));
    const prevRows = prevWindow.map((m) => m.bySite[site.id]).filter(Boolean);
    const conv = lastRow && lastRow.visits
      ? (((lastRow.form_submissions ?? 0) + (lastRow.newsletter_signups ?? 0)) / lastRow.visits) * 100
      : null;
    return {
      site,
      last: lastRow,
      visitorsDeltaPct: lastRow?.unique_visitors != null && prevRow?.unique_visitors != null ? pct(lastRow.unique_visitors, prevRow.unique_visitors) : null,
      visitorsYoYPct: lastRow?.unique_visitors != null && yoyRow?.unique_visitors != null ? pct(lastRow.unique_visitors, yoyRow.unique_visitors) : null,
      periodVisitors,
      prevPeriodVisitors: prevRows.length > 0 ? sumOf(prevRows.map((r) => r!.unique_visitors)) : null,
      pagesPerVisit: lastRow?.pageviews != null && lastRow.visits ? lastRow.pageviews / lastRow.visits : null,
      conversionRate: lastRow?.form_submissions != null || lastRow?.newsletter_signups != null ? conv : null,
      socialShare: lastRow?.source_social != null && lastRow.visits ? (lastRow.source_social / lastRow.visits) * 100 : null,
    };
  });

  return {
    months,
    series,
    sites: summaries,
    last,
    prev: prev.hasData ? prev : null,
    yearAgo: yearAgoMonth.hasData ? yearAgoMonth : null,
    periodVisits: sumOf(series.map((m) => m.visits)),
    prevPeriodVisits: prevHasData ? sumOf(prevWindow.map((m) => m.visits)) : null,
  };
}

// ---------------------------------------------------------------------------
// Social → Web conversion
// ---------------------------------------------------------------------------

export interface ConversionMonth {
  month: string;
  /** Website visits attributed to social (source_social, all sites) */
  socialVisits: number | null;
  socialViews: number | null;
  linkClicks: number | null;
  followers: number | null;
  /** Web visits per 1'000 social views */
  per1kViews: number | null;
  /** Web visits per 1'000 followers */
  per1kFollowers: number | null;
  /** Web visits / link clicks, % */
  clickToVisit: number | null;
  /** Social visits / all visits, % */
  socialShare: number | null;
}

export interface PlatformConversion {
  platform: SocialMediaPlatform;
  label: string;
  color: string;
  webVisits: number;
  views: number | null;
  linkClicks: number | null;
  followers: number | null;
  per1kViews: number | null;
  per1kFollowers: number | null;
  clickToVisit: number | null;
  /** Share of all platform-attributed social visits, % */
  share: number | null;
}

export interface SocialToWeb {
  months: ConversionMonth[];
  platforms: PlatformConversion[];
  totals: Omit<ConversionMonth, 'month'>;
  /** True when at least one month has visits split by platform */
  hasPlatformSplit: boolean;
}

const rate = (num: number | null, den: number | null, factor: number): number | null =>
  num != null && den != null && den > 0 ? (num / den) * factor : null;

/**
 * Joins website traffic with the social statistics over the same window.
 * `social` must be computed for the same [from, to] as `web`.
 */
export function computeSocialToWeb(
  web: WebStats,
  webMetrics: WebsiteMetricRow[],
  social: SocialStats,
  accounts: SocialMediaAccountRow[],
): SocialToWeb {
  const windowMonths = new Set(web.months);
  const socialByMonth = new Map(social.series.map((m) => [m.month, m]));

  const months: ConversionMonth[] = web.series.map((w) => {
    const s = socialByMonth.get(w.month);
    const socialVisits = w.hasData && Object.values(w.bySite).some((r) => r?.source_social != null) ? w.sources.source_social : null;
    const anyViews = s && Object.values(s.byAccount).some((a) => a.flow.views != null);
    const anyClicks = s && Object.values(s.byAccount).some((a) => a.flow.link_clicks != null);
    const socialViews = anyViews ? s!.flow.views : null;
    const linkClicks = anyClicks ? s!.flow.link_clicks : null;
    const followers = s && s.followers > 0 ? s.followers : null;
    return {
      month: w.month,
      socialVisits,
      socialViews,
      linkClicks,
      followers,
      per1kViews: rate(socialVisits, socialViews, 1000),
      per1kFollowers: rate(socialVisits, followers, 1000),
      clickToVisit: rate(socialVisits, linkClicks, 100),
      socialShare: rate(socialVisits, w.visits || null, 100),
    };
  });

  // Totals over the window — rates only over months where both sides exist,
  // so a month without social figures does not dilute the ratio
  const pairSum = (a: keyof ConversionMonth, b: keyof ConversionMonth) => {
    let num = 0; let den = 0; let any = false;
    for (const m of months) {
      const x = m[a] as number | null; const y = m[b] as number | null;
      if (x != null && y != null) { num += x; den += y; any = true; }
    }
    return any ? { num, den } : null;
  };
  const ratioOf = (a: keyof ConversionMonth, b: keyof ConversionMonth, f: number) => {
    const p = pairSum(a, b);
    return p ? rate(p.num, p.den, f) : null;
  };
  const lastWithFollowers = [...months].reverse().find((m) => m.followers != null);
  const totalVisits = sumOf(web.series.map((m) => m.visits));
  const socialVisitsTotal = months.some((m) => m.socialVisits != null) ? sumOf(months.map((m) => m.socialVisits)) : null;

  const totals: Omit<ConversionMonth, 'month'> = {
    socialVisits: socialVisitsTotal,
    socialViews: months.some((m) => m.socialViews != null) ? sumOf(months.map((m) => m.socialViews)) : null,
    linkClicks: months.some((m) => m.linkClicks != null) ? sumOf(months.map((m) => m.linkClicks)) : null,
    followers: lastWithFollowers?.followers ?? null,
    per1kViews: ratioOf('socialVisits', 'socialViews', 1000),
    // Monthly average of visits per 1'000 followers
    per1kFollowers: (() => {
      const vals = months.map((m) => m.per1kFollowers).filter((v): v is number => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    })(),
    clickToVisit: ratioOf('socialVisits', 'linkClicks', 100),
    socialShare: rate(socialVisitsTotal, totalVisits || null, 100),
  };

  // Per platform: web visits from social_by_platform vs that platform's accounts
  const visitsByPlatform = new Map<SocialMediaPlatform, number>();
  const monthsByPlatform = new Map<SocialMediaPlatform, Set<string>>();
  let hasPlatformSplit = false;
  for (const r of webMetrics) {
    const month = toMonthKey(r.month);
    if (!windowMonths.has(month)) continue;
    for (const [k, v] of Object.entries(r.social_by_platform ?? {})) {
      if (v == null) continue;
      hasPlatformSplit = true;
      const key = k as SocialMediaPlatform;
      visitsByPlatform.set(key, (visitsByPlatform.get(key) ?? 0) + v);
      if (!monthsByPlatform.has(key)) monthsByPlatform.set(key, new Set());
      monthsByPlatform.get(key)!.add(month);
    }
  }
  const splitTotal = [...visitsByPlatform.values()].reduce((a, b) => a + b, 0);
  const lastMonth = social.series[social.series.length - 1];

  const platforms: PlatformConversion[] = PLATFORMS.map((p) => {
    const accs = accounts.filter((a) => a.platform === p.key);
    const webVisits = visitsByPlatform.get(p.key) ?? 0;
    // Views/clicks only from months where this platform's web visits were
    // entered — otherwise months without a split would dilute the rate
    const entered = monthsByPlatform.get(p.key) ?? new Set<string>();
    let views: number | null = null;
    let clicks: number | null = null;
    for (const m of social.series) {
      if (!entered.has(m.month)) continue;
      for (const a of accs) {
        const am = m.byAccount[a.id];
        if (!am) continue;
        if (am.flow.views != null) views = (views ?? 0) + am.flow.views;
        if (am.flow.link_clicks != null) clicks = (clicks ?? 0) + am.flow.link_clicks;
      }
    }
    const followers = lastMonth
      ? accs.reduce<number | null>((s, a) => {
          const f = lastMonth.byAccount[a.id]?.followers;
          return f != null ? (s ?? 0) + f : s;
        }, null)
      : null;
    const monthsCount = Math.max(1, entered.size);
    return {
      platform: p.key,
      label: p.label,
      color: p.color,
      webVisits,
      views,
      linkClicks: clicks,
      followers,
      per1kViews: webVisits > 0 ? rate(webVisits, views, 1000) : null,
      // Visits per month per 1'000 followers, averaged over the entered months
      per1kFollowers: webVisits > 0 && followers ? (webVisits / monthsCount / followers) * 1000 : null,
      clickToVisit: webVisits > 0 ? rate(webVisits, clicks, 100) : null,
      share: splitTotal > 0 ? (webVisits / splitTotal) * 100 : null,
    };
  }).filter((p) => p.webVisits > 0 || accounts.some((a) => a.platform === p.platform && a.is_active));

  platforms.sort((a, b) => b.webVisits - a.webVisits);
  return { months, platforms, totals, hasPlatformSplit };
}
