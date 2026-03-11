import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  startOfISOWeek,
  endOfISOWeek,
  getISOWeek,
  eachWeekOfInterval,
  addDays,
  getMonth,
  isToday,
  isSameDay,
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

interface WeekInfo {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: Date[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ALL_TYPES: ScheduleEventType[] = [
  'production_order',
  'exhibition',
  'art_fair',
  'solo_show',
  'group_show',
  'project',
];

function generateWeeks(year: number): WeekInfo[] {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);

  const weekStarts = eachWeekOfInterval(
    { start: yearStart, end: yearEnd },
    { weekStartsOn: 1 },
  );

  return weekStarts.map((ws) => {
    const start = startOfISOWeek(ws);
    const end = endOfISOWeek(ws);
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return { weekNumber: getISOWeek(ws), startDate: start, endDate: end, days };
  });
}

function mapEventsToWeeks(
  events: ScheduleEvent[],
  weeks: WeekInfo[],
): Map<number, ScheduleEvent[]> {
  const map = new Map<number, ScheduleEvent[]>();
  for (let wi = 0; wi < weeks.length; wi++) {
    const week = weeks[wi];
    const matching = events.filter(
      (e) => e.startDate <= week.endDate && e.endDate >= week.startDate,
    );
    if (matching.length > 0) {
      map.set(wi, matching);
    }
  }
  return map;
}

function calculateBarPosition(
  event: ScheduleEvent,
  week: WeekInfo,
): { left: number; width: number } {
  const weekStart = week.startDate.getTime();
  const weekEnd = week.endDate.getTime() + 86400000; // include end day fully
  const weekDuration = weekEnd - weekStart;
  if (weekDuration <= 0) return { left: 0, width: 100 };

  const barStart = Math.max(event.startDate.getTime(), weekStart);
  const barEnd = Math.min(event.endDate.getTime() + 86400000, weekEnd); // include end day

  const left = ((barStart - weekStart) / weekDuration) * 100;
  const width = Math.max(((barEnd - barStart) / weekDuration) * 100, 3); // min 3% for visibility

  return { left, width };
}

function getTodayPosition(week: WeekInfo): number | null {
  const today = new Date();
  for (let i = 0; i < week.days.length; i++) {
    if (isSameDay(today, week.days[i]) || isToday(week.days[i])) {
      return ((i + 0.5) / 7) * 100;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Month header: compute month spans across weeks
// ---------------------------------------------------------------------------

interface MonthSpan {
  month: number;
  label: string;
  startWeekIdx: number;
  count: number;
}

function computeMonthSpans(weeks: WeekInfo[], year: number): MonthSpan[] {
  const spans: MonthSpan[] = [];
  let currentMonth = -1;
  for (let i = 0; i < weeks.length; i++) {
    // Use the Thursday of the week to determine which month the week belongs to (ISO convention)
    const thursday = addDays(weeks[i].startDate, 3);
    const m = getMonth(thursday);
    // Only include weeks whose Thursday falls in the target year
    if (thursday.getFullYear() !== year) continue;
    if (m !== currentMonth) {
      spans.push({ month: m, label: MONTH_NAMES[m], startWeekIdx: i, count: 1 });
      currentMonth = m;
    } else {
      spans[spans.length - 1].count++;
    }
  }
  return spans;
}

// ---------------------------------------------------------------------------
// GanttWeekRow
// ---------------------------------------------------------------------------

function GanttWeekRow({
  week,
  weekIdx,
  events,
  onEventClick,
}: {
  week: WeekInfo;
  weekIdx: number;
  events: ScheduleEvent[];
  onEventClick: (e: ScheduleEvent) => void;
}) {
  const todayPos = getTodayPosition(week);
  const hasToday = todayPos !== null;
  const barHeight = 22;
  const barGap = 2;
  const minRowHeight = 28;
  const rowHeight = Math.max(minRowHeight, events.length * (barHeight + barGap) + 4);

  return (
    <div
      className={`flex border-b border-gray-100 ${hasToday ? 'bg-blue-50/40' : ''}`}
      style={{ minHeight: `${rowHeight}px` }}
    >
      {/* CW label */}
      <div className="w-11 shrink-0 flex items-start justify-center pt-1 text-[10px] text-gray-400 font-medium border-r border-gray-200 select-none">
        {week.weekNumber}
      </div>

      {/* 7-day grid + event bars */}
      <div className="flex-1 relative">
        {/* Day columns grid lines */}
        <div className="absolute inset-0 grid grid-cols-7">
          {week.days.map((day, i) => (
            <div
              key={i}
              className={`border-r border-gray-50 ${i >= 5 ? 'bg-gray-50/50' : ''}`}
            />
          ))}
        </div>

        {/* Event bars */}
        {events.map((event, idx) => {
          const { left, width } = calculateBarPosition(event, week);
          const colors = SCHEDULE_EVENT_COLORS[event.type] || SCHEDULE_EVENT_COLORS.project;
          return (
            <div
              key={`${event.id}-${weekIdx}`}
              className={`absolute rounded-sm text-[10px] font-medium px-1.5 truncate cursor-pointer hover:brightness-110 transition-all ${colors.bg} ${colors.text}`}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                top: `${idx * (barHeight + barGap) + 2}px`,
                height: `${barHeight}px`,
                lineHeight: `${barHeight}px`,
              }}
              onClick={() => onEventClick(event)}
              title={`${event.title}\n${format(event.startDate, 'dd.MM.yyyy')} – ${format(event.endDate, 'dd.MM.yyyy')}${event.subtitle ? `\n${event.subtitle}` : ''}`}
            >
              {event.title}
            </div>
          );
        })}

        {/* Today indicator */}
        {todayPos !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
            style={{ left: `${todayPos}%` }}
          />
        )}
      </div>
    </div>
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

  const weeks = useMemo(() => generateWeeks(year), [year]);
  const monthSpans = useMemo(() => computeMonthSpans(weeks, year), [weeks, year]);
  const eventsByWeek = useMemo(() => mapEventsToWeeks(events, weeks), [events, weeks]);

  const toggleType = useCallback((type: ScheduleEventType) => {
    setVisibleTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }, []);

  const handleEventClick = useCallback(
    (event: ScheduleEvent) => navigate(event.detailPath),
    [navigate],
  );

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

      {/* Gantt chart */}
      <Card>
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)]">
          <div className="min-w-[700px]">
            {/* Sticky month header */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
              {/* Month row */}
              <div className="flex">
                <div className="w-11 shrink-0 border-r border-gray-200 text-[10px] text-gray-400 font-medium flex items-center justify-center">
                  CW
                </div>
                <div className="flex-1 flex">
                  {monthSpans.map((ms) => (
                    <div
                      key={ms.month}
                      className="text-center text-xs font-semibold text-gray-600 py-1.5 border-r border-gray-100"
                      style={{ flex: ms.count }}
                    >
                      {ms.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Week rows */}
            {weeks.map((week, idx) => (
              <GanttWeekRow
                key={idx}
                week={week}
                weekIdx={idx}
                events={eventsByWeek.get(idx) ?? []}
                onEventClick={handleEventClick}
              />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
