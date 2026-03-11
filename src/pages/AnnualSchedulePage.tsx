import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  startOfISOWeek,
  getISOWeek,
  eachWeekOfInterval,
  addDays,
  format,
} from 'date-fns';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAnnualSchedule } from '../hooks/useAnnualSchedule';
import type { ScheduleEvent, ScheduleEventType } from '../hooks/useAnnualSchedule';
import { SCHEDULE_EVENT_COLORS } from '../lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeekGroup {
  weekNumber: number;
  monday: Date;
  events: ScheduleEvent[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_TYPES: ScheduleEventType[] = [
  'production_order',
  'exhibition',
  'art_fair',
  'solo_show',
  'group_show',
  'project',
];

/** Format a date as dd.MM.yyyy */
function fmtDate(d: Date): string {
  return format(d, 'dd.MM.yyyy');
}

/** Format event date range: dd.MM – dd.MM.yyyy (or single date if same) */
function fmtDateRange(start: Date, end: Date): string {
  if (start.getTime() === end.getTime()) return fmtDate(start);
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'dd.MM')} – ${format(end, 'dd.MM.yyyy')}`;
  }
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

/**
 * Determine the anchor date that places an event into a specific week:
 * - Production orders → deadline (endDate)
 * - Exhibitions / art fairs / shows → opening date (startDate)
 * - Projects → startDate
 */
function getAnchorDate(event: ScheduleEvent): Date {
  if (event.type === 'production_order') return event.endDate;
  return event.startDate;
}

/**
 * Group events by ISO calendar week based on their anchor date.
 * Each event appears in exactly one week. Returns array sorted by monday.
 */
function groupEventsByWeek(events: ScheduleEvent[], year: number): WeekGroup[] {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const weekStarts = eachWeekOfInterval(
    { start: yearStart, end: yearEnd },
    { weekStartsOn: 1 },
  );

  const groups: WeekGroup[] = [];
  const seen = new Set<number>();

  for (const ws of weekStarts) {
    const monday = startOfISOWeek(ws);
    const sunday = addDays(monday, 6);
    const wn = getISOWeek(monday);

    // Dedupe edge-case weeks
    const key = monday.getTime();
    if (seen.has(key)) continue;
    seen.add(key);

    // Match events whose anchor date falls within this week
    const matching = events.filter((e) => {
      const anchor = getAnchorDate(e);
      return anchor >= monday && anchor <= sunday;
    });

    groups.push({ weekNumber: wn, monday, events: matching });
  }

  return groups.sort((a, b) => a.monday.getTime() - b.monday.getTime());
}

/** Check if a date falls in the current ISO week */
function isCurrentWeek(monday: Date): boolean {
  const now = new Date();
  const curMonday = startOfISOWeek(now);
  return (
    monday.getFullYear() === curMonday.getFullYear() &&
    monday.getMonth() === curMonday.getMonth() &&
    monday.getDate() === curMonday.getDate()
  );
}

// ---------------------------------------------------------------------------
// AnnualSchedulePage
// ---------------------------------------------------------------------------

export function AnnualSchedulePage() {
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [visibleTypes, setVisibleTypes] = useState<ScheduleEventType[]>([...ALL_TYPES]);

  const { events, loading } = useAnnualSchedule({ year, visibleTypes });

  const weekGroups = useMemo(() => groupEventsByWeek(events, year), [events, year]);

  const toggleType = useCallback((type: ScheduleEventType) => {
    setVisibleTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Annual Schedule</h1>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setYear((y) => y - 1)}>
            ←
          </Button>
          <span className="text-lg font-semibold min-w-[4rem] text-center">{year}</span>
          <Button variant="primary" onClick={() => setYear((y) => y + 1)}>
            →
          </Button>
        </div>
      </div>

      {/* Filter toggles */}
      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map((type) => {
          const colors = SCHEDULE_EVENT_COLORS[type];
          const active = visibleTypes.includes(type);
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? `${colors.light} border-current`
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${active ? colors.bg : 'bg-gray-300'}`}
              />
              {colors.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">KW</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Montag</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Daten</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Partner</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Venue</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Titel</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Ort</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Land</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Notiz</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {weekGroups.map((group) => {
                  const currentWk = isCurrentWeek(group.monday);
                  const hasEvents = group.events.length > 0;
                  const rowCount = Math.max(group.events.length, 1);

                  if (!hasEvents) {
                    // Empty week — single row with KW + Montag
                    return (
                      <tr
                        key={`${group.monday.getTime()}-empty`}
                        className={`border-t border-gray-200 ${currentWk ? 'bg-blue-50/60' : ''}`}
                      >
                        <td className="px-3 py-2 text-sm font-semibold text-gray-700 whitespace-nowrap">{group.weekNumber}</td>
                        <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{fmtDate(group.monday)}</td>
                        <td className="px-3 py-2 text-sm text-gray-300" colSpan={7} />
                      </tr>
                    );
                  }

                  return group.events.map((event, idx) => {
                    const isFirst = idx === 0;
                    const colors = SCHEDULE_EVENT_COLORS[event.type] || SCHEDULE_EVENT_COLORS.project;

                    return (
                      <tr
                        key={`${group.weekNumber}-${event.id}`}
                        className={`${currentWk ? 'bg-blue-50/60' : ''} ${isFirst ? 'border-t border-gray-200' : 'border-t border-gray-100'}`}
                      >
                        {/* KW — rowSpan if multiple events */}
                        {isFirst && (
                          <td
                            className="px-3 py-2 text-sm font-semibold text-gray-700 align-top whitespace-nowrap"
                            rowSpan={rowCount}
                          >
                            {group.weekNumber}
                          </td>
                        )}

                        {/* Montag — rowSpan if multiple events */}
                        {isFirst && (
                          <td
                            className="px-3 py-2 text-sm text-gray-600 align-top whitespace-nowrap"
                            rowSpan={rowCount}
                          >
                            {fmtDate(group.monday)}
                          </td>
                        )}

                        {/* Daten */}
                        <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
                          {fmtDateRange(event.startDate, event.endDate)}
                        </td>

                        {/* Partner */}
                        <td className="px-3 py-2 text-sm text-gray-600">
                          {event.partner || '—'}
                        </td>

                        {/* Venue */}
                        <td className="px-3 py-2 text-sm text-gray-600">
                          {event.venue || '—'}
                        </td>

                        {/* Titel — clickable, with type color dot */}
                        <td className="px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${colors.bg}`} />
                            <button
                              type="button"
                              className="text-left font-medium text-gray-900 hover:text-blue-700 hover:underline transition-colors"
                              onClick={() => navigate(event.detailPath)}
                            >
                              {event.title}
                            </button>
                          </div>
                        </td>

                        {/* Ort */}
                        <td className="px-3 py-2 text-sm text-gray-600">
                          {event.city || '—'}
                        </td>

                        {/* Land */}
                        <td className="px-3 py-2 text-sm text-gray-600">
                          {event.country || '—'}
                        </td>

                        {/* Notiz */}
                        <td className="px-3 py-2 text-sm text-gray-500 max-w-[200px] truncate" title={event.notes || ''}>
                          {event.notes || '—'}
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
      </Card>
    </div>
  );
}
