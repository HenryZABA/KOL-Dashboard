import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PlatformIcon } from '@/components/kol/PlatformIcon';
import { DayDetailDialog } from './DayDetailDialog';
import type { KolMetricSummary } from '@/hooks/useVideoMetrics';
import type { KolConversion, KolConversionAgg } from '@/hooks/useKolConversions';
import type { Platform } from '@/lib/mock-data';
import { cn, formatNumber } from '@/lib/utils';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface CalendarViewProps {
  kolSummaries: KolMetricSummary[];
  conversionMap: Map<string, KolConversionAgg>;
  conversionsByKol: Map<string, KolConversion[]>;
}

export function CalendarView({ kolSummaries, conversionMap, conversionsByKol }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Group summaries by date key (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, KolMetricSummary[]>();
    for (const s of kolSummaries) {
      if (!s.kol.publishedAt) continue;
      const key = new Date(s.kol.publishedAt).toISOString().slice(0, 10);
      const arr = map.get(key) || [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [kolSummaries]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    // Weekday of first day (0=Sun, convert to Mon-based: 0=Mon)
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6; // Sunday

    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Build grid
    const days: { date: Date; key: string; inMonth: boolean }[] = [];

    // Previous month fill
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, key: toDateKey(d), inMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      days.push({ date, key: toDateKey(date), inMonth: true });
    }

    // Next month fill (complete last week)
    while (days.length % 7 !== 0) {
      const d = new Date(year, month + 1, days.length - startOffset - daysInMonth + 1);
      days.push({ date: d, key: toDateKey(d), inMonth: false });
    }

    return days;
  }, [currentMonth]);

  const monthLabel = currentMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const todayKey = toDateKey(new Date());

  const selectedEntries = selectedDate ? (eventsByDate.get(selectedDate) || []) : [];
  const selectedLabel = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevMonth}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
        <button
          onClick={goToNextMonth}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {calendarDays.map(({ date, key, inMonth }) => {
          const events = eventsByDate.get(key) || [];
          const hasEvents = events.length > 0;
          const isToday = key === todayKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => hasEvents && setSelectedDate(key)}
              className={cn(
                'bg-card p-1.5 min-h-[5rem] text-left transition-colors flex flex-col',
                !inMonth && 'opacity-40',
                hasEvents && 'cursor-pointer hover:bg-accent/50',
                !hasEvents && 'cursor-default',
              )}
            >
              {/* Day number */}
              <span
                className={cn(
                  'text-[11px] font-medium leading-none mb-1',
                  isToday && 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center',
                  !isToday && 'text-foreground',
                )}
              >
                {date.getDate()}
              </span>

              {/* Event indicators */}
              {hasEvents && (
                <div className="flex flex-col gap-0.5 mt-auto overflow-hidden">
                  {events.slice(0, 3).map((s) => (
                    <div key={s.kol.id} className="flex items-center gap-0.5 min-w-0">
                      {s.kol.platforms.slice(0, 2).map((p: Platform) => (
                        <PlatformIcon key={p} platform={p} className="h-2.5 w-2.5 shrink-0" />
                      ))}
                      <span className="text-[9px] text-card-foreground truncate leading-tight">
                        {s.kol.name}
                      </span>
                    </div>
                  ))}
                  {events.length > 3 && (
                    <span className="text-[8px] text-muted-foreground">+{events.length - 3} more</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Monthly summary */}
      <MonthSummary calendarDays={calendarDays} eventsByDate={eventsByDate} conversionMap={conversionMap} />

      {/* Day detail dialog */}
      <DayDetailDialog
        date={selectedLabel}
        entries={selectedEntries}
        conversionMap={conversionMap}
        conversionsByKol={conversionsByKol}
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
      />
    </div>
  );
}

function MonthSummary({
  calendarDays,
  eventsByDate,
  conversionMap,
}: {
  calendarDays: { key: string; inMonth: boolean }[];
  eventsByDate: Map<string, KolMetricSummary[]>;
  conversionMap: Map<string, KolConversionAgg>;
}) {
  const stats = useMemo(() => {
    let kolCount = 0, views = 0, signups = 0, paid = 0;
    const seen = new Set<string>();
    for (const { key, inMonth } of calendarDays) {
      if (!inMonth) continue;
      const entries = eventsByDate.get(key);
      if (!entries) continue;
      for (const e of entries) {
        if (seen.has(e.kol.id)) continue;
        seen.add(e.kol.id);
        kolCount++;
        views += e.totals.views;
        const c = conversionMap.get(e.kol.id);
        if (c) { signups += c.signups; paid += c.paid_users; }
      }
    }
    return { kolCount, views, signups, paid };
  }, [calendarDays, eventsByDate, conversionMap]);

  if (stats.kolCount === 0) return null;

  return (
    <div className="flex items-center gap-4 text-[10px] text-muted-foreground px-1">
      <span>{stats.kolCount} KOLs published this month</span>
      <span>Views {formatNumber(stats.views)}</span>
      <span>Signups {formatNumber(stats.signups)}</span>
      <span>Paid {formatNumber(stats.paid)}</span>
    </div>
  );
}
