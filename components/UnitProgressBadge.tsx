'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lessonPercent, useLessonState } from '../lib/progress';
import { useGradingWeights } from '../lib/grading-weights-client';
import {
  CATEGORY_LABEL,
  GRADE_CATEGORIES,
  lessonGradeCategory,
  weightedGradePercent,
  type GradeCategory,
} from '../lib/grading-weights';

interface LessonRef {
  id: string;
  /** Numbered title, e.g. "1.7.2 ..." -- how lessonGradeCategory finds the
   *  module id (chapter test / synthesis project) a lesson belongs to. */
  title: string;
  preview?: string | null;
  assignmentCode?: string | null;
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
  header?: boolean;
}

// Grouped by grade category (Weekly Lab, Quiz, Written, Chapter Test, ...) so
// each row shows the category's own weight alongside its completion -- the
// thing this popover didn't show before 2026-09-23: every lesson counted
// equally regardless of what curriculum-plan.md's GRADING STRUCTURE says it's
// worth. Within a category, one summary row for binary lessons plus one row
// per quiz/written lesson with its own score -- same detail as before.
function breakdownRows(
  lessons: LessonRef[],
  snap: ReturnType<typeof useLessonState>,
  weights: Record<GradeCategory, number>,
): BreakdownRow[] {
  const byCategory = new Map<GradeCategory, LessonRef[]>();
  const uncategorized: LessonRef[] = [];
  for (const l of lessons) {
    const cat = lessonGradeCategory(l);
    if (cat == null) {
      uncategorized.push(l);
      continue;
    }
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(l);
  }

  const rows: BreakdownRow[] = [];
  let quizN = 0;
  let writtenN = 0;

  for (const category of GRADE_CATEGORIES) {
    const group = byCategory.get(category);
    if (!group || group.length === 0) continue;

    const percents = group.map((l) => lessonPercent(snap.states[l.id], snap.scores[l.id], l.maxScore));
    const avg = Math.round(percents.reduce((s, p) => s + p, 0) / percents.length);
    rows.push({
      key: `cat-${category}`,
      text: `${CATEGORY_LABEL[category]} — ${weights[category]}% of grade`,
      pct: avg,
      color: avg >= 100 ? '#50fa7b' : avg > 0 ? '#f1fa8c' : '#6272a4',
      header: true,
    });

    const binary = group.filter((l) => !l.maxScore);
    const partial = group.filter((l) => l.maxScore);
    if (binary.length) {
      const done = binary.filter((l) => snap.states[l.id] === 'completed').length;
      rows.push({
        key: `${category}-binary`,
        text: `${done}/${binary.length} lesson${binary.length === 1 ? '' : 's'}`,
        pct: Math.round((done / binary.length) * 100),
        color: done === binary.length ? '#50fa7b' : done > 0 ? '#8be9fd' : '#6272a4',
      });
    }
    for (const l of partial) {
      const isWritten = l.scoreKind === 'written';
      const n = isWritten ? ++writtenN : ++quizN;
      const rowLabel = `${isWritten ? 'Written' : 'Quiz'} ${n}`;
      const state = snap.states[l.id];
      const score = snap.scores[l.id];
      if (state === 'completed' && score != null && l.maxScore) {
        const pct = Math.round((score / l.maxScore) * 100);
        rows.push({
          key: l.id,
          text: `${rowLabel}: ${score}/${l.maxScore}`,
          pct,
          color: pct >= 100 ? '#50fa7b' : pct > 0 ? '#f1fa8c' : '#ff5555',
        });
      } else if (state === 'completed') {
        // Summative -- the answer key is stripped client-side, so no fraction
        // ever comes back here; lessonPercent() already reads this as 100%.
        rows.push({ key: l.id, text: `${rowLabel}: submitted`, pct: 100, color: '#50fa7b' });
      } else if (state === 'started') {
        rows.push({ key: l.id, text: `${rowLabel}: in progress`, pct: null, color: '#f1fa8c' });
      } else {
        rows.push({ key: l.id, text: `${rowLabel}: not started`, pct: null, color: '#6272a4' });
      }
    }
  }

  if (uncategorized.length) {
    const done = uncategorized.filter((l) => snap.states[l.id] === 'completed').length;
    rows.push({
      key: 'ungraded',
      text: `${done}/${uncategorized.length} reading${uncategorized.length === 1 ? '' : 's'}/examples — not graded`,
      pct: null,
      color: '#6272a4',
    });
  }

  return rows;
}

// The percentage is a grade-weighted average, not a plain done/total count
// or an equal-weight lesson average: each lesson is first classified into a
// grading-plan category (Weekly Lab / Written / Quiz / Chapter Test / Final /
// Q1-Q2-Q4 Synthesis -- see lib/grading-weights.ts lessonGradeCategory), then
// categories are combined using this student's class's weights (teacher-set
// via GradingWeightsPanel, defaulting to curriculum-plan.md's GRADING
// STRUCTURE table). A category with nothing in this lesson group yet doesn't
// drag the number down -- weightedGradePercent() renormalizes across
// whatever categories are actually present.
//
// Click opens a popover with the per-category, per-lesson breakdown
// (breakdownRows()). Portaled to document.body with fixed positioning, not
// plain absolute -- this sits inside an `overflow-hidden` accordion (<details>
// in LessonSearchFilter.tsx, kept for the collapse animation), which clips an
// absolutely-positioned child outright. Same pattern as LessonAccessChip.tsx.
// The trigger button also stopPropagates: it sits inside a <summary>, and an
// unguarded click there would toggle the parent <details> open/closed too.
const PANEL_W = 280;

export default function UnitProgressBadge({ lessons, label }: Props) {
  const snap = useLessonState();
  const weightsSnap = useGradingWeights();
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
    const PANEL_H = 320;
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
  const categorized = lessons.map((l) => ({
    category: lessonGradeCategory(l),
    percent: lessonPercent(snap.states[l.id], snap.scores[l.id], l.maxScore),
  }));
  const pct = weightedGradePercent(categorized, weightsSnap.weights);
  const allDone = done === total;
  const rows = breakdownRows(lessons, snap, weightsSnap.weights);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label ? label + ': ' : ''}${done}/${total} complete, ${pct}% of grade. Click for a breakdown.`}
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
              maxHeight: 320,
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
              {label ? `${label}: ` : ''}{pct}% of grade
              <span style={{ opacity: 0.6, fontWeight: 400 }}>
                {' '}({done}/{total} complete{started ? `, ${started} in progress` : ''})
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rows.map((r) => (
                <div
                  key={r.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: r.header ? 4 : 0,
                    paddingLeft: r.header ? 0 : 14,
                    fontWeight: r.header ? 700 : 400,
                  }}
                >
                  {!r.header && (
                    <span
                      aria-hidden="true"
                      style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }}
                    />
                  )}
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
