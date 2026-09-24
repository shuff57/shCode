'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { lessonPercent, useLessonState } from '../lib/progress';
import { useGradingWeights } from '../lib/grading-weights-client';
import { lessonHref } from '../lib/lesson-href';
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
  /** Lesson type -- decides the /lesson vs /assignment prefix via
   *  lessonHref(). Guessing it renders the wrong chrome, not a 404. */
  type?: string | null;
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
  /** Lesson title, or the category label for a header row. */
  text: string;
  /** Short state note beside the title -- '6/10', 'in progress', etc. */
  detail?: string;
  /** Set on a lesson row so it links to that lesson; absent on headers. */
  href?: string;
  pct: number | null; // null = no meaningful percent (in progress / not started)
  color: string;
  header?: boolean;
}

// Every row names the actual assignment and links to it, instead of the
// anonymous "Quiz 3: 6/10" numbering this used to show. The title is the row;
// the state note ('6/10', 'in progress') sits beside it, and the row links
// through lessonHref() so the /lesson vs /assignment prefix is read off the
// lesson's own type rather than guessed.
//
// A category with many lessons keeps a header and lists each one -- the
// popover already scrolls (maxHeight), so a 27-lab category is browsable
// rather than collapsed into a count the reader cannot act on.
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

  // Order inside a category by numbered title so '1.1.2' precedes '1.1.10'
  // (a plain string sort puts 10 first).
  const byTitle = (a: LessonRef, b: LessonRef) =>
    a.title.localeCompare(b.title, undefined, { numeric: true });

  function lessonRow(l: LessonRef): BreakdownRow {
    const state = snap.states[l.id];
    const score = snap.scores[l.id];
    const base = { key: l.id, text: l.title, href: lessonHref(l) };
    if (state === 'completed' && score != null && l.maxScore) {
      const pct = Math.round((score / l.maxScore) * 100);
      return {
        ...base,
        detail: `${score}/${l.maxScore}`,
        pct,
        color: pct >= 100 ? '#50fa7b' : pct > 0 ? '#f1fa8c' : '#ff5555',
      };
    }
    // Summative -- the key is stripped client-side, so no fraction comes back;
    // a completed test is sat, not failed for awaiting a mark.
    if (state === 'completed') return { ...base, detail: 'submitted', pct: 100, color: '#50fa7b' };
    if (state === 'started') return { ...base, detail: 'in progress', pct: null, color: '#f1fa8c' };
    return { ...base, detail: 'not started', pct: null, color: '#6272a4' };
  }

  for (const category of GRADE_CATEGORIES) {
    const group = byCategory.get(category);
    if (!group || group.length === 0) continue;
    group.sort(byTitle);

    const percents = group.map((l) => lessonPercent(snap.states[l.id], snap.scores[l.id], l.maxScore));
    const avg = Math.round(percents.reduce((s, p) => s + p, 0) / percents.length);
    rows.push({
      key: `cat-${category}`,
      text: `${CATEGORY_LABEL[category]} — ${weights[category]}% of grade`,
      pct: avg,
      color: avg >= 100 ? '#50fa7b' : avg > 0 ? '#f1fa8c' : '#6272a4',
      header: true,
    });
    for (const l of group) rows.push(lessonRow(l));
  }

  if (uncategorized.length) {
    uncategorized.sort(byTitle);
    const done = uncategorized.filter((l) => snap.states[l.id] === 'completed').length;
    rows.push({
      key: 'ungraded',
      text: `Readings and examples — not graded (${done}/${uncategorized.length} done)`,
      pct: null,
      color: '#6272a4',
      header: true,
    });
    for (const l of uncategorized) rows.push(lessonRow(l));
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
// Click opens a centered modal with the per-category, per-lesson breakdown
// (breakdownRows()). Portaled to document.body: it sits inside an
// `overflow-hidden` accordion (<details> in LessonSearchFilter.tsx, kept for
// the collapse animation), which clips a positioned child outright.
// The trigger button also stopPropagates: it sits inside a <summary>, and an
// unguarded click there would toggle the parent <details> open/closed too.

export default function UnitProgressBadge({ lessons, label }: Props) {
  const snap = useLessonState();
  const weightsSnap = useGradingWeights();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const total = lessons.length;

  // Escape closes. Clicking the backdrop closes too (see the overlay below) --
  // there is no outside-click listener any more because the overlay covers
  // the page, so every click outside the panel lands on it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
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
        typeof document !== 'undefined' &&
        createPortal(
          // Backdrop covers the page and centers the panel; a click anywhere
          // outside the panel is a click on this, which closes.
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 24,
            }}
          >
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={`${label ? label + ' progress' : 'Progress'} breakdown`}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(720px, 100%)',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                background: '#282a36',
                border: '1px solid #44475a',
                borderRadius: 10,
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                fontSize: 13,
                color: '#f8f8f2',
                fontFamily: 'inherit',
                overflow: 'hidden',
              }}
            >
              {/* Sticky header so the title and percentage stay put while the
                  list (a whole module can be 45 lessons) scrolls under it. */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #44475a',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  flexShrink: 0,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 16 }}>
                  {label ? `${label}: ` : ''}{pct}% of grade
                </span>
                <span style={{ opacity: 0.6 }}>
                  ({done}/{total} complete{started ? `, ${started} in progress` : ''})
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    color: '#6272a4',
                    cursor: 'pointer',
                    fontSize: 20,
                    lineHeight: 1,
                    padding: '0 4px',
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '12px 20px 18px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {rows.map((r) =>
                r.header ? (
                  <div
                    key={r.key}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontWeight: 700 }}
                  >
                    <span style={{ flex: 1 }}>{r.text}</span>
                    {r.pct != null && <span style={{ color: r.color }}>{r.pct}%</span>}
                  </div>
                ) : (
                  <Link
                    key={r.key}
                    href={r.href!}
                    // The panel is portaled to body, outside the accordion,
                    // so this click does not toggle the parent <details>.
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '3px 6px 3px 14px',
                      borderRadius: 4,
                      color: 'inherit',
                      textDecoration: 'none',
                    }}
                    className="hover:bg-muted"
                    title={r.text}
                  >
                    <span
                      aria-hidden="true"
                      style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }}
                    />
                    <span
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.text}
                    </span>
                    {r.detail && <span style={{ color: '#6272a4', flexShrink: 0 }}>{r.detail}</span>}
                    {r.pct != null && (
                      <span style={{ color: r.color, fontWeight: 600, flexShrink: 0, width: 34, textAlign: 'right' }}>
                        {r.pct}%
                      </span>
                    )}
                  </Link>
                ),
              )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
