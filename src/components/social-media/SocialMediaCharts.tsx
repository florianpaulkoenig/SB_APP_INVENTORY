// ---------------------------------------------------------------------------
// Social Media charts
//   FollowerGrowthChart — stacked areas: follower count per account over time
//   MonthlyMetricChart  — stacked bars: a monthly figure per account
//   AccountTrendChart   — single account: followers (line) + a monthly figure (bars)
// ---------------------------------------------------------------------------

import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import type { SocialMediaAccountRow } from '../../types/database';
import type { MonthTotals, AccountMonth } from '../../lib/socialMedia';
import { PLATFORM_MAP, accountLabel, monthLabel, fmtInt, fmtCompact } from '../../lib/socialMedia';
import { axisProps } from './chartStyle';

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------


interface TooltipEntry { name?: string; value?: number | null; color?: string; dataKey?: string | number }

export function ChartTooltip({ active, payload, label, showTotal, format }: {
  active?: boolean; payload?: TooltipEntry[]; label?: string; showTotal?: boolean;
  /** Per-dataKey value formatter (default: integer) */
  format?: Record<string, (v: number | null | undefined) => string>;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null && p.value !== 0);
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  const fmtOf = (key: string | number | undefined) => format?.[String(key)] ?? fmtInt;
  return (
    <div className="rounded-lg border border-primary-100 bg-white px-3 py-2.5 text-xs shadow-lg">
      <p className="mb-2 font-semibold text-primary-700">{label}</p>
      {[...rows].reverse().map((p) => (
        <div key={String(p.dataKey)} className="mb-0.5 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: p.color }} />
          <span className="text-primary-500">{p.name}:</span>
          <span className="ml-auto pl-3 font-medium tabular-nums text-primary-800">{fmtOf(p.dataKey)(p.value)}</span>
        </div>
      ))}
      {showTotal && rows.length > 1 && (
        <div className="mt-1 flex items-center gap-2 border-t border-primary-100 pt-1">
          <span className="text-primary-500">Total:</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums text-primary-800">{fmtInt(total)}</span>
        </div>
      )}
    </div>
  );
}

/** Same platform twice (e.g. two Instagram accounts) → second one lighter */
function colorsFor(accounts: SocialMediaAccountRow[]): Record<string, { color: string; opacity: number }> {
  const seen = new Map<string, number>();
  const out: Record<string, { color: string; opacity: number }> = {};
  for (const a of accounts) {
    const n = seen.get(a.platform) ?? 0;
    seen.set(a.platform, n + 1);
    out[a.id] = { color: PLATFORM_MAP[a.platform]?.color ?? '#999', opacity: Math.max(0.35, 1 - n * 0.3) };
  }
  return out;
}

// ---------------------------------------------------------------------------
// Follower growth
// ---------------------------------------------------------------------------

export function FollowerGrowthChart({ series, accounts }: { series: MonthTotals[]; accounts: SocialMediaAccountRow[] }) {
  const colors = colorsFor(accounts);
  const data = series.map((m) => {
    const point: Record<string, number | string | null> = { label: monthLabel(m.month) };
    for (const a of accounts) point[a.id] = m.byAccount[a.id]?.followers ?? null;
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#efebe8" />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
        <YAxis {...axisProps} width={52} tickFormatter={(v: number) => fmtCompact(v)} />
        <Tooltip content={<ChartTooltip showTotal />} />
        {accounts.map((a) => (
          <Area
            key={a.id}
            type="monotone"
            dataKey={a.id}
            name={accountLabel(a)}
            stackId="f"
            stroke={colors[a.id].color}
            strokeOpacity={colors[a.id].opacity}
            fill={colors[a.id].color}
            fillOpacity={0.55 * colors[a.id].opacity}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Monthly metric (stacked bars)
// ---------------------------------------------------------------------------

export type MonthlyValue = (am: AccountMonth) => number | null;

export function MonthlyMetricChart({ series, accounts, value }: {
  series: MonthTotals[];
  accounts: SocialMediaAccountRow[];
  value: MonthlyValue;
}) {
  const colors = colorsFor(accounts);
  const data = series.map((m) => {
    const point: Record<string, number | string | null> = { label: monthLabel(m.month) };
    for (const a of accounts) {
      const am = m.byAccount[a.id];
      point[a.id] = am ? value(am) : null;
    }
    return point;
  });
  const hasNegative = data.some((p) => accounts.some((a) => (p[a.id] as number | null) != null && (p[a.id] as number) < 0));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} stackOffset="sign">
        <CartesianGrid vertical={false} stroke="#efebe8" />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
        <YAxis {...axisProps} width={52} tickFormatter={(v: number) => fmtCompact(v)} />
        <Tooltip content={<ChartTooltip showTotal />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        {hasNegative && <ReferenceLine y={0} stroke="#c9c1bb" />}
        {accounts.map((a) => (
          <Bar
            key={a.id}
            dataKey={a.id}
            name={accountLabel(a)}
            stackId="m"
            fill={colors[a.id].color}
            fillOpacity={colors[a.id].opacity}
            maxBarSize={36}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Single account trend
// ---------------------------------------------------------------------------

export function AccountTrendChart({ points, color, barLabel }: {
  points: { month: string; followers: number | null; bar: number | null }[];
  color: string;
  barLabel: string;
}) {
  const data = points.map((p) => ({ label: monthLabel(p.month), followers: p.followers, bar: p.bar }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#efebe8" />
        <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={16} />
        <YAxis yAxisId="l" {...axisProps} width={52} tickFormatter={(v: number) => fmtCompact(v)} />
        <YAxis yAxisId="r" orientation="right" {...axisProps} width={48} tickFormatter={(v: number) => fmtCompact(v)} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#8a817c' }} />
        <Bar yAxisId="r" dataKey="bar" name={barLabel} fill={color} fillOpacity={0.25} maxBarSize={28} isAnimationActive={false} />
        <Line yAxisId="l" type="monotone" dataKey="followers" name="Follower" stroke={color} strokeWidth={2} dot={{ r: 2.5 }} connectNulls isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
