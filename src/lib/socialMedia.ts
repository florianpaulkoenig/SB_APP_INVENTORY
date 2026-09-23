// ---------------------------------------------------------------------------
// Social Media Tracker — platform metadata, month maths and growth statistics.
// Pure functions only; the hook loads rows, the page renders what this returns.
//
// Month keys are plain 'YYYY-MM' strings (DB stores 'YYYY-MM-01'). They are
// built from calendar parts, never via toISOString(), which would shift the
// date by a day in CET/CEST.
// ---------------------------------------------------------------------------

import type {
  SocialMediaAccountRow,
  SocialMediaMetricRow,
  SocialMediaPlatform,
} from '../types/database';

// ---------------------------------------------------------------------------
// Platforms
// ---------------------------------------------------------------------------

export interface PlatformMeta {
  key: SocialMediaPlatform;
  label: string;
  /** Chart colour — chosen for separability first, brand likeness second */
  color: string;
  /** What the platform calls its audience */
  audience: string;
}

export const PLATFORMS: PlatformMeta[] = [
  { key: 'instagram', label: 'Instagram', color: '#DB2777', audience: 'Follower' },
  { key: 'facebook',  label: 'Facebook',  color: '#2563EB', audience: 'Follower' },
  { key: 'tiktok',    label: 'TikTok',    color: '#14B8A6', audience: 'Follower' },
  { key: 'threads',   label: 'Threads',   color: '#7C3AED', audience: 'Follower' },
  { key: 'x',         label: 'X',         color: '#111827', audience: 'Follower' },
  { key: 'linkedin',  label: 'LinkedIn',  color: '#1E3A8A', audience: 'Follower' },
  { key: 'rednote',   label: 'RedNote',   color: '#F97316', audience: 'Follower' },
  { key: 'youtube',   label: 'YouTube',   color: '#DC2626', audience: 'Abonnenten' },
  { key: 'snapchat',  label: 'Snapchat',  color: '#EAB308', audience: 'Abonnenten' },
  { key: 'bluesky',   label: 'Bluesky',   color: '#38BDF8', audience: 'Follower' },
];

export const PLATFORM_MAP: Record<SocialMediaPlatform, PlatformMeta> =
  Object.fromEntries(PLATFORMS.map((p) => [p.key, p])) as Record<SocialMediaPlatform, PlatformMeta>;

export function accountLabel(a: Pick<SocialMediaAccountRow, 'platform' | 'handle'>): string {
  const p = PLATFORM_MAP[a.platform]?.label ?? a.platform;
  return a.handle ? `${p} · ${a.handle}` : p;
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export type MetricKey =
  | 'followers' | 'posts' | 'views' | 'reach' | 'impressions'
  | 'likes' | 'comments' | 'shares' | 'saves' | 'profile_visits' | 'link_clicks';

export interface MetricMeta {
  key: MetricKey;
  label: string;
  short: string;
  /** Shown in the entry grid without expanding "alle Kennzahlen" */
  core: boolean;
  hint: string;
}

export const METRICS: MetricMeta[] = [
  { key: 'followers',      label: 'Follower / Abonnenten', short: 'Follower',   core: true,  hint: 'Stand am Monatsende' },
  { key: 'posts',          label: 'Beiträge',              short: 'Posts',      core: true,  hint: 'Im Monat veröffentlicht' },
  { key: 'views',          label: 'Video-/Beitragsaufrufe', short: 'Views',     core: true,  hint: 'Im Monat' },
  { key: 'likes',          label: 'Likes',                 short: 'Likes',      core: true,  hint: 'Im Monat erhalten' },
  { key: 'comments',       label: 'Kommentare',            short: 'Komm.',      core: true,  hint: 'Im Monat erhalten' },
  { key: 'shares',         label: 'Shares / Reposts',      short: 'Shares',     core: true,  hint: 'Im Monat' },
  { key: 'saves',          label: 'Gespeichert',           short: 'Saves',      core: false, hint: 'Im Monat' },
  { key: 'reach',          label: 'Reichweite (Konten)',   short: 'Reichweite', core: false, hint: 'Erreichte Konten im Monat' },
  { key: 'impressions',    label: 'Impressionen',          short: 'Impr.',      core: false, hint: 'Im Monat' },
  { key: 'profile_visits', label: 'Profilbesuche',         short: 'Profil',     core: false, hint: 'Im Monat' },
  { key: 'link_clicks',    label: 'Link-Klicks',           short: 'Klicks',     core: false, hint: 'Im Monat' },
];

/** Flow metrics = everything but followers (summed per month, never carried) */
export const FLOW_METRICS = METRICS.filter((m) => m.key !== 'followers').map((m) => m.key) as Exclude<MetricKey, 'followers'>[];
export type FlowMetricKey = (typeof FLOW_METRICS)[number];

const ENGAGEMENT_KEYS: FlowMetricKey[] = ['likes', 'comments', 'shares', 'saves'];

/** likes + comments + shares + saves; null when none of them was entered */
export function engagementOf(m: Partial<Record<MetricKey, number | null>>): number | null {
  let sum = 0;
  let any = false;
  for (const k of ENGAGEMENT_KEYS) {
    const v = m[k];
    if (v != null) { sum += v; any = true; }
  }
  return any ? sum : null;
}

// ---------------------------------------------------------------------------
// Month keys
// ---------------------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');

export function currentMonthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** 'YYYY-MM-DD' | 'YYYY-MM' → 'YYYY-MM' */
export function toMonthKey(date: string): string {
  return date.slice(0, 7);
}

/** 'YYYY-MM' → 'YYYY-MM-01' (DB value) */
export function monthStart(key: string): string {
  return `${key}-01`;
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

export function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty * 12 + tm) - (fy * 12 + fm);
}

/** Inclusive list of month keys from → to */
export function monthRange(from: string, to: string): string[] {
  const n = monthDiff(from, to);
  return n < 0 ? [] : Array.from({ length: n + 1 }, (_, i) => addMonths(from, i));
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONTH_NAMES_LONG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/** 'YYYY-MM' → "Sep '26" (short) or "September 2026" (long) */
export function monthLabel(key: string, long = false): string {
  const [y, m] = key.split('-').map(Number);
  return long ? `${MONTH_NAMES_LONG[m - 1]} ${y}` : `${MONTH_NAMES[m - 1]} '${String(y).slice(2)}`;
}

/** Period choices for the statistics views ('all' = whole history) */
export const PERIODS = [
  { value: '3', label: 'Letzte 3 Monate' },
  { value: '6', label: 'Letzte 6 Monate' },
  { value: '12', label: 'Letzte 12 Monate' },
  { value: '24', label: 'Letzte 24 Monate' },
  { value: 'all', label: 'Gesamter Zeitraum' },
];

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export interface AccountMonth {
  /** Entered value, null when this month has no followers figure */
  followersRaw: number | null;
  /** Last known follower count up to this month (carried forward), null before the first entry */
  followers: number | null;
  /** Change vs the previous month's carried value; null when there is nothing to compare */
  netNew: number | null;
  flow: Record<FlowMetricKey, number | null>;
  engagement: number | null;
}

export interface MonthTotals {
  month: string;
  followers: number;
  netNew: number;
  engagement: number;
  flow: Record<FlowMetricKey, number>;
  byAccount: Record<string, AccountMonth>;
}

export interface AccountSummary {
  account: SocialMediaAccountRow;
  followers: number | null;
  deltaMonth: number | null;
  deltaMonthPct: number | null;
  deltaPeriod: number | null;
  deltaPeriodPct: number | null;
  /** Compound monthly growth rate over the period, in % */
  cmgr: number | null;
  views: number | null;
  engagement: number | null;
  /** Engagement in the last month / followers, in % */
  engagementRate: number | null;
  /** Share of all followers in the last month, in % */
  share: number | null;
  /** True when the last month of the window has no entry for this account */
  missingLast: boolean;
}

export interface SocialStats {
  months: string[];
  series: MonthTotals[];
  accounts: AccountSummary[];
  kpis: {
    followers: number;
    deltaMonth: number | null;
    deltaMonthPct: number | null;
    deltaPeriod: number | null;
    deltaPeriodPct: number | null;
    cmgr: number | null;
    views: number;
    viewsPrev: number | null;
    engagement: number;
    engagementPrev: number | null;
    engagementRate: number | null;
    netNewAvg: number | null;
  };
}

const pct = (delta: number, base: number): number | null => (base > 0 ? (delta / base) * 100 : null);

const emptyFlow = <T,>(v: T) =>
  Object.fromEntries(FLOW_METRICS.map((k) => [k, v])) as Record<FlowMetricKey, T>;

/** Latest month that has any entry (or null when there is no data at all) */
export function latestDataMonth(metrics: Pick<SocialMediaMetricRow, 'month'>[]): string | null {
  let max: string | null = null;
  for (const m of metrics) {
    const k = toMonthKey(m.month);
    if (!max || k > max) max = k;
  }
  return max;
}

export function earliestDataMonth(metrics: Pick<SocialMediaMetricRow, 'month'>[]): string | null {
  let min: string | null = null;
  for (const m of metrics) {
    const k = toMonthKey(m.month);
    if (!min || k < min) min = k;
  }
  return min;
}

/**
 * Growth statistics for the window [from, to] (inclusive month keys).
 *
 * Follower counts are carried forward: a month without an entry keeps the last
 * known value, so a forgotten entry does not show up as a sudden drop in the
 * total. History before `from` is used for the carry and as the growth
 * baseline (the value at the month before the window).
 */
export function computeSocialStats(
  accounts: SocialMediaAccountRow[],
  metrics: SocialMediaMetricRow[],
  from: string,
  to: string,
): SocialStats {
  const months = monthRange(from, to);

  // account → month → row
  const byAcc = new Map<string, Map<string, SocialMediaMetricRow>>();
  for (const r of metrics) {
    let m = byAcc.get(r.account_id);
    if (!m) { m = new Map(); byAcc.set(r.account_id, m); }
    m.set(toMonthKey(r.month), r);
  }

  // Carried follower count at the month *before* the window, per account
  const baselineMonth = addMonths(from, -1);
  const carryAt = (accountId: string, month: string): number | null => {
    const rows = byAcc.get(accountId);
    if (!rows) return null;
    let best: string | null = null;
    let value: number | null = null;
    for (const [k, r] of rows) {
      if (k <= month && r.followers != null && (!best || k > best)) { best = k; value = r.followers; }
    }
    return value;
  };

  const perAccount = new Map<string, AccountMonth[]>();
  for (const a of accounts) {
    const rows = byAcc.get(a.id);
    let carried = carryAt(a.id, baselineMonth);
    const list: AccountMonth[] = [];
    for (const month of months) {
      const r = rows?.get(month);
      const prev = carried;
      if (r?.followers != null) carried = r.followers;
      const flow = emptyFlow<number | null>(null);
      if (r) for (const k of FLOW_METRICS) flow[k] = r[k];
      list.push({
        followersRaw: r?.followers ?? null,
        followers: carried,
        netNew: prev != null && carried != null ? carried - prev : null,
        flow,
        engagement: r ? engagementOf(r) : null,
      });
    }
    perAccount.set(a.id, list);
  }

  const series: MonthTotals[] = months.map((month, i) => {
    const t: MonthTotals = { month, followers: 0, netNew: 0, engagement: 0, flow: emptyFlow(0), byAccount: {} };
    for (const a of accounts) {
      const am = perAccount.get(a.id)![i];
      t.byAccount[a.id] = am;
      t.followers += am.followers ?? 0;
      t.netNew += am.netNew ?? 0;
      t.engagement += am.engagement ?? 0;
      for (const k of FLOW_METRICS) t.flow[k] += am.flow[k] ?? 0;
    }
    return t;
  });

  const n = months.length;
  const last = series[n - 1];
  const prev = n > 1 ? series[n - 2] : null;

  // Baseline for period growth: carried value before the window, else first known in window
  const baselineOf = (accountId: string): { value: number; monthsSpan: number } | null => {
    const before = carryAt(accountId, baselineMonth);
    if (before != null) return { value: before, monthsSpan: n };
    const list = perAccount.get(accountId)!;
    const idx = list.findIndex((m) => m.followers != null);
    return idx >= 0 ? { value: list[idx].followers!, monthsSpan: n - 1 - idx } : null;
  };

  const cmgrOf = (start: number, end: number, span: number): number | null =>
    start > 0 && end > 0 && span > 0 ? (Math.pow(end / start, 1 / span) - 1) * 100 : null;

  const summaries: AccountSummary[] = accounts.map((account) => {
    const list = perAccount.get(account.id)!;
    const cur = list[n - 1];
    const before = n > 1 ? list[n - 2] : null;
    const followers = cur?.followers ?? null;
    const prevFollowers = before ? before.followers : carryAt(account.id, baselineMonth);
    const deltaMonth = followers != null && prevFollowers != null ? followers - prevFollowers : null;
    const base = baselineOf(account.id);
    const deltaPeriod = followers != null && base ? followers - base.value : null;
    return {
      account,
      followers,
      deltaMonth,
      deltaMonthPct: deltaMonth != null && prevFollowers != null ? pct(deltaMonth, prevFollowers) : null,
      deltaPeriod,
      deltaPeriodPct: deltaPeriod != null && base ? pct(deltaPeriod, base.value) : null,
      cmgr: followers != null && base ? cmgrOf(base.value, followers, base.monthsSpan) : null,
      views: cur?.flow.views ?? null,
      engagement: cur?.engagement ?? null,
      engagementRate: cur?.engagement != null && followers ? (cur.engagement / followers) * 100 : null,
      share: followers != null && last && last.followers > 0 ? (followers / last.followers) * 100 : null,
      missingLast: !byAcc.get(account.id)?.has(to),
    };
  });

  // Portfolio-level period growth: only accounts with a baseline, so a newly
  // added platform does not count as "growth" with its entire audience
  let periodStart = 0;
  let periodEnd = 0;
  for (const s of summaries) {
    const base = baselineOf(s.account.id);
    if (base && s.followers != null) { periodStart += base.value; periodEnd += s.followers; }
  }
  const deltaPeriod = periodStart > 0 ? periodEnd - periodStart : null;

  const prevTotalFollowers = prev ? prev.followers : summaries.reduce((acc, s) => acc + (carryAt(s.account.id, baselineMonth) ?? 0), 0);
  const deltaMonth = last ? last.netNew : null;
  const netNewMonths = series.slice(1);

  return {
    months,
    series,
    accounts: summaries,
    kpis: {
      followers: last?.followers ?? 0,
      deltaMonth,
      deltaMonthPct: deltaMonth != null ? pct(deltaMonth, prevTotalFollowers) : null,
      deltaPeriod,
      deltaPeriodPct: deltaPeriod != null ? pct(deltaPeriod, periodStart) : null,
      cmgr: deltaPeriod != null ? cmgrOf(periodStart, periodEnd, n) : null,
      views: last?.flow.views ?? 0,
      viewsPrev: prev ? prev.flow.views : null,
      engagement: last?.engagement ?? 0,
      engagementPrev: prev ? prev.engagement : null,
      engagementRate: last && last.followers > 0 ? (last.engagement / last.followers) * 100 : null,
      netNewAvg: netNewMonths.length > 0
        ? netNewMonths.reduce((acc, m) => acc + m.netNew, 0) / netNewMonths.length
        : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const intFmt = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 });
const compactFmt = new Intl.NumberFormat('de-CH', { notation: 'compact', maximumFractionDigits: 1 });

export function fmtInt(v: number | null | undefined): string {
  return v == null ? '—' : intFmt.format(v);
}

export function fmtCompact(v: number | null | undefined): string {
  return v == null ? '—' : compactFmt.format(v);
}

export function fmtSigned(v: number | null | undefined): string {
  if (v == null) return '—';
  return v > 0 ? `+${intFmt.format(v)}` : intFmt.format(v);
}

export function fmtPct(v: number | null | undefined, digits = 1, signed = true): string {
  if (v == null || !Number.isFinite(v)) return '—';
  const s = v.toFixed(digits);
  return signed && v > 0 ? `+${s}%` : `${s}%`;
}

/** Parse a user-typed count: accepts 12'345, 12.345, 12,345, 12 345, 1.2k, 3.4M */
export function parseCount(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/['’\s]/g, '');
  if (!s) return null;
  const suffix = s.match(/^([\d.,]+)(k|m|mio)$/);
  if (suffix) {
    const base = Number(suffix[1].replace(',', '.'));
    if (!Number.isFinite(base)) return null;
    return Math.round(base * (suffix[2] === 'k' ? 1_000 : 1_000_000));
  }
  // Without a suffix, . and , are thousands separators
  const digits = s.replace(/[.,]/g, '');
  return /^\d+$/.test(digits) ? Number(digits) : null;
}
