'use client';

// Advisory deterministic check for a Chapter 3 plan submission, shown to the
// teacher beside the AI grade. It is NOT the recorded grade: while the two
// graders run side by side, the AI result stays authoritative. The point is to
// let a teacher see, on real work, where the AI and the rules disagree -- and
// to have the deterministic one ready to cut over.
//
// Computed from the stored response, so it works on every historical row with
// no server change or migration.

import { checkPlan, PLAN_LESSONS } from '../lib/plan-check';

const COLOR: Record<string, string> = { met: '#50fa7b', partial: '#f1fa8c', missing: '#ff5555' };
const LABEL: Record<string, string> = { met: 'met', partial: 'partly', missing: 'missing' };

export default function PlanCheckPanel({ lessonId, response }: { lessonId: string; response: string }) {
  if (!PLAN_LESSONS.includes(lessonId)) return null;
  const result = checkPlan(response);
  const met = result.criteria.filter((c) => c.verdict === 'met').length;
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
        <strong style={{ color: '#8be9fd', fontSize: '0.85rem' }}>Deterministic check</strong>
        <span style={{ color: '#8393c4', fontSize: '0.78rem' }}>
          {met} of {result.criteria.length} fully met &middot; {result.passed ? 'would pass' : 'would not pass'} &middot; advisory, not the recorded grade
        </span>
      </div>
      {result.criteria.map((c) => (
        <div key={c.id} style={{ fontSize: '0.8rem', lineHeight: 1.45 }}>
          <span style={{ color: COLOR[c.verdict], fontWeight: 600, marginRight: 8 }}>
            {LABEL[c.verdict]}
          </span>
          <span style={{ color: '#f8f8f2' }}>{c.title}</span>
          <div style={{ color: '#a8b1d8', marginLeft: 52 }}>{c.feedback}</div>
        </div>
      ))}
    </section>
  );
}
