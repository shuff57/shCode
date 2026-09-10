'use client';

// "Which shape do I use here?" — the tutor for a student stuck partway through
// a flowchart.
//
// The two existing buttons only speak at the ends of the task: the structural
// checker says a rule is broken but not what to draw instead, and the AI grader
// only runs once the chart is already legal and the student presses Submit. A
// student who cannot decide whether the next step is a diamond or a rectangle
// had nothing between those.
//
// It rides /api/ai-help in `mode: 'diagram'` rather than a new endpoint, so it
// inherits the session gate, the per-unit daily quota, the streaming filter,
// and the anti-answer system prompt already hardened there. Sending the failing
// checks along means the hint can restate the checker's complaint in words a
// beginner can act on.

import { useRef, useState } from 'react';
import { Lightbulb, Sparkles, Square } from 'lucide-react';

import AiAnswer from './AiAnswer';
import { describeDiagram } from '../lib/diagram-mermaid';
import type { CheckResult } from '../lib/diagram-check';
import type { DiagramDoc } from '../lib/diagram-types';

interface Props {
  lessonTitle: string;
  unit?: string | null;
  /** The assignment wording, so a hint is about this chart and not charts in general. */
  task?: string;
  doc: DiagramDoc;
  /** Null until the student has pressed "Check my diagram" at least once. */
  checks: CheckResult[] | null;
  authed: boolean;
}

const DEFAULT_QUESTION = 'I am stuck. Which shape should I use for the next step, and why?';
const FIX_QUESTION = 'My structure checks are failing. What is wrong with my chart?';

function failingSummary(checks: CheckResult[] | null): string {
  if (!checks) return '';
  const failed = checks.filter((c) => !c.passed);
  if (failed.length === 0) return 'All structure checks pass.';
  return failed.map((c) => `- ${c.title}: ${c.detail}`).join('\n');
}

export default function DiagramHintPanel({ lessonTitle, unit, task, doc, checks, authed }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ limit: number; remaining: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const failing = (checks ?? []).filter((c) => !c.passed).length;

  async function ask(userQuery: string) {
    if (streaming) return;
    setOpen(true);
    setError(null);
    setResponse('');
    setStreaming(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          mode: 'diagram',
          lessonTitle,
          unit: unit ?? null,
          task: task ?? '',
          // The endpoint's `code` field carries whatever the student is working
          // on. Here that is the chart, as Mermaid plus a shape-by-shape walk —
          // the same text the AI grader reads on submit.
          code: describeDiagram(doc),
          structure: failingSummary(checks),
          query: userQuery,
        }),
        signal: ac.signal,
      });

      const limitHdr = res.headers.get('X-RateLimit-Limit');
      const remainingHdr = res.headers.get('X-RateLimit-Remaining');
      if (limitHdr && remainingHdr) {
        setQuota({ limit: parseInt(limitHdr, 10), remaining: parseInt(remainingHdr, 10) });
      }

      if (!res.ok || !res.body) {
        let detail = '';
        try {
          const j = (await res.json()) as { error?: string; remaining?: number; limit?: number };
          detail = j.error || '';
          if (typeof j.limit === 'number' && typeof j.remaining === 'number') {
            setQuota({ limit: j.limit, remaining: j.remaining });
          }
        } catch {
          detail = `HTTP ${res.status}`;
        }
        setError(detail || `HTTP ${res.status}`);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setResponse(acc);
      }
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const q = query.trim();
      if (q) ask(q);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => (authed ? ask(failing > 0 ? FIX_QUESTION : DEFAULT_QUESTION) : setOpen(true))}
        title={authed ? 'Ask for a hint about which shape comes next' : 'Sign in to ask for a hint'}
        style={hintButton(!authed)}
      >
        <Lightbulb size={16} />
        {failing > 0 ? 'Stuck? Explain what is wrong' : 'Stuck? Get a hint'}
      </button>
    );
  }

  return (
    <div
      style={{
        marginTop: 16,
        padding: '12px 14px',
        background: '#282a36',
        border: '1px solid #ffb86c55',
        borderRadius: 6,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: '#ffb86c',
          fontWeight: 600,
          fontSize: 13.5,
          marginBottom: 4,
        }}
      >
        <Lightbulb size={16} />
        Hint
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: '#6272a4',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Hide
        </button>
      </div>

      <p style={{ margin: '0 0 10px', color: '#8892b0', fontSize: 12.5, lineHeight: 1.5 }}>
        This nudges you toward the right shape. It will not draw the chart for you.
      </p>

      {!authed ? (
        <p style={{ margin: 0, color: '#ffb86c', fontSize: 12.5 }}>Sign in to ask for a hint.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => ask(DEFAULT_QUESTION)}
              disabled={streaming}
              style={smallButton(streaming)}
            >
              <Sparkles size={13} />
              Which shape next?
            </button>
            {failing > 0 ? (
              <button
                type="button"
                onClick={() => ask(FIX_QUESTION)}
                disabled={streaming}
                style={smallButton(streaming)}
              >
                <Sparkles size={13} />
                Why is my check failing?
              </button>
            ) : null}
            {streaming ? (
              <button
                type="button"
                onClick={() => {
                  abortRef.current?.abort();
                  setStreaming(false);
                }}
                style={stopButton}
              >
                <Square size={11} />
                Stop
              </button>
            ) : null}
          </div>

          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Or ask your own question — e.g. does the yes arrow leave the diamond or the box?  (Ctrl+Enter to send)"
            rows={2}
            style={{
              width: '100%',
              background: '#1e1f29',
              color: '#f8f8f2',
              border: '1px solid #44475a',
              borderRadius: 4,
              padding: '6px 8px',
              fontSize: 12.5,
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <button
            type="button"
            onClick={() => {
              const q = query.trim();
              if (q) ask(q);
            }}
            disabled={streaming || !query.trim()}
            style={{ ...smallButton(streaming || !query.trim()), marginTop: 6 }}
          >
            <Sparkles size={13} />
            Ask
          </button>

          {error ? (
            <div
              style={{
                marginTop: 10,
                background: '#4a2a2a',
                border: '1px solid #ff5555',
                color: '#ffd6d6',
                padding: '6px 8px',
                borderRadius: 4,
                fontSize: 12.5,
              }}
            >
              {error}
            </div>
          ) : null}

          {quota ? (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: quota.remaining <= 2 ? '#ffb86c' : '#6272a4',
                textAlign: 'right',
              }}
            >
              {quota.remaining} of {quota.limit} AI helps left today
              {unit ? ` (${unit})` : ''}
            </div>
          ) : null}

          {response || streaming ? (
            <div style={{ marginTop: 10 }}>
              <AiAnswer
                text={response}
                streaming={streaming}
                placeholder="Your hint will appear here."
                style={{ maxHeight: 320 }}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function hintButton(disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 14px',
    borderRadius: 6,
    border: '1px solid #ffb86c',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    background: 'transparent',
    color: '#ffb86c',
    opacity: disabled ? 0.6 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13.5,
  };
}

function smallButton(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: disabled ? '#44475a' : '#ffb86c',
    color: disabled ? '#6272a4' : '#282a36',
    border: 'none',
    borderRadius: 4,
    padding: '6px 12px',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const stopButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  background: 'transparent',
  color: '#ff5555',
  border: '1px solid #ff5555',
  borderRadius: 4,
  padding: '6px 10px',
  fontSize: 12.5,
  cursor: 'pointer',
};
