// ---------------------------------------------------------------------------
// StrategicIntelligencePage — AI-powered strategic insights dashboard
// ---------------------------------------------------------------------------

import { useStrategicAgent } from '../../hooks/useStrategicAgent';
import { InsightsPanel } from '../../components/ai/InsightsPanel';
import { AskAgent } from '../../components/ai/AskAgent';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function StrategicIntelligencePage() {
  const {
    insights,
    loading,
    analyzing,
    asking,
    unreadCount,
    criticalCount,
    refreshInsights,
    ask,
    markRead,
    markActed,
    dismiss,
  } = useStrategicAgent();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Split insights by category for the overview
  const insightsByCategory = insights.reduce(
    (acc, i) => {
      if (!acc[i.category]) acc[i.category] = [];
      acc[i.category].push(i);
      return acc;
    },
    {} as Record<string, typeof insights>,
  );

  const categoryLabels: Record<string, string> = {
    pricing: 'Pricing',
    inventory: 'Inventory',
    sales: 'Sales',
    collector: 'Collectors',
    gallery: 'Galleries',
    exhibition: 'Exhibitions',
    production: 'Production',
    market: 'Market',
    strategic: 'Strategic',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-primary-900">
            Strategic Intelligence
          </h1>
          <p className="mt-1 text-sm text-primary-500">
            AI-powered portfolio analysis and recommendations
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-primary-100 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-400">
            Total Insights
          </p>
          <p className="mt-1 text-2xl font-bold text-primary-900">{insights.length}</p>
        </div>
        <div className="rounded-lg border border-primary-100 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-400">
            Unread
          </p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{unreadCount}</p>
        </div>
        <div className="rounded-lg border border-primary-100 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-400">
            Critical / High
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600">{criticalCount}</p>
        </div>
        <div className="rounded-lg border border-primary-100 bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-400">
            Categories
          </p>
          <p className="mt-1 text-2xl font-bold text-primary-900">
            {Object.keys(insightsByCategory).length}
          </p>
        </div>
      </div>

      {/* Category chips */}
      {Object.keys(insightsByCategory).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(insightsByCategory).map(([cat, items]) => (
            <div
              key={cat}
              className="flex items-center gap-1.5 rounded-full border border-primary-200 bg-white px-3 py-1"
            >
              <span className="text-xs">{categoryLabels[cat] || cat}</span>
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-100 px-1 text-[10px] font-bold text-primary-700">
                {items.length}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Main insights panel */}
      <div className="rounded-xl border border-primary-100 bg-white p-6">
        <InsightsPanel
          insights={insights}
          analyzing={analyzing}
          onRefresh={refreshInsights}
          onMarkRead={markRead}
          onMarkActed={markActed}
          onDismiss={dismiss}
        />
      </div>

      {/* Chat agent */}
      <AskAgent asking={asking} onAsk={ask} />
    </div>
  );
}
