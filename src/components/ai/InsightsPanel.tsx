// ---------------------------------------------------------------------------
// InsightsPanel — collapsible panel showing AI strategic insights with feedback
// ---------------------------------------------------------------------------

import { useState } from 'react';
import type {
  AiInsightRow,
  AiInsightPriority,
  AiInsightCategory,
  AiInsightFeedbackRow,
  AiFeedbackRating,
} from '../../types/database';

interface InsightsPanelProps {
  insights: AiInsightRow[];
  analyzing: boolean;
  onRefresh: () => void;
  onMarkRead: (id: string) => void;
  onMarkActed: (id: string) => void;
  onDismiss: (id: string) => void;
  feedbackMap?: Record<string, AiInsightFeedbackRow>;
  onFeedback?: (
    insightId: string,
    rating: AiFeedbackRating,
    comment: string | null,
    category: string,
    priority: string,
  ) => void;
  onResearch?: (insight: AiInsightRow) => void;
}

const priorityConfig: Record<AiInsightPriority, { color: string; bg: string; label: string }> = {
  critical: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', label: 'Critical' },
  high: { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', label: 'High' },
  medium: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', label: 'Medium' },
  low: { color: 'text-primary-500', bg: 'bg-primary-50 border-primary-200', label: 'Low' },
};

const categoryIcons: Record<AiInsightCategory, string> = {
  pricing: '\u{1F4B0}',
  inventory: '\u{1F4E6}',
  sales: '\u{1F4C8}',
  collector: '\u{1F3A8}',
  gallery: '\u{1F3DB}\uFE0F',
  exhibition: '\u{1F5BC}\uFE0F',
  production: '\u2699\uFE0F',
  market: '\u{1F30D}',
  strategic: '\u{1F9E0}',
};

export function InsightsPanel({
  insights,
  analyzing,
  onRefresh,
  onMarkRead,
  onMarkActed,
  onDismiss,
  feedbackMap = {},
  onFeedback,
  onResearch,
}: InsightsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackInputId, setFeedbackInputId] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Sort: critical > high > medium > low, then by date
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...insights].sort(
    (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
      || new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const handleThumbClick = (insightId: string, rating: AiFeedbackRating, category: string, priority: string) => {
    if (!onFeedback) return;
    onFeedback(insightId, rating, null, category, priority);
    setFeedbackInputId(insightId);
    setFeedbackComment('');
  };

  const handleCommentSubmit = (insightId: string, rating: AiFeedbackRating, category: string, priority: string) => {
    if (!onFeedback || !feedbackComment.trim()) return;
    onFeedback(insightId, rating, feedbackComment.trim(), category, priority);
    setFeedbackInputId(null);
    setFeedbackComment('');
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold text-primary-900">AI Insights</h3>
          {insights.filter((i) => i.status === 'new').length > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
              {insights.filter((i) => i.status === 'new').length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={analyzing}
          className="flex items-center gap-2 rounded-lg bg-primary-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-800 disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Insights list */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-primary-200 p-10 text-center">
          <p className="text-base text-primary-400">
            {analyzing ? 'Generating insights...' : 'No insights yet. Click Refresh to generate.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((insight) => {
            const pConfig = priorityConfig[insight.priority];
            const isExpanded = expandedId === insight.id;
            const isNew = insight.status === 'new';
            const isActed = insight.status === 'acted';
            const existingFeedback = feedbackMap[insight.id];

            return (
              <div
                key={insight.id}
                className={`rounded-xl border transition-all ${pConfig.bg} ${isNew ? 'ring-2 ring-primary-300' : ''} ${isActed ? 'opacity-75' : ''}`}
              >
                {/* Insight header */}
                <button
                  type="button"
                  onClick={() => {
                    setExpandedId(isExpanded ? null : insight.id);
                    if (isNew) onMarkRead(insight.id);
                  }}
                  className="flex w-full items-start gap-3 p-5 text-left"
                >
                  <span className="mt-0.5 text-lg">{categoryIcons[insight.category]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold uppercase tracking-wide ${pConfig.color}`}>
                        {pConfig.label}
                      </span>
                      {isNew && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                      {isActed && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Acted
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-base font-semibold text-primary-900">{insight.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-primary-600">{insight.summary}</p>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={`mt-2 h-4 w-4 shrink-0 text-primary-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
                  </svg>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-primary-200 px-5 pb-5 pt-4">
                    <div className="mb-4 max-w-none text-base leading-relaxed text-primary-700">
                      {insight.analysis.split('\n').map((line, i) => (
                        <p key={i} className={`${line.startsWith('-') || line.startsWith('\u2022') ? 'ml-4' : ''} ${i > 0 ? 'mt-2' : ''}`}>
                          {line}
                        </p>
                      ))}
                    </div>

                    {insight.recommendations && Array.isArray(insight.recommendations) && insight.recommendations.length > 0 && (
                      <div className="mb-5">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary-500">
                          Recommendations
                        </p>
                        <ul className="space-y-2">
                          {insight.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-base text-primary-700">
                              <span className="mt-0.5 text-primary-400">&rarr;</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions + Feedback row */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        {insight.status !== 'acted' && (
                          <button
                            type="button"
                            onClick={() => onMarkActed(insight.id)}
                            className="rounded-lg bg-green-100 px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
                          >
                            Mark Acted
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDismiss(insight.id)}
                          className="rounded-lg bg-primary-100 px-3 py-2 text-sm font-medium text-primary-500 transition-colors hover:bg-primary-200"
                        >
                          Dismiss
                        </button>
                        {onResearch && (
                          <button
                            type="button"
                            onClick={() => onResearch(insight)}
                            className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-200"
                          >
                            <span className="flex items-center gap-1.5">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                                <circle cx="7" cy="7" r="4.5" />
                                <path strokeLinecap="round" d="M10.5 10.5L14 14" />
                              </svg>
                              Research
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Feedback thumbs */}
                      {onFeedback && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-primary-400">Helpful?</span>
                          <button
                            type="button"
                            onClick={() => handleThumbClick(insight.id, 'positive', insight.category, insight.priority)}
                            disabled={!!existingFeedback}
                            className={`rounded-lg p-1.5 transition-colors ${
                              existingFeedback?.rating === 'positive'
                                ? 'bg-green-100 text-green-600'
                                : existingFeedback
                                  ? 'cursor-default text-primary-200'
                                  : 'text-primary-400 hover:bg-green-50 hover:text-green-600'
                            }`}
                            title="Helpful"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                              <path d="M2.5 9.5a1 1 0 01-1-1v-4a1 1 0 011-1h1a1 1 0 011 1v4a1 1 0 01-1 1h-1zm3-5.5v5.5l2 2.5h3.5a1 1 0 001-.8l.8-4a1 1 0 00-1-1.2H9.5l.5-2.5a1 1 0 00-1-1.2L5.5 4z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleThumbClick(insight.id, 'negative', insight.category, insight.priority)}
                            disabled={!!existingFeedback}
                            className={`rounded-lg p-1.5 transition-colors ${
                              existingFeedback?.rating === 'negative'
                                ? 'bg-red-100 text-red-500'
                                : existingFeedback
                                  ? 'cursor-default text-primary-200'
                                  : 'text-primary-400 hover:bg-red-50 hover:text-red-500'
                            }`}
                            title="Not helpful"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4 rotate-180">
                              <path d="M2.5 9.5a1 1 0 01-1-1v-4a1 1 0 011-1h1a1 1 0 011 1v4a1 1 0 01-1 1h-1zm3-5.5v5.5l2 2.5h3.5a1 1 0 001-.8l.8-4a1 1 0 00-1-1.2H9.5l.5-2.5a1 1 0 00-1-1.2L5.5 4z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Feedback comment input (shows after clicking a thumb) */}
                    {feedbackInputId === insight.id && existingFeedback && !existingFeedback.comment && (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          placeholder={
                            existingFeedback.rating === 'positive'
                              ? 'What made this useful? (optional)'
                              : 'How could this be better? (optional)'
                          }
                          maxLength={500}
                          className="flex-1 rounded-lg border border-primary-200 px-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCommentSubmit(insight.id, existingFeedback.rating, insight.category, insight.priority);
                            }
                            if (e.key === 'Escape') {
                              setFeedbackInputId(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleCommentSubmit(insight.id, existingFeedback.rating, insight.category, insight.priority)}
                          disabled={!feedbackComment.trim()}
                          className="rounded-lg bg-primary-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800 disabled:opacity-50"
                        >
                          Send
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeedbackInputId(null)}
                          className="rounded-lg px-2 py-2 text-sm text-primary-400 hover:text-primary-600"
                        >
                          &times;
                        </button>
                      </div>
                    )}

                    {/* Show existing feedback comment */}
                    {existingFeedback?.comment && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-primary-50 px-3 py-2.5">
                        <span className="text-sm text-primary-400">Your feedback:</span>
                        <span className="text-sm text-primary-600">{existingFeedback.comment}</span>
                      </div>
                    )}
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
