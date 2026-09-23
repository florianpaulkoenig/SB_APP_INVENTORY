// Grid state helpers for the website entry grid (string cells ⇄ DB values)

import {
  PLATFORMS, fmtInt, parseCount,
} from '../../lib/socialMedia';
import {
  WEB_METRICS, parseDuration, parsePercent, fmtDuration,
  type WebMetricKey, type WebMetricMeta,
} from '../../lib/websiteMetrics';
import type {
  WebsiteMetricRow, SocialMediaAccountRow, SocialMediaPlatform,
} from '../../types/database';
import type { WebMonthEntry } from '../../hooks/useWebsites';

export type WebGridRow = Record<WebMetricKey, string> & {
  notes: string;
  social: Partial<Record<SocialMediaPlatform, string>>;
};

export function formatValue(meta: WebMetricMeta, v: number | null): string {
  if (v == null) return '';
  if (meta.kind === 'duration') return fmtDuration(v);
  if (meta.kind === 'percent') return String(v);
  return fmtInt(v);
}

export function parseValue(meta: WebMetricMeta, s: string): number | null {
  if (meta.kind === 'duration') return parseDuration(s);
  if (meta.kind === 'percent') return parsePercent(s);
  return parseCount(s);
}

export const isInvalid = (meta: WebMetricMeta, s: string) => s.trim() !== '' && parseValue(meta, s) == null;

export function webRowFromMetric(r: WebsiteMetricRow | undefined): WebGridRow {
  const out = { notes: r?.notes ?? '', social: {} } as WebGridRow;
  for (const m of WEB_METRICS) out[m.key] = formatValue(m, r?.[m.key] ?? null);
  for (const [k, v] of Object.entries(r?.social_by_platform ?? {})) {
    if (v != null) out.social[k as SocialMediaPlatform] = fmtInt(v);
  }
  return out;
}

export function webEntryFromRow(websiteId: string, row: WebGridRow): WebMonthEntry {
  const e: WebMonthEntry = { website_id: websiteId, notes: row.notes.trim() || null, social_by_platform: {} };
  for (const m of WEB_METRICS) (e as Record<string, unknown>)[m.key] = parseValue(m, row[m.key]);
  for (const [k, v] of Object.entries(row.social)) {
    const n = parseCount(v ?? '');
    if (n != null) e.social_by_platform![k as SocialMediaPlatform] = n;
  }
  return e;
}

export function webGridHasInvalid(row: WebGridRow | undefined): boolean {
  if (!row) return false;
  return WEB_METRICS.some((m) => isInvalid(m, row[m.key]))
    || Object.values(row.social).some((v) => v != null && v.trim() !== '' && parseCount(v) == null);
}


/** Social platforms to offer in the per-platform split: active accounts first, then the rest */
export function splitPlatforms(accounts: SocialMediaAccountRow[]): SocialMediaPlatform[] {
  const active = new Set(accounts.filter((a) => a.is_active).map((a) => a.platform));
  return PLATFORMS.filter((p) => active.has(p.key)).map((p) => p.key);
}

