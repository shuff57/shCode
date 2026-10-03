'use client';

// The two things every capped performance-assessment part shows, whatever it
// renders: the notice (told BEFORE the first try, then the count) and, once every
// try is spent, the solution as pseudocode. See .gauntlet/SPEC-attempt-caps.md.

import { useCallback, useEffect, useRef, useState } from 'react';
import { studentWaitMessage } from '../lib/solution-release-core';

interface BannerProps {
  max: number | null;
  /** Tries spent; null while unknown. */
  used: number | null;
  /** Optional extra line, e.g. the running total on a quiz. */
  note?: string;
}

export function AttemptBanner({ max, used, note }: BannerProps) {
  if (max === null) return null;
  const word = max === 1 ? 'try' : 'tries';
  let text: string;
  if (used === null) {
    text = `You get ${max} ${word} on this part, and your best one counts. We could not check how many you have used, so Submit is off. Reload the page to try again.`;
  } else if (used === 0) {
    text = `You get ${max} ${word} on this part. Your best one counts. After the last one, you will see how it is solved.`;
  } else if (used >= max) {
    text = `All ${max} ${word} used. Your best one is your score.`;
  } else {
    const left = max - used;
    text = `${left} of ${max} ${max === 1 ? 'try' : 'tries'} left. Your best one counts. After the last one, you will see how it is solved.`;
  }
  return (
    <div
      role="status"
      data-testid="attempt-banner"
      style={{
        margin: '0 0 14px',
        padding: '10px 14px',
        border: '1px solid #8be9fd',
        borderRadius: 6,
        background: 'rgba(139,233,253,0.08)',
        color: '#f8f8f2',
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      {text}
      {note ? <div style={{ marginTop: 4, color: '#bd93f9' }}>{note}</div> : null}
    </div>
  );
}

// What the server said when the solution is not yet shown. `reason` comes from
// functions/api/attempt-reveal.ts and quiz-reveal.ts: 'not-released' = every try is
// spent but this student's teacher has not released the part (or has set a date that
// has not arrived); 'tries' = a try is still unspent.
export interface RevealWait {
  reason: 'not-released' | 'tries';
  /** The soonest scheduled release across the student's classes, or null when none is set. */
  scheduledAt: number | null;
  /** The server's clock, so the wording does not depend on this device's. */
  now: number;
  cap: number | null;
}

/** Reads a refused reveal response; null when the body is not the release shape. */
export function parseRevealWait(body: unknown): RevealWait | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as { reason?: unknown; scheduledAt?: unknown; now?: unknown; cap?: unknown };
  if (b.reason !== 'not-released' && b.reason !== 'tries') return null;
  return {
    reason: b.reason,
    scheduledAt: typeof b.scheduledAt === 'number' ? b.scheduledAt : null,
    now: typeof b.now === 'number' ? b.now : Date.now(),
    cap: typeof b.cap === 'number' ? b.cap : null,
  };
}

/** "You have used all 3 tries. Your teacher will release the solution." (or "...releases it on <date>."). */
export function SolutionWait({ wait, onRefresh }: { wait: RevealWait; onRefresh?: () => void }) {
  const cap = wait.cap ?? 0;
  const message = wait.cap === null
    ? 'Your teacher will release the solution.'
    : studentWaitMessage(wait.scheduledAt, wait.now, cap);
  return (
    <section
      data-testid="solution-wait"
      role="status"
      style={{ margin: '18px 0', padding: '12px 16px', border: '1px solid #bd93f9', borderRadius: 6, background: 'rgba(189,147,249,0.08)', color: '#f8f8f2', fontSize: 14, lineHeight: 1.5 }}
    >
      {message}
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          style={{ marginLeft: 12, background: 'none', border: '1px solid #44475a', borderRadius: 4, color: '#8be9fd', cursor: 'pointer', fontSize: 13, padding: '2px 8px' }}
        >
          Check again
        </button>
      ) : null}
    </section>
  );
}

// A re-check on focus is cheap; this keeps a student alt-tabbing between two
// windows from turning it into a request storm.
const MIN_RECHECK_MS = 15000;

/**
 * The solution, fetched only once every try is spent and the teacher has released
 * it. Until then it says so in words, with a Check again button and a re-check
 * when the tab regains focus. There is no polling.
 */
export function PseudocodePanel({ lessonId, show }: { lessonId: string; show: boolean }) {
  const [text, setText] = useState<string | null>(null);
  const [wait, setWait] = useState<RevealWait | null>(null);
  const lastCheck = useRef(0);

  const load = useCallback(async () => {
    lastCheck.current = Date.now();
    try {
      const res = await fetch(`/api/attempt-reveal?lessonId=${encodeURIComponent(lessonId)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = (await res.json()) as { pseudocode?: string };
        if (typeof data.pseudocode === 'string') {
          setText(data.pseudocode);
          setWait(null);
        }
        return;
      }
      // 403 with a release reason = waiting on the teacher. Anything else (404: no
      // solution written for this part; no session) is quiet: not an error on a test.
      if (res.status === 403) {
        const parsed = parseRevealWait(await res.json().catch(() => null));
        if (parsed && parsed.reason === 'not-released') setWait(parsed);
      }
    } catch {
      /* quiet */
    }
  }, [lessonId]);

  useEffect(() => {
    if (!show) {
      setText(null);
      setWait(null);
      return;
    }
    void load();
  }, [show, load]);

  useEffect(() => {
    if (!show || text !== null) return;
    const recheck = () => {
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - lastCheck.current < MIN_RECHECK_MS) return;
      void load();
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [show, text, load]);

  if (!show) return null;
  if (!text) return wait ? <SolutionWait wait={wait} onRefresh={() => void load()} /> : null;
  return (
    <section
      data-testid="pseudocode-panel"
      style={{ margin: '18px 0', padding: '14px 16px', border: '1px solid #50fa7b', borderRadius: 6, background: 'rgba(80,250,123,0.06)' }}
    >
      <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#50fa7b' }}>How this is solved</h3>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.6, color: '#f8f8f2' }}>{text}</pre>
    </section>
  );
}
