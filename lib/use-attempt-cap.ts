'use client';

// The tries a student has left on a capped performance-assessment part, counted
// from the SERVER's lesson_submissions rows (lib/attempt-cap.ts) and never from
// this browser. Shared by the quiz, flowchart and console renderers so none of
// them re-implements the rule. WrittenGrader predates it and keeps its own copy
// of the same logic; both read countAttempts.
//
// `used === null` means UNKNOWN, not zero: the request failed, so there is no
// honest count. A capped part refuses Submit while it is unknown, the same
// integrity-first reading WrittenGrader has.

import { useCallback, useEffect, useState } from 'react';
import { countAttempts } from './attempt-cap';
import { fetchSubmissions } from './written-grader-store';

export interface AttemptCap {
  /** The part's maxSubmissions, or null when the part is uncapped. */
  max: number | null;
  /** Tries spent, or null while unknown. */
  used: number | null;
  known: boolean;
  /** Tries left; null when uncapped or unknown. */
  left: number | null;
  /** Every try is spent. */
  reached: boolean;
  /** Capped, but the count could not be read: Submit must stay disabled. */
  unknown: boolean;
  /** One try was just recorded. Unknown stays unknown. */
  spend: () => void;
}

export function useAttemptCap(lessonId: string, max: number | null | undefined, authed: boolean): AttemptCap {
  const cap = typeof max === 'number' ? max : null;
  const [used, setUsed] = useState<number | null>(null);

  useEffect(() => {
    if (cap === null) return;
    let cancelled = false;
    // The count is whatever the SERVER's submission rows say, or it is unknown.
    // There is deliberately no "signed out, so zero" shortcut: `authed` is false
    // both for a real 401 and while the lesson-state load is pending or has
    // failed, so treating it as zero tries used enabled Submit (and showed a full
    // "3 tries" banner) for a student who had spent every one. A 401 from the
    // submissions route is unknown too -- the part is not sittable without an
    // account, and the server refuses a fourth row regardless. `authed` stays a
    // dependency only so the count is re-read once sign-in settles.
    setUsed(null);
    fetchSubmissions(lessonId).then((r) => {
      if (!cancelled) setUsed(r.loaded ? countAttempts(r.records) : null);
    });
    return () => {
      cancelled = true;
    };
  }, [lessonId, cap, authed]);

  const spend = useCallback(() => setUsed((n) => (n === null ? null : n + 1)), []);
  const known = used !== null;
  return {
    max: cap,
    used,
    known,
    left: cap !== null && known ? Math.max(0, cap - (used as number)) : null,
    reached: cap !== null && known && (used as number) >= cap,
    unknown: cap !== null && !known,
    spend,
  };
}
