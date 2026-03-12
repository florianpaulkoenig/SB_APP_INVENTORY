// ---------------------------------------------------------------------------
// useStrategicAgent — hook for NOA Intelligence Engine
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import type {
  AiInsightRow,
  AiInsightStatus,
  AiConversationRow,
} from '../types/database';

interface AskResponse {
  answer: string;
  conversation_id: string;
}

export function useStrategicAgent() {
  const { showToast } = useToast();
  const [insights, setInsights] = useState<AiInsightRow[]>([]);
  const [conversations, setConversations] = useState<AiConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [asking, setAsking] = useState(false);

  // ---- Fetch insights -------------------------------------------------------
  const fetchInsights = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .in('status', ['new', 'read', 'acted'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('Failed to fetch insights:', error.message);
        return;
      }
      setInsights((data || []) as unknown as AiInsightRow[]);
    } catch (err) {
      console.warn('Failed to fetch insights:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Fetch conversations --------------------------------------------------
  const fetchConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('Failed to fetch conversations:', error.message);
        return;
      }
      setConversations((data || []) as unknown as AiConversationRow[]);
    } catch (err) {
      console.warn('Failed to fetch conversations:', err);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
    fetchConversations();
  }, [fetchInsights, fetchConversations]);

  // ---- Computed values ------------------------------------------------------
  const unreadCount = insights.filter((i) => i.status === 'new').length;
  const criticalCount = insights.filter(
    (i) => i.status === 'new' && (i.priority === 'critical' || i.priority === 'high'),
  ).length;

  // ---- Trigger analysis -----------------------------------------------------
  const refreshInsights = useCallback(async () => {
    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Not authenticated. Please log in again.', 'error');
        return;
      }

      const response = await supabase.functions.invoke('strategic-agent', {
        body: { mode: 'analyze' },
      });

      // Handle invoke errors (non-2xx responses)
      if (response.error) {
        const msg = typeof response.error === 'object' && 'message' in response.error
          ? (response.error as { message: string }).message
          : 'Analysis failed';
        showToast(msg, 'error');
        return;
      }

      const data = response.data;
      if (data?.cooldown) {
        showToast('Analysis was run recently. Please wait before running again.', 'info');
        return;
      }

      showToast(`Generated ${data?.count || 0} new insights`, 'success');
      await fetchInsights();
    } catch (err) {
      console.error('refreshInsights error:', err);
      const message = err instanceof Error ? err.message : 'Analysis failed';
      showToast(message, 'error');
    } finally {
      setAnalyzing(false);
    }
  }, [fetchInsights, showToast]);

  // ---- Ask a question -------------------------------------------------------
  const ask = useCallback(
    async (question: string, conversationId?: string): Promise<AskResponse | null> => {
      setAsking(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          showToast('Not authenticated. Please log in again.', 'error');
          return null;
        }

        const response = await supabase.functions.invoke('strategic-agent', {
          body: { mode: 'ask', question, conversation_id: conversationId },
        });

        if (response.error) {
          const msg = typeof response.error === 'object' && 'message' in response.error
            ? (response.error as { message: string }).message
            : 'Question failed';
          showToast(msg, 'error');
          return null;
        }

        const data = response.data;
        if (data?.answer) {
          await fetchConversations();
          return data as AskResponse;
        }

        showToast('No response received', 'error');
        return null;
      } catch (err) {
        console.error('ask error:', err);
        const message = err instanceof Error ? err.message : 'Question failed';
        showToast(message, 'error');
        return null;
      } finally {
        setAsking(false);
      }
    },
    [fetchConversations, showToast],
  );

  // ---- Update insight status ------------------------------------------------
  const updateInsightStatus = useCallback(
    async (id: string, status: AiInsightStatus) => {
      try {
        const updatePayload: Record<string, unknown> = { status };
        if (status === 'acted') updatePayload.acted_at = new Date().toISOString();

        const { error } = await supabase
          .from('ai_insights')
          .update(updatePayload as never)
          .eq('id', id);

        if (error) throw error;

        setInsights((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status, ...(status === 'acted' ? { acted_at: new Date().toISOString() } : {}) } : i)),
        );
      } catch (err) {
        console.error('Failed to update insight:', err);
      }
    },
    [],
  );

  const markRead = useCallback((id: string) => updateInsightStatus(id, 'read'), [updateInsightStatus]);
  const markActed = useCallback((id: string) => updateInsightStatus(id, 'acted'), [updateInsightStatus]);
  const dismiss = useCallback((id: string) => updateInsightStatus(id, 'dismissed'), [updateInsightStatus]);

  return {
    insights,
    conversations,
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
    fetchInsights,
    fetchConversations,
  };
}
