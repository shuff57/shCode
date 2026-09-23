'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lessonPercent, useLessonState } from '../lib/progress';

interface LessonRef {
  id: string;
  /** Quiz question count or written rubric total; null/absent = binary. */
  maxScore?: number | null;
  /** 'quiz' or 'written' -- only meaningful when maxScore is set. */
  scoreKind?: 'quiz' | 'written' | null;
}

interface Props {
  lessons: LessonRef[];
  label?: string;
}

interface BreakdownRow {
  key: string;
  text: string;
  pct: number | null; // null = no meaningful percent (in progress / not started)
  color: string;
}

// One row summarizing every binary lesson (a regex/inFunction/model requirement,
// or a pass/fail rubric -- nothing in between to show per-lesson), then one row
// per quiz/written lesson with its own score. Numbered ('Quiz 1', 'Quiz 2', ...)
// since LessonRef carries no title -- enough to tell rows apart without
// threading lesson titles through every call site for a popover.
function breakdownRows(lessons: LessonRef[], snap: ReturnType<typeof useLessonState>): BreakdownRow[] {
  const binary = lessons.filter((l) => !l.maxScore);
  const partial = lessons.filter((l) => l.maxScore);
  const rows: BreakdownRow[] = [];
  if (binary.length) {
    const done = binary.filter((l) => snap.states[l.id] === 'completed').length;
    rows.push({
      key: 'binary',
      text: `${done}/${binary.length} binary lessons`,
      pct: Math.round((done / binary.length) * 100),
      color: done === binary.length ? '#50fa7b' : done > 0 ? '#8be9fd' : '#6272a4',
    });
  }
  let quizN = 0;
  let writtenN = 0;
  for (const l of partial) {
    const isWritten = l.scoreKind === 'written';
    const n = isWritten ? ++writtenN : ++quizN;
    const label = `${isWritten ? 'Written' : 'Quiz'} ${n}`;
    const state = snap.states[l.id];
    const score = snap.scores[l.id];
    if (state === 'completed' && score != null && l.maxScore) {
      const pct = Math.round((score / l.maxScore) * 100);
      rows.push({
        key: l.id,
        text: `${label}: ${score}/${l.maxScore}`,
        pct,
        color: pct >= 100 ? '#50fa7b' : pct > 0 ? '#f1fa8c' : '#ff5555',
      });
    } else if (state === 'completed') {
      // Summative -- the answer key is stripped client-side, so no fraction
      // ever comes back here; lessonPercent() already reads this as 100%.
      rows.push({ key: l.id, text: `${label}: submitted`, pct: 100, color: '#50fa7b' });
    } else if (state === 'started') {
      rows.push({ key: l.id, text: `${label}: in progress`, pct: null, color: '#f1fa8c' });
    } else {
      rows.push({ key: l.id, text: `${label}: not started`, pct: null, color: '#6272a4' });
    }
  }
  return rows;
}

// The percentage is a weighted average across `lessons`, not a plain
// done/total count: a binary lesson (regex/inFunction/model, or a pass/fail
// rubric) is 0 or 100, but a quiz or written response contributes its real
// score (see lib/progress.ts lessonPercent()). Passing more lessons in
// naturally weights a bigger submodule higher inside its chapter's number --
// no separate weighting step needed.
//
// Click opens a popover with the per-lesson breakdown (breakdownRows()).
// Portaled to document.body with fixed positioning, not plain absolute --
// this sits inside an `overflow-hidden` accordion (<details> in
// LessonSearchFilter.tsx, kept for the collapse animation), which clips an
// absolutely-positioned child outright. Same pattern as LessonAccessChip.tsx.
// The trigger button also stopPropagates: it sits inside a <summary>, and an
// unguarded click there would toggle the parent <details> open/closed too.
const PANEL_W = 260;

export default function UnitProgressBadge({ lessons, label }: Props) {
  const snap = useLessonState();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const total = lessons.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const below = r.bottom + 6;
    const PANEL_H = 280;
    const top = below + PANEL_H > window.innerHeight ? Math.max(6, r.top - PANEL_H - 6) : below;
    const left = Math.min(Math.max(6, r.right - PANEL_W), window.innerWidth - PANEL_W - 6);
    setPos({ top, left });
  }, [open]);

  if (total === 0) return null;
  if (!snap.loaded) return null;
  if (!snap.authed) {
    return (
      <span style={{ fontSize: 12, color: '#6272a4', whiteSpace: 'nowrap' }}>
        <span style={{ color: '#8be9fd' }}>Sign in</span> to track
      </span>
    );
  }

  const done = lessons.filter((l) => snap.states[l.id] === 'completed').length;
  const started = lessons.filter((l) => snap.states[l.id] === 'started').length;
  const pct = Math.round(
    lessons.reduce((sum, l) => sum + lessonPercent(snap.states[l.id], snap.scores[l.id], l.maxScore), 0) / total,
  );
  const allDone = done === total;
  const rows = breakdownRows(lessons, snap);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label ? label + ': ' : ''}${done}/${total} complete, ${pct}% weighted. Click for a breakdown.`}
        onClick={(e) => {
          // Stops the parent <summary> from toggling its <details> open/closed.
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          font: 'inherit',
          color: 'inherit',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            position: 'relative',
            display: 'inline-block',
            width: 80,
            height: 6,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {started > 0 ? (
            <span
              style={{
                position: 'absolute',
                inset: 0,
                width: `${Math.round(((done + started) / total) * 100)}%`,
                background: '#f1fa8c55',
              }}
            />
          ) : null}
          <span
            style={{
              position: 'absolute',
              inset: 0,
              width: `${pct}%`,
              height: '100%',
              background: allDone ? '#50fa7b' : '#8be9fd',
              transition: 'width 200ms ease',
            }}
          />
        </span>
        <span style={{ color: allDone ? '#50fa7b' : 'inherit', fontWeight: 600 }}>
          {pct}%
        </span>
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={`${label ? label + ' progress' : 'Progress'} breakdown`}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: PANEL_W,
              maxHeight: 280,
              overflowY: 'auto',
              background: '#282a36',
              border: '1px solid #44475a',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
              padding: 12,
              zIndex: 1000,
              fontSize: 12,
              color: '#f8f8f2',
              fontFamily: 'inherit',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              {label ? `${label}: ` : ''}{pct}% weighted
              <span style={{ opacity: 0.6, fontWeight: 400 }}>
                {' '}({done}/{total} complete{started ? `, ${started} in progress` : ''})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rows.map((r) => (
                <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    aria-hidden="true"
                    style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }}
                  />
                  <span style={{ flex: 1 }}>{r.text}</span>
                  {r.pct != null && (
                    <span style={{ color: r.color, fontWeight: 600 }}>{r.pct}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
