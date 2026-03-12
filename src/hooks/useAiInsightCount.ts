// ---------------------------------------------------------------------------
// useAiInsightCount — lightweight hook for unread AI insight badge count
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAiInsightCount() {
  const [count, setCount] = useState(0);

  const fetch = useCallback(async () => {
    try {
      const { count: total, error } = await supabase
        .from('ai_insights')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new');

      if (!error && total != null) setCount(total);
    } catch {
      // Table may not exist yet — silently ignore
    }
  }, []);

  useEffect(() => {
    fetch();
    // Poll every 60 seconds
    const interval = setInterval(fetch, 60_000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { count };
}
