'use client';

// "AI grades left today: 87" beside the Submit/Grade controls. The daily cap is a
// runaway-cost stop, not a pedagogical one, but a student who can see the number is
// never surprised by it. Staff are exempt and see nothing. The count is read from
// GET /api/grade-written and refreshed after every grade (written-grader-store.ts
// dispatches GRADE_FINISHED).

import { useEffect, useState } from 'react';
import { fetchGradeQuota, GRADE_FINISHED, type GradeQuota } from '../lib/written-grader-store';

export default function GradeQuotaNote({ compact = false }: { compact?: boolean }) {
  const [quota, setQuota] = useState<GradeQuota | null>(null);

  useEffect(() => {
    let live = true;
    const load = () => {
      fetchGradeQuota().then((q) => { if (live) setQuota(q); });
    };
    load();
    window.addEventListener(GRADE_FINISHED, load);
    return () => {
      live = false;
      window.removeEventListener(GRADE_FINISHED, load);
    };
  }, []);

  if (!quota) return null;
  const low = quota.remaining <= 10;
  // What this counts (functions/api/grade-written.ts): every request a student sends to the AI
  // grader today -- a written answer's Submit/Grade, an AI Check, a diagram grade -- in one
  // per-student bucket that resets at midnight UTC. It is not a score, so it says "left today".
  const explain = `Each AI grade or AI Check you ask for uses one (${quota.used} of ${quota.limit} used today). Practice runs and retries count. Resets at midnight UTC (late afternoon here).`;
  return (
    <div
      role="status"
      className={`grade-quota-note${compact ? ' is-compact' : ''}${low ? ' is-low' : ''}`}
      title={explain}
      style={{ fontFamily: 'var(--font-prose)', fontSize: 13, color: low ? 'var(--c-orange)' : 'var(--c-meta)', margin: 0, whiteSpace: 'normal', overflowWrap: 'anywhere', maxWidth: '100%', fontVariantNumeric: 'tabular-nums' }}
    >
      {`AI grades left today: ${quota.remaining}`}
      {quota.remaining === 0
        ? ' — you are out for today. The count resets at midnight UTC (late afternoon here); tell your teacher if you need more.'
        : low
          ? '. The count resets at midnight UTC (late afternoon here).'
          : ''}
    </div>
  );
}
