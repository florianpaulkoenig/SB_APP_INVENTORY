// ---------------------------------------------------------------------------
// LiquidityCashFlowChart
// Combined bar + line chart for the liquidity planning page.
//   Bars  (left Y-axis)  — net profit per month (green = positive, red = negative)
//   Line  (right Y-axis) — projected end-of-month Saldo
//   Dots  (right Y-axis) — Ist-Saldo where entered (green filled dots)
// ---------------------------------------------------------------------------

import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Cell, Legend,
} from 'recharts';
import type { MonthBucket } from '../../hooks/useNOALiquidity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = new Intl.NumberFormat('de-CH', {
  style: 'currency', currency: 'CHF',
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});

function shortLabel(label: string): string {
  // "Mai 2026" → "Mai '26"
  const [month, year] = label.split(' ');
  return `${month.slice(0, 3)} '${year.slice(2)}`;
}

// ---------------------------------------------------------------------------
// Chart data shape
// ---------------------------------------------------------------------------

interface ChartPoint {
  label:    string;
  profit:   number;          // net (income − expenses) for this month
  saldo:    number;          // projected end-of-month balance
  istSaldo: number | null;   // actual balance if entered
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-primary-100 bg-white px-3 py-2.5 shadow-lg text-xs">
      <p className="mb-2 font-semibold text-primary-700">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-primary-500">{p.name}:</span>
          <span className="font-medium tabular-nums" style={{ color: p.color }}>
            {p.value != null ? fmt.format(p.value) : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dot renderer for Ist-Saldo (only draw where value is non-null)
// ---------------------------------------------------------------------------

function IstSaldoDot(props: any) {
  const { cx, cy, payload } = props;
  if (payload.istSaldo == null) return null;
  return (
    <circle
      cx={cx} cy={cy} r={5}
      fill="#10b981" stroke="#ffffff" strokeWidth={2}
    />
  );
}

function IstSaldoActiveDot(props: any) {
  const { cx, cy, payload } = props;
  if (payload.istSaldo == null) return null;
  return (
    <circle
      cx={cx} cy={cy} r={7}
      fill="#10b981" stroke="#ffffff" strokeWidth={2}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LiquidityCashFlowChart({
  months,
  currency = 'CHF',
}: {
  months: MonthBucket[];
  currency?: string;
}) {
  const data: ChartPoint[] = months.map((bucket) => {
    const allIncome  = [...bucket.entries, ...bucket.lateEntries, ...bucket.paidEntries];
    const incomeSum  = allIncome.reduce((s, e) => s + e.amount, 0);
    const expenseSum = bucket.expenses.reduce((s, e) => s + e.amount, 0);
    return {
      label:    shortLabel(bucket.label),
      profit:   incomeSum - expenseSum,
      saldo:    bucket.projectedBalance,
      istSaldo: bucket.actualBalance,
    };
  });

  const tickFmt = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
    return String(v);
  };

  return (
    <div className="rounded-lg border border-primary-100 bg-white p-4 mb-6">
      <h2 className="mb-4 text-sm font-semibold text-primary-700 uppercase tracking-wide">
        Cashflow &amp; Saldo — 12 Monate
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0eeec" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fill: '#a3a09a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          {/* Left axis — profit */}
          <YAxis
            yAxisId="left"
            tickFormatter={tickFmt}
            tick={{ fill: '#a3a09a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />

          {/* Right axis — balance */}
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={tickFmt}
            tick={{ fill: '#a3a09a', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f7f6f4' }} />

          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 12, color: '#737066' }}
            formatter={(value) => (
              <span style={{ color: '#737066' }}>{value}</span>
            )}
          />

          {/* Zero reference line for profit axis */}
          <ReferenceLine yAxisId="left" y={0} stroke="#d6d3ce" strokeWidth={1} />

          {/* Profit bars — colored per value */}
          <Bar
            yAxisId="left"
            dataKey="profit"
            name="Profit / Monat"
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.profit >= 0 ? '#10b981' : '#ef4444'} opacity={0.85} />
            ))}
          </Bar>

          {/* Projected Saldo line */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="saldo"
            name="Saldo (projiziert)"
            stroke="#c9a96e"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#c9a96e', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />

          {/* Ist-Saldo dots */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="istSaldo"
            name="Ist-Saldo"
            stroke="#10b981"
            strokeWidth={2}
            dot={<IstSaldoDot />}
            activeDot={<IstSaldoActiveDot />}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend note */}
      <p className="mt-2 text-[10px] text-primary-400 text-right">
        Balken: Einnahmen − Ausgaben pro Monat · Linie: projizierter Saldo per Monatsende · Punkte: eingetragener Ist-Saldo
      </p>
    </div>
  );
}
