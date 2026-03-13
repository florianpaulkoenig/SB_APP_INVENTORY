// ---------------------------------------------------------------------------
// useInsightFeedback — thumbs up/down + comment on AI insights
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type { AiInsightFeedbackRow, AiFeedbackRating } from '../types/database';

export function useInsightFeedback() {
  const { toast } = useToast();
  const [feedbackMap, setFeedbackMap] = useState<Record<string, AiInsightFeedbackRow>>({});

  // ---- Fetch existing feedback for current user ----------------------------
  const fetchFeedback = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ai_insight_feedback')
        .select('id, user_id, insight_id, rating, comment, insight_category, insight_priority, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.warn('Failed to fetch feedback:', error.message);
        return;
      }

      const map: Record<string, AiInsightFeedbackRow> = {};
      for (const row of (data || []) as unknown as AiInsightFeedbackRow[]) {
        map[row.insight_id] = row;
      }
      setFeedbackMap(map);
    } catch (err) {
      console.warn('Failed to fetch feedback:', err);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // ---- Submit feedback (upsert) --------------------------------------------
  const submitFeedback = useCallback(
    async (
      insightId: string,
      rating: AiFeedbackRating,
      comment: string | null,
      category: string,
      priority: string,
    ) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast('Not authenticated', 'error');
          return;
        }

        const existing = feedbackMap[insightId];

        if (existing) {
          // Update existing feedback
          const { error } = await supabase
            .from('ai_insight_feedback')
            .update({ rating, comment: comment || null } as never)
            .eq('id', existing.id);

          if (error) {
            console.error('Feedback update error:', error.message);
            toast('Failed to save feedback', 'error');
            return;
          }
          setFeedbackMap((prev) => ({
            ...prev,
            [insightId]: { ...existing, rating, comment: comment || null },
          }));
        } else {
          // Insert new feedback
          const { data, error } = await supabase
            .from('ai_insight_feedback')
            .insert({
              user_id: session.user.id,
              insight_id: insightId,
              rating,
              comment: comment || null,
              insight_category: category,
              insight_priority: priority,
            } as never)
            .select()
            .single();

          if (error) {
            console.error('Feedback insert error:', error.message);
            toast('Failed to save feedback', 'error');
            return;
          }
          const row = data as unknown as AiInsightFeedbackRow;
          setFeedbackMap((prev) => ({ ...prev, [insightId]: row }));
        }
        toast('Feedback saved', 'success');
      } catch (err) {
        console.error('Feedback error:', err);
        toast('Failed to save feedback', 'error');
      }
    },
    [toast],
  );

  // ---- Computed: feedback summary by category ------------------------------
  const feedbackSummary = Object.values(feedbackMap).reduce(
    (acc, fb) => {
      const cat = fb.insight_category;
      if (!acc[cat]) acc[cat] = { positive: 0, negative: 0 };
      acc[cat][fb.rating]++;
      return acc;
    },
    {} as Record<string, { positive: number; negative: number }>,
  );

  return {
    feedbackMap,
    feedbackSummary,
    submitFeedback,
    fetchFeedback,
  };
}
