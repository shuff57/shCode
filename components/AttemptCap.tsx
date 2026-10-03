'use client';

// The two things every capped performance-assessment part shows, whatever it
// renders: the notice (told BEFORE the first try, then the count) and, once every
// try is spent, the solution as pseudocode. See .gauntlet/SPEC-attempt-caps.md.

import { useEffect, useState } from 'react';

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
    text = `You have used all ${max} ${word}. Your best one is your score. Here is how it is solved.`;
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

/** The solution, fetched only once every try is spent. The server refuses before that. */
export function PseudocodePanel({ lessonId, show }: { lessonId: string; show: boolean }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!show) {
      setText(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/attempt-reveal?lessonId=${encodeURIComponent(lessonId)}`, {
          credentials: 'include',
        });
        // 403 = a try is still unspent, 404 = no solution written for this part.
        // Both are quiet: no solution is not an error on a live test.
        if (!res.ok) return;
        const data = (await res.json()) as { pseudocode?: string };
        if (!cancelled && typeof data.pseudocode === 'string') setText(data.pseudocode);
      } catch {
        /* quiet */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, show]);

  if (!show || !text) return null;
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
