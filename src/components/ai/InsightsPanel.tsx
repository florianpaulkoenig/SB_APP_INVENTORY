// ---------------------------------------------------------------------------
// InsightsPanel — collapsible panel showing AI strategic insights
// ---------------------------------------------------------------------------

import { useState } from 'react';
import type { AiInsightRow, AiInsightPriority, AiInsightCategory } from '../../types/database';

interface InsightsPanelProps {
  insights: AiInsightRow[];
  analyzing: boolean;
  onRefresh: () => void;
  onMarkRead: (id: string) => void;
  onMarkActed: (id: string) => void;
  onDismiss: (id: string) => void;
}

const priorityConfig: Record<AiInsightPriority, { color: string; bg: string; label: string }> = {
  critical: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', label: 'Critical' },
  high: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', label: 'High' },
  medium: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', label: 'Medium' },
  low: { color: 'text-primary-500', bg: 'bg-primary-50 border-primary-200', label: 'Low' },
};

const categoryIcons: Record<AiInsightCategory, string> = {
  pricing: '💰',
  inventory: '📦',
  sales: '📈',
  collector: '🎨',
  gallery: '🏛️',
  exhibition: '🖼️',
  production: '⚙️',
  market: '🌍',
  strategic: '🧠',
};

export function InsightsPanel({
  insights,
  analyzing,
  onRefresh,
  onMarkRead,
  onMarkActed,
  onDismiss,
}: InsightsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'high'>('all');

  const filtered = insights.filter((i) => {
    if (filter === 'new') return i.status === 'new';
    if (filter === 'high') return i.priority === 'critical' || i.priority === 'high';
    return true;
  });

  // Sort: critical > high > medium > low, then by date
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...filtered].sort(
    (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
      || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const newCount = insights.filter((i) => i.status === 'new').length;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-primary-900">AI Insights</h3>
          {newCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {newCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={analyzing}
          className="flex items-center gap-1 rounded-md bg-primary-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-800 disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing…
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3 w-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-3 flex gap-1">
        {(['all', 'new', 'high'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              filter === f
                ? 'bg-primary-900 text-white'
                : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
            }`}
          >
            {f === 'all' ? 'All' : f === 'new' ? 'Unread' : 'Important'}
          </button>
        ))}
      </div>

      {/* Insights list */}
      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-primary-200 p-6 text-center">
          <p className="text-xs text-primary-400">
            {analyzing ? 'Generating insights…' : 'No insights yet. Click Refresh to generate.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((insight) => {
            const pConfig = priorityConfig[insight.priority];
            const isExpanded = expandedId === insight.id;
            const isNew = insight.status === 'new';

            return (
              <div
                key={insight.id}
                className={`rounded-lg border transition-all ${pConfig.bg} ${isNew ? 'ring-1 ring-primary-300' : ''}`}
              >
                {/* Insight header */}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : insight.id);
                    if (isNew) onMarkRead(insight.id);
                  }}
                  className="flex w-full items-start gap-2 p-3 text-left"
                >
                  <span className="mt-0.5 text-sm">{categoryIcons[insight.category]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-semibold uppercase ${pConfig.color}`}>
                        {pConfig.label}
                      </span>
                      {isNew && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-xs font-medium text-primary-900">{insight.title}</p>
                    <p className="mt-0.5 text-[11px] text-primary-500">{insight.summary}</p>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={`mt-1 h-3 w-3 shrink-0 text-primary-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
                  </svg>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-primary-200 px-3 pb-3 pt-2">
                    <div className="prose prose-xs mb-3 max-w-none text-[11px] leading-relaxed text-primary-700">
                      {insight.analysis.split('\n').map((line, i) => (
                        <p key={i} className={line.startsWith('-') || line.startsWith('•') ? 'ml-3' : ''}>
                          {line}
                        </p>
                      ))}
                    </div>

                    {insight.recommendations && Array.isArray(insight.recommendations) && insight.recommendations.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase text-primary-500">
                          Recommendations
                        </p>
                        <ul className="space-y-1">
                          {insight.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-primary-700">
                              <span className="mt-0.5 text-primary-400">→</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onMarkActed(insight.id)}
                        className="rounded-md bg-green-100 px-2 py-1 text-[10px] font-medium text-green-700 transition-colors hover:bg-green-200"
                      >
                        ✓ Mark Acted
                      </button>
                      <button
                        type="button"
                        onClick={() => onDismiss(insight.id)}
                        className="rounded-md bg-primary-100 px-2 py-1 text-[10px] font-medium text-primary-500 transition-colors hover:bg-primary-200"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
