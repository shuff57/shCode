'use client';

// Advisory deterministic check for a Chapter 3 plan submission, shown to the
// teacher beside the AI grade. It is NOT the recorded grade: while the two
// graders run side by side, the AI result stays authoritative. The point is to
// let a teacher see, on real work, where the AI and the rules disagree -- and
// to have the deterministic one ready to cut over.
//
// 3.9.1 hands the pair a plan with its shape given and eight blanks in it, so
// this shows one mark per blank: which function the student put there, and
// whether it was handed what it needs.
//
// Computed from the stored response, so it works on every historical row with
// no server change or migration.

import { checkPlanGaps, GAP_PASS, PLAN_GAPS, PLAN_LESSONS } from '../lib/plan-check';

const COLOR: Record<string, string> = { met: '#50fa7b', partial: '#f1fa8c', missing: '#ff5555' };
const LABEL: Record<string, string> = { met: 'met', partial: 'partly', missing: 'missing' };

export default function PlanCheckPanel({ lessonId, response }: { lessonId: string; response: string }) {
  if (!PLAN_LESSONS.includes(lessonId)) return null;
  const result = checkPlanGaps(response);
  const met = result.criteria.filter((c) => c.verdict === 'met').length;
  // Two blanks are required, so a plan can be over the count and still fail.
  const requiredMet = (id: string) => result.criteria.find((c) => c.id === id)?.verdict === 'met';
  const requiredMissed = PLAN_GAPS.some((g) => g.required && !requiredMet(g.id));
  return (
    <section
      aria-label="Deterministic plan check"
      style={{
        background: '#282a36',
        border: '1px dashed #6272a4',
        borderRadius: 6,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ color: '#8be9fd', fontSize: '0.85rem' }}>Blank check</strong>
        <span style={{ color: '#8393c4', fontSize: '0.78rem' }}>
          {met} of {result.criteria.length} gaps right{result.blanks ? ` · ${result.blanks} still empty` : ''} &middot;{' '}
          {result.passed
            ? `would pass (${GAP_PASS} needed)`
            : requiredMissed
              ? 'would not pass — the change and its report both have to be right'
              : `would not pass (${GAP_PASS} needed)`}{' '}
          &middot; advisory, not the recorded grade
        </span>
      </div>
      {result.criteria.map((c) => (
        <div key={c.id} style={{ fontSize: '0.8rem', lineHeight: 1.45 }}>
          <span style={{ color: COLOR[c.verdict], fontWeight: 600, marginRight: 8 }}>
            {LABEL[c.verdict]}
          </span>
          <span style={{ color: '#f8f8f2' }}>{c.title}</span>
          {PLAN_GAPS.find((g) => g.id === c.id)?.required ? (
            <span style={{ color: '#bd93f9', marginLeft: 8, fontSize: '0.74rem' }}>required</span>
          ) : null}
          <div style={{ color: '#a8b1d8', marginLeft: 52 }}>{c.feedback}</div>
        </div>
      ))}
      {/* The grader normalises the text before reading it. Show that reading, so
          a disagreement can be checked instead of trusted. */}
      <details>
        <summary style={{ color: '#8393c4', fontSize: '0.76rem', cursor: 'pointer' }}>
          How this plan was read
          {result.notes.length > 0 ? ` · ${result.notes.length} change${result.notes.length === 1 ? '' : 's'}` : ''}
        </summary>
        {result.notes.length > 0 ? (
          <ul style={{ margin: '6px 0', paddingLeft: 18, color: '#a8b1d8', fontSize: '0.76rem', lineHeight: 1.45 }}>
            {result.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        ) : null}
        <pre
          style={{
            margin: 0,
            padding: 8,
            background: '#21222c',
            border: '1px solid #44475a',
            borderRadius: 4,
            color: '#f8f8f2',
            fontSize: '0.74rem',
            lineHeight: 1.4,
            overflowX: 'auto',
          }}
        >{result.canonical}</pre>
      </details>
    </section>
  );
}
