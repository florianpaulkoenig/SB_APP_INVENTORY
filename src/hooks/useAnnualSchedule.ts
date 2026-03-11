import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScheduleEventType =
  | 'exhibition'
  | 'art_fair'
  | 'solo_show'
  | 'group_show'
  | 'production_order'
  | 'project';

export interface ScheduleEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  type: ScheduleEventType;
  status: string | null;
  detailPath: string;
  subtitle?: string;
}

export interface UseAnnualScheduleOptions {
  year: number;
  visibleTypes?: ScheduleEventType[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAnnualSchedule({ year, visibleTypes }: UseAnnualScheduleOptions) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const uid = session.user.id;

      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      // Fetch all sources in parallel
      const [exhibitionsRes, productionRes, projectsRes] = await Promise.all([
        supabase
          .from('exhibitions')
          .select('*')
          .eq('user_id', uid)
          .not('start_date', 'is', null),
        supabase
          .from('production_orders')
          .select('*')
          .eq('user_id', uid)
          .not('status', 'eq', 'draft'),
        supabase
          .from('projects')
          .select('*')
          .eq('user_id', uid)
          .not('start_date', 'is', null),
      ]);

      const allEvents: ScheduleEvent[] = [];

      // Normalize exhibitions → exhibition / art_fair / solo_show / group_show
      for (const ex of exhibitionsRes.data ?? []) {
        if (!ex.start_date) continue;
        const start = new Date(ex.start_date);
        const end = ex.end_date ? new Date(ex.end_date) : new Date(ex.start_date);
        // Filter by year overlap
        if (end < new Date(yearStart) || start > new Date(yearEnd)) continue;
        const evType = (['exhibition', 'art_fair', 'solo_show', 'group_show'].includes(ex.type)
          ? ex.type
          : 'exhibition') as ScheduleEventType;
        allEvents.push({
          id: ex.id,
          title: ex.title,
          startDate: start,
          endDate: end,
          type: evType,
          status: ex.type,
          detailPath: `/exhibitions/${ex.id}`,
          subtitle: [ex.venue, ex.city].filter(Boolean).join(', ') || undefined,
        });
      }

      // Normalize production orders: ordered_date → deadline
      for (const po of productionRes.data ?? []) {
        if (!po.deadline) continue;
        const deadline = new Date(po.deadline);
        if (deadline < new Date(yearStart) || deadline > new Date(yearEnd)) continue;
        const start = po.ordered_date ? new Date(po.ordered_date) : deadline;
        // Clamp start to year boundary
        const clampedStart = start < new Date(yearStart) ? new Date(yearStart) : start;
        allEvents.push({
          id: po.id,
          title: po.title || po.order_number || 'Production Order',
          startDate: clampedStart,
          endDate: deadline,
          type: 'production_order',
          status: po.status,
          detailPath: `/production/${po.id}`,
        });
      }

      // Normalize projects
      for (const proj of projectsRes.data ?? []) {
        if (!proj.start_date) continue;
        const start = new Date(proj.start_date);
        const end = proj.end_date ? new Date(proj.end_date) : new Date(proj.start_date);
        if (end < new Date(yearStart) || start > new Date(yearEnd)) continue;
        allEvents.push({
          id: proj.id,
          title: proj.title,
          startDate: start,
          endDate: end,
          type: 'project',
          status: proj.status,
          detailPath: `/projects/${proj.id}`,
        });
      }

      setEvents(allEvents);
    } catch {
      toast({ title: 'Error', description: 'Failed to load schedule data.', variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [year, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filter by visible types
  const filteredEvents = useMemo(() => {
    if (!visibleTypes || visibleTypes.length === 0) return events;
    return events.filter((e) => visibleTypes.includes(e.type));
  }, [events, visibleTypes]);

  return { events: filteredEvents, allEvents: events, loading, refetch: fetchAll };
}
