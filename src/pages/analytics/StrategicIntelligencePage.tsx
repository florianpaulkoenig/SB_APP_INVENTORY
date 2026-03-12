// ---------------------------------------------------------------------------
// StrategicIntelligencePage — AI-powered strategic insights dashboard
// ---------------------------------------------------------------------------

import { useNavigate } from 'react-router-dom';
import { useStrategicAgent } from '../../hooks/useStrategicAgent';
import { useInsightFeedback } from '../../hooks/useInsightFeedback';
import { InsightsPanel } from '../../components/ai/InsightsPanel';
import { AskAgent } from '../../components/ai/AskAgent';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { AiInsightRow } from '../../types/database';

export function StrategicIntelligencePage() {
  const navigate = useNavigate();
  const {
    insights,
    loading,
    analyzing,
    unreadCount,
    criticalCount,
    refreshInsights,
    markRead,
    markActed,
    dismiss,
  } = useStrategicAgent();

  const { feedbackMap, submitFeedback } = useInsightFeedback();

  const handleResearch = (insight: AiInsightRow) => {
    const recs = Array.isArray(insight.recommendations) && insight.recommendations.length > 0
      ? `\n\nRecommendations:\n${insight.recommendations.map((r) => `- ${r}`).join('\n')}`
      : '';
    const question = `I'd like to research this insight further:\n\n"${insight.title}"\n\n${insight.summary}\n\nAnalysis: ${insight.analysis}${recs}\n\nPlease provide deeper analysis, additional context, and specific actionable steps I can take.`;
    navigate('/analytics/intelligence-chat', { state: { initialQuestion: question } });
  };

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
        <button
          type="button"
          onClick={() => navigate('/analytics/intelligence-chat')}
          className="flex items-center gap-2 rounded-lg border border-primary-200 bg-white px-4 py-2 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 2a6 6 0 00-5.42 8.61L2 14l3.39-.58A6 6 0 108 2z" />
            <circle cx="5.5" cy="8" r="0.5" fill="currentColor" />
            <circle cx="8" cy="8" r="0.5" fill="currentColor" />
            <circle cx="10.5" cy="8" r="0.5" fill="currentColor" />
          </svg>
          Open Chat
        </button>
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
          feedbackMap={feedbackMap}
          onFeedback={submitFeedback}
          onResearch={handleResearch}
        />
      </div>

      {/* Chat FAB */}
      <AskAgent />
    </div>
  );
}
