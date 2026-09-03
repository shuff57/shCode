'use client';

// A month-grid date picker for the due-date chips.
//
// Why not <input type="date">: its calendar only opens if you hit the little
// icon at the right edge, and showPicker() needs a live user gesture that a
// React effect has usually already spent. A teacher clicking a date wants the
// month, so the month is what opens.
//
// Rendered through a portal onto document.body with fixed positioning. Every
// chip sits inside a <details> carrying `overflow-hidden`, which would clip an
// absolutely-positioned popover to the accordion's box.
//
// All dates here are zoneless YYYY-MM-DD strings and all arithmetic is in UTC.
// That is deliberate: the calendar grid is a calendar, not an instant, and the
// conversion to "23:59:59.999 in the school timezone" happens once, on the
// server. Doing any of it in the browser's local zone would shift the grid for
// a teacher travelling.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const C = {
  bg: '#282a36',
  raised: '#343746',
  border: '#44475a',
  text: '#f8f8f2',
  dim: '#6272a4',
  accent: '#8be9fd',
  today: '#f1fa8c',
  late: '#ff5555',
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PANEL_W = 244;
const PANEL_H = 292;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseISO(s: string | null): { y: number; m: number; d: number } | null {
  if (!s) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function firstWeekday(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 1)).getUTCDay();
}

export interface CalendarPopoverProps {
  /** The button the panel hangs off. */
  anchor: HTMLElement | null;
  /** Currently selected day, YYYY-MM-DD, or null for nothing set. */
  value: string | null;
  /** Today in the school timezone, YYYY-MM-DD — highlighted in the grid. */
  today: string;
  onPick: (date: string) => void;
  onClear?: () => void;
  onClose: () => void;
  /**
   * HH:MM in the school timezone, shown as a time row under the grid. Omit
   * `onTimeChange` entirely for a date-only popover (nothing renders).
   */
  time?: string;
  onTimeChange?: (time: string) => void;
  timeLabel?: string;
}

export default function CalendarPopover({
  anchor,
  value,
  today,
  onPick,
  onClear,
  onClose,
  time,
  onTimeChange,
  timeLabel = 'Time',
}: CalendarPopoverProps) {
  const selected = parseISO(value);
  const todayParts = parseISO(today);
  const start = selected ?? todayParts ?? { y: 2026, m: 0, d: 1 };

  const [view, setView] = useState({ y: start.y, m: start.m });
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Flip above / nudge inward so the panel is never off-screen. Runs before
  // paint so it does not visibly jump.
  useLayoutEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const below = r.bottom + 6;
    const top = below + PANEL_H > window.innerHeight ? Math.max(6, r.top - PANEL_H - 6) : below;
    const left = Math.min(Math.max(6, r.left), window.innerWidth - PANEL_W - 6);
    setPos({ top, left });
  }, [anchor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchor?.contains(t)) return; // the chip toggles itself
      onClose();
    };
    document.addEventListener('keydown', onKey);
    // Capture phase: cards are links, and a click on the page behind the panel
    // should dismiss it rather than navigate.
    document.addEventListener('mousedown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [anchor, onClose]);

  if (typeof document === 'undefined' || !pos) return null;

  const total = daysInMonth(view.y, view.m);
  const lead = firstWeekday(view.y, view.m);
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shiftMonth = (delta: number) => {
    const m = view.m + delta;
    setView({ y: view.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 });
  };

  const navBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: C.dim,
    cursor: 'pointer',
    padding: 4,
    borderRadius: 4,
  };

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Pick a due date"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: PANEL_W,
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        padding: 10,
        zIndex: 1000,
        fontSize: 13,
        color: C.text,
        fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)} style={navBtn}>
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <span style={{ fontWeight: 600 }}>
          {MONTHS[view.m]} {view.y}
        </span>
        <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)} style={navBtn}>
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {WEEKDAYS.map((w, i) => (
          <span
            key={`${w}${i}`}
            style={{ textAlign: 'center', color: C.dim, fontSize: 11, paddingBottom: 2 }}
          >
            {w}
          </span>
        ))}

        {cells.map((day, i) => {
          if (day === null) return <span key={`pad${i}`} />;
          const dayIso = iso(view.y, view.m, day);
          const isSelected = dayIso === value;
          const isToday = dayIso === today;
          const isPast = dayIso < today;
          return (
            <button
              key={dayIso}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPick(dayIso);
              }}
              title={isPast ? 'In the past — anything not finished counts as late immediately' : undefined}
              style={{
                background: isSelected ? C.accent : 'none',
                color: isSelected ? C.bg : isToday ? C.today : isPast ? C.dim : C.text,
                border: isToday && !isSelected ? `1px solid ${C.today}` : '1px solid transparent',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'inherit',
                fontWeight: isSelected || isToday ? 600 : 400,
                padding: '4px 0',
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {onTimeChange && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
            paddingTop: 8,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <label htmlFor="calendar-popover-time" style={{ color: C.dim, fontSize: 12 }}>
            {timeLabel}
          </label>
          <input
            id="calendar-popover-time"
            type="time"
            value={time ?? ''}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onTimeChange(e.target.value);
            }}
            style={{
              background: C.raised,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              color: C.text,
              fontSize: 12,
              fontFamily: 'inherit',
              padding: '2px 4px',
              colorScheme: 'dark',
            }}
          />
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 8,
          paddingTop: 8,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPick(today);
          }}
          style={{ ...navBtn, color: C.today, padding: '2px 6px' }}
        >
          Today
        </button>
        {onClear && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClear();
            }}
            style={{ ...navBtn, color: C.late, padding: '2px 6px' }}
          >
            Clear
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
