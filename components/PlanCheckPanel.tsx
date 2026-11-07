'use client';

// Advisory deterministic check for a Chapter 3 plan submission, shown to the
// teacher beside the AI grade. It is NOT the recorded grade: while the two
// graders run side by side, the AI result stays authoritative. The point is to
// let a teacher see, on real work, where the AI and the rules disagree -- and
// to have the deterministic one ready to cut over.
//
// 3.9.1 hands the pair a plan with four mistakes planted in it, so this shows
// one mark per job the plan has to do: whether the line does that job, and
// whether the call is handed what it needs.
//
// Computed from the stored response, so it works on every historical row with
// no server change or migration.

import { checkPlanGaps, GAP_PASS, PLAN_GAPS, PLAN_LESSONS } from '../lib/plan-check';

const COLOR: Record<string, string> = { met: 'var(--c-green)', partial: 'var(--c-yellow)', missing: 'var(--c-red)' };
const LABEL: Record<string, string> = { met: 'met', partial: 'partly', missing: 'missing' };

export default function PlanCheckPanel({ lessonId, response }: { lessonId: string; response: string }) {
  if (!PLAN_LESSONS.includes(lessonId)) return null;
  const result = checkPlanGaps(response);
  const met = result.criteria.filter((c) => c.verdict === 'met').length;
  // Two jobs are required, so a plan can be over the count and still fail.
  const requiredMet = (id: string) => result.criteria.find((c) => c.id === id)?.verdict === 'met';
  const requiredMissed = PLAN_GAPS.some((g) => g.required && !requiredMet(g.id));
  return (
    <section
      aria-label="Deterministic plan check"
      style={{
        background: 'var(--c-bg)',
        border: '1px dashed var(--c-comment)',
        borderRadius: 6,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ color: 'var(--c-cyan)', fontSize: '0.85rem' }}>Plan check</strong>
        <span style={{ color: 'var(--c-dim)', fontSize: '0.78rem' }}>
          {met} of {result.criteria.length} jobs right{result.blanks ? ` · ${result.blanks} line${result.blanks === 1 ? '' : 's'} still empty` : ''} &middot;{' '}
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
          <span style={{ color: 'var(--c-fg)' }}>{c.title}</span>
          {PLAN_GAPS.find((g) => g.id === c.id)?.required ? (
            <span style={{ color: 'var(--c-purple)', marginLeft: 8, fontSize: '0.74rem' }}>required</span>
          ) : null}
          <div style={{ color: 'var(--x-a8b1d8)', marginLeft: 52 }}>{c.feedback}</div>
        </div>
      ))}
      {/* The grader normalises the text before reading it. Show that reading, so
          a disagreement can be checked instead of trusted. */}
      <details>
        <summary style={{ color: 'var(--c-dim)', fontSize: '0.76rem', cursor: 'pointer' }}>
          How this plan was read
          {result.notes.length > 0 ? ` · ${result.notes.length} change${result.notes.length === 1 ? '' : 's'}` : ''}
        </summary>
        {result.notes.length > 0 ? (
          <ul style={{ margin: '6px 0', paddingLeft: 18, color: 'var(--x-a8b1d8)', fontSize: '0.76rem', lineHeight: 1.45 }}>
            {result.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        ) : null}
        <pre
          style={{
            margin: 0,
            padding: 8,
            background: 'var(--c-deep2)',
            border: '1px solid var(--c-line)',
            borderRadius: 4,
            color: 'var(--c-fg)',
            fontSize: '0.74rem',
            lineHeight: 1.4,
            overflowX: 'auto',
          }}
        >{result.canonical}</pre>
      </details>
    </section>
  );
}
