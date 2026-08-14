import { useMemo, useState } from 'react';
import { CALENDAR_EVENTS } from './data';
import { ChevronLeft, ChevronRight } from './icons';
import { cn } from '../lib/cn';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const KIND_COLOUR: Record<string, string> = {
  class: '#173600',
  test: '#C05800',
  deadline: '#B91C1C',
};

function isoFor(year: number, month: number, day: number): string {
  return (
    year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0')
  );
}

export function Calendar() {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: 2026, month: 7 }); // August 2026
  const [selected, setSelected] = useState<string | null>(null);

  const grid = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    // Monday-first offset.
    const offset = (first.getDay() + 6) % 7;
    const cells: Array<number | null> = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof CALENDAR_EVENTS>();
    for (const ev of CALENDAR_EVENTS) {
      map.set(ev.date, [...(map.get(ev.date) ?? []), ev]);
    }
    return map;
  }, []);

  function shift(delta: number) {
    setCursor((c) => {
      const next = new Date(c.year, c.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
    setSelected(null);
  }

  const selectedEvents = selected ? (eventsByDate.get(selected) ?? []) : [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-sm uppercase tracking-[0.1em] text-ink">
          {MONTHS[cursor.month]} {cursor.year}
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="rounded-full border border-rule p-1.5 text-ink transition-colors hover:bg-ink hover:text-canvas"
          >
            <ChevronLeft width={16} height={16} />
          </button>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="rounded-full border border-rule p-1.5 text-ink transition-colors hover:bg-ink hover:text-canvas"
          >
            <ChevronRight width={16} height={16} />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center font-mono text-[10px] uppercase text-ink-faint">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((day, i) => {
          if (day === null) return <div key={'blank-' + i} />;
          const iso = isoFor(cursor.year, cursor.month, day);
          const events = eventsByDate.get(iso) ?? [];
          const isToday =
            today.getFullYear() === cursor.year &&
            today.getMonth() === cursor.month &&
            today.getDate() === day;
          const isSelected = selected === iso;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSelected(isSelected ? null : iso)}
              aria-label={day + ' ' + MONTHS[cursor.month] + (events.length ? ', has events' : '')}
              className={cn(
                'relative aspect-square rounded-lg text-sm transition-colors',
                isSelected
                  ? 'bg-ink text-canvas'
                  : isToday
                    ? 'border border-accent text-ink'
                    : 'text-ink-soft hover:bg-rule/40',
              )}
            >
              {day}
              {events.length > 0 && (
                <span className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                  {events.slice(0, 3).map((ev) => (
                    <span
                      key={ev.id}
                      className="h-1 w-1 rounded-full"
                      style={{
                        backgroundColor: isSelected ? '#FDFBD4' : KIND_COLOUR[ev.kind],
                      }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-rule pt-3">
        {selected === null ? (
          <p className="text-xs text-ink-faint">Select a date to see what is scheduled.</p>
        ) : selectedEvents.length === 0 ? (
          <p className="text-xs text-ink-faint">Nothing scheduled on this date.</p>
        ) : (
          <ul className="space-y-2">
            {selectedEvents.map((ev) => (
              <li key={ev.id} className="flex items-center gap-2 text-sm text-ink">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: KIND_COLOUR[ev.kind] }}
                />
                {ev.title}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
