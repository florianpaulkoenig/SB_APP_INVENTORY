// ---------------------------------------------------------------------------
// Website charts
//   SiteMetricChart        — stacked bars: a monthly figure per website
//   SourceMixChart         — stacked bars: visits per traffic source
//   SocialConversionChart  — bars: web visits from social; line: per 1'000 views
// ---------------------------------------------------------------------------

import {
  BarChart, Bar, ComposedChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import type { WebsiteRow, WebsiteMetricRow } from '../../types/database';
import type { WebStats, ConversionMonth } from '../../lib/websiteMetrics';
import { SITE_COLORS, SOURCE_COLORS, WEB_METRICS, SOURCE_KEYS } from '../../lib/websiteMetrics';
import { monthLabel, fmtCompact } from '../../lib/socialMedia';
import { ChartTooltip } from './SocialMediaCharts';
import { axisProps } from './chartStyle';

const legendProps = { iconType: 'circle' as const, iconSize: 8, wrapperStyle: { fontSize: 11, color: '#8a817c' } };

export function SiteMetricChart({ stats, sites, value }: {
  stats: WebStats;
  sites: WebsiteRow[];
  value: (r: WebsiteMetricRow) => number | null;
}) {
  const data = stats.series.map((m) => {
    const p: Record<string, number | string | null> = { label: monthLabel(m.month) };
    for (const s of sites) { const r = m.bySite[s.id]; p[s.id] = r ? value(r) : null; }
    return p;
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#efebe8" />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
        <YAxis {...axisProps} width={52} tickFormatter={(v: number) => fmtCompact(v)} />
        <Tooltip content={<ChartTooltip showTotal />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend {...legendProps} />
        {sites.map((s, i) => (
          <Bar key={s.id} dataKey={s.id} name={s.domain} stackId="w" fill={SITE_COLORS[i % SITE_COLORS.length]} maxBarSize={36} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SourceMixChart({ stats, siteId }: { stats: WebStats; siteId: string | 'all' }) {
  const data = stats.series.map((m) => {
    const p: Record<string, number | string | null> = { label: monthLabel(m.month) };
    for (const k of SOURCE_KEYS) {
      p[k] = siteId === 'all' ? (m.hasData ? m.sources[k] : null) : (m.bySite[siteId]?.[k] ?? null);
    }
    return p;
  });
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#efebe8" />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
        <YAxis {...axisProps} width={52} tickFormatter={(v: number) => fmtCompact(v)} />
        <Tooltip content={<ChartTooltip showTotal />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend {...legendProps} />
        {SOURCE_KEYS.map((k) => (
          <Bar key={k} dataKey={k} name={WEB_METRICS.find((m) => m.key === k)!.label} stackId="s" fill={SOURCE_COLORS[k]} maxBarSize={36} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

const fmtRate = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(2));

export function SocialConversionChart({ months }: { months: ConversionMonth[] }) {
  const data = months.map((m) => ({ label: monthLabel(m.month), socialVisits: m.socialVisits, per1kViews: m.per1kViews }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#efebe8" />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
        <YAxis yAxisId="l" {...axisProps} width={52} tickFormatter={(v: number) => fmtCompact(v)} />
        <YAxis yAxisId="r" orientation="right" {...axisProps} width={44} tickFormatter={(v: number) => v.toFixed(1)} />
        <Tooltip content={<ChartTooltip format={{ per1kViews: fmtRate }} />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend {...legendProps} />
        <Bar yAxisId="l" dataKey="socialVisits" name="Web-Besuche aus Social" fill={SOURCE_COLORS.source_social} fillOpacity={0.35} maxBarSize={32} isAnimationActive={false} />
        <Line yAxisId="r" type="monotone" dataKey="per1kViews" name="Besuche pro 1'000 Social-Views" stroke={SOURCE_COLORS.source_social} strokeWidth={2} dot={{ r: 2.5 }} connectNulls isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
