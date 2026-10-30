'use client';

// "Grades today: 13 of 100 used" under the Submit/Grade controls. The daily cap is a
// runaway-cost stop, not a pedagogical one, but a student who can see the number is
// never surprised by it. Staff are exempt and see nothing. The count is read from
// GET /api/grade-written and refreshed after every grade (written-grader-store.ts
// dispatches GRADE_FINISHED).

import { useEffect, useState } from 'react';
import { fetchGradeQuota, GRADE_FINISHED, type GradeQuota } from '../lib/written-grader-store';

export default function GradeQuotaNote() {
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
  return (
    <div
      role="status"
      style={{ fontSize: 12, color: low ? '#ffb86c' : '#8393c4', margin: '0 0 8px' }}
    >
      Grades today: {quota.used} of {quota.limit} used
      {quota.remaining === 0
        ? ' — you are out for today. The count resets at midnight UTC (late afternoon here); tell your teacher if you need more.'
        : low
          ? ` — ${quota.remaining} left. The count resets at midnight UTC (late afternoon here).`
          : '. Practice runs and retries count; the count resets at midnight UTC.'}
    </div>
  );
}
