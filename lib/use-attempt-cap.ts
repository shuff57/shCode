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

import { useCallback, useEffect, useRef, useState } from 'react';
import { countAttempts } from './attempt-cap';
import { recordLessonCompleted } from './progress';
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
  /** ANY row exists for the part, counted or the server's free outage marker. */
  anyRow: boolean;
  /** Unknown only because the first read has not come back yet (not a failure). */
  loading: boolean;
  /** One try was just recorded. Unknown stays unknown. */
  spend: () => void;
  /** Re-read the count from the server (after a refused 409, say). */
  refresh: () => void;
}

export function useAttemptCap(
  lessonId: string,
  max: number | null | undefined,
  authed: boolean,
  /** A teacher or admin previewing the part: the server never refuses their rows, so there is
   *  no cap to count down and no banner (see effectiveCap in functions/_shared/attempts.ts). */
  exempt = false,
): AttemptCap {
  const cap = typeof max === 'number' && !exempt ? max : null;
  const [used, setUsed] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState(false);
  const [anyRow, setAnyRow] = useState(false);

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
    setSettled(false);
    fetchSubmissions(lessonId).then((r) => {
      if (cancelled) return;
      setUsed(r.loaded ? countAttempts(r.records) : null);
      setAnyRow(r.loaded && r.records.length > 0);
      setSettled(true);
    });
    return () => {
      cancelled = true;
    };
  }, [lessonId, cap, authed, nonce]);

  const spend = useCallback(() => {
    setUsed((n) => (n === null ? null : n + 1));
    setAnyRow(true);
  }, []);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  const known = used !== null;
  return {
    max: cap,
    used,
    known,
    left: cap !== null && known ? Math.max(0, cap - (used as number)) : null,
    reached: cap !== null && known && (used as number) >= cap,
    anyRow,
    unknown: cap !== null && !known,
    loading: cap !== null && !known && !settled,
    spend,
    refresh,
  };
}

// A capped part completes (unlocks the NEXT part) once the server holds a row for
// it: a counted try, or the free outage marker it writes when the grader is down
// (the outage is ours, not the student's). If the row landed but the completion
// call did not -- a dropped request, a closed tab, a grader outage in a renderer
// that does not write its own completion -- the next part would stay locked with
// no way forward except spending another try. This repairs it: on mount, and again
// after an error (call `cap.refresh()` there, which re-reads the rows and so
// notices a marker the server wrote). Keyed on "any row exists", never on
// `used >= 1`, because a marker is not a counted try. The server derives the best
// score from the stored rows, so no score is sent. Bounded: it stops after a few
// tries so a refusing server cannot make it loop.
const REPAIR_ATTEMPTS = 4;
const REPAIR_GAP_MS = 5000;

export function useRepairLoop(lessonId: string, needs: boolean): void {
  const tried = useRef(0);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (!needs || tried.current >= REPAIR_ATTEMPTS) return;
    tried.current += 1;
    void recordLessonCompleted(lessonId);
    // If the state is still not completed shortly after, `needs` is still true and
    // this fires again (a bump re-runs the effect without any other change).
    const t = setTimeout(() => setBump((n) => n + 1), REPAIR_GAP_MS);
    return () => clearTimeout(t);
  }, [needs, lessonId, bump]);
}

export function useCompletionRepair(
  lessonId: string,
  cap: AttemptCap,
  progress: { authed: boolean; states: Record<string, string | undefined> },
): void {
  useRepairLoop(
    lessonId,
    cap.max !== null && cap.known && cap.anyRow && progress.authed && progress.states[lessonId] !== 'completed',
  );
}
