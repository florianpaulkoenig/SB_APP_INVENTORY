import type { SalesFunnelData } from '../../hooks/useSalesFunnel';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SalesFunnelSectionProps {
  data: SalesFunnelData | null;
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Stage display config
// ---------------------------------------------------------------------------

const STAGE_LABELS: Record<string, string> = {
  enquiry: 'Enquiry',
  lead: 'Lead',
  contacted: 'Contacted',
  quoted: 'Quoted',
  negotiating: 'Negotiating',
  sold: 'Sold',
};

const STAGE_COLORS: Record<string, string> = {
  enquiry: 'bg-indigo-500',
  lead: 'bg-gray-400',
  contacted: 'bg-blue-500',
  quoted: 'bg-amber-500',
  negotiating: 'bg-purple-500',
  sold: 'bg-emerald-500',
};

const STAGE_BADGE_COLORS: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-800',
  contacted: 'bg-blue-100 text-blue-800',
  quoted: 'bg-amber-100 text-amber-800',
  negotiating: 'bg-purple-100 text-purple-800',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SalesFunnelSection({ data, loading }: SalesFunnelSectionProps) {
  if (loading) {
    return (
      <div className="mb-8 animate-pulse rounded-lg border border-primary-100 bg-white p-6">
        <div className="mb-4 h-5 w-40 rounded bg-primary-100" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-primary-50" />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 rounded bg-primary-50" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    stages,
    bottlenecks,
    totalEnquiries,
    overallConversionRate,
    avgCycleTime,
    stageDistribution,
  } = data;

  const activeDeals = Object.values(stageDistribution).reduce(
    (a, b) => a + b,
    0,
  );

  // Find biggest bottleneck (highest drop-off that is meaningful)
  const topBottleneck =
    bottlenecks.find((b) => b.dropOffCount > 0) ?? null;

  // Max count for bar width scaling
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="mb-8 rounded-lg border border-primary-100 bg-white p-6">
      {/* Title */}
      <h2 className="mb-4 font-display text-lg font-semibold text-primary-900">
        Sales Funnel
      </h2>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total Enquiries" value={totalEnquiries.toString()} />
        <KpiCard
          label="Conversion Rate"
          value={`${overallConversionRate}%`}
          subtitle="Enquiry to Sale"
        />
        <KpiCard
          label="Avg Cycle Time"
          value={avgCycleTime != null ? `${avgCycleTime}d` : '--'}
          subtitle="Enquiry to Sale"
        />
        <KpiCard label="Active Deals" value={activeDeals.toString()} />
      </div>

      {/* Funnel bars */}
      <div className="mb-6 space-y-2">
        {stages.map((s) => {
          const widthPct = maxCount > 0 ? (s.count / maxCount) * 100 : 0;
          const barColor = STAGE_COLORS[s.stage] ?? 'bg-gray-400';

          return (
            <div key={s.stage} className="flex items-center gap-3">
              {/* Label */}
              <span className="w-24 shrink-0 text-right text-sm font-medium text-primary-700">
                {STAGE_LABELS[s.stage] ?? s.stage}
              </span>

              {/* Bar */}
              <div className="relative flex-1">
                <div
                  className={`${barColor} h-8 rounded transition-all duration-500`}
                  style={{
                    width: `${Math.max(widthPct, 2)}%`,
                    minWidth: '2rem',
                  }}
                />
              </div>

              {/* Count + conversion rate */}
              <span className="w-28 shrink-0 text-sm text-primary-600">
                {s.count}
                {s.stage !== 'sold' && (
                  <span className="ml-1 text-xs text-primary-400">
                    ({s.conversionRate}%)
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom row: Bottleneck alert + Stage distribution */}
      <div className="flex flex-col gap-4 border-t border-primary-100 pt-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Bottleneck alert */}
        {topBottleneck && topBottleneck.dropOffRate > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm">
            <span className="mt-0.5 inline-block rounded bg-amber-200 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
              Bottleneck
            </span>
            <span className="text-amber-900">
              {STAGE_LABELS[topBottleneck.fromStage] ?? topBottleneck.fromStage}
              {' -> '}
              {STAGE_LABELS[topBottleneck.toStage] ?? topBottleneck.toStage}
              {': '}
              <strong>{topBottleneck.dropOffRate}%</strong> drop-off (
              {topBottleneck.dropOffCount} lost)
            </span>
          </div>
        )}

        {/* Stage distribution badges */}
        {activeDeals > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-primary-500">
              Active:
            </span>
            {Object.entries(stageDistribution).map(([stage, count]) => (
              <span
                key={stage}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  STAGE_BADGE_COLORS[stage] ?? 'bg-gray-100 text-gray-800'
                }`}
              >
                {STAGE_LABELS[stage] ?? stage}
                <span className="font-semibold">{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card sub-component
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg border border-primary-100 bg-primary-50/50 px-4 py-3">
      <p className="text-xs font-medium text-primary-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-primary-900">{value}</p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-primary-400">{subtitle}</p>
      )}
    </div>
  );
}
