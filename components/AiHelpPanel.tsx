'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { useLessonStore } from '../lib/store';
import type { Lesson } from '../lib/types';
import { Sparkles, Square } from 'lucide-react';

// Render the streaming model output as markdown. marked is forgiving of
// partial input — an unclosed code fence just renders as an open block, and
// the parse re-runs on each chunk so the final shape settles in. Every
// rendered string passes through DOMPurify before innerHTML so a model that
// emits raw HTML (deliberate or via injection) cannot script the page.
marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(text: string): string {
  const html = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input', 'object', 'embed'],
    FORBID_ATTR: ['style', 'onerror', 'onclick', 'onload'],
  });
}

interface PreviewError {
  name: string;
  message: string;
  file: string | null;
  line: number | null;
  col: number | null;
  snippet: string;
}

interface Props {
  lesson: Lesson;
}

export default function AiHelpPanel({ lesson }: Props) {
  const fileContents = useLessonStore((s) => s.fileContents);
  const currentFile = useLessonStore((s) => s.currentFile);

  const [lastError, setLastError] = useState<PreviewError | null>(null);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ limit: number; remaining: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  const html = useMemo(() => (response ? renderMarkdown(response) : ''), [response]);

  // Track the most recent runtime error so the user can ask "what's wrong?"
  // without having to retype anything.
  useEffect(() => {
    function handler(e: MessageEvent) {
      const d = e.data;
      if (d && d.source === 'preview-error' && d.error) {
        setLastError(d.error as PreviewError);
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Keep scroll pinned to the bottom while the answer streams in.
  useEffect(() => {
    if (!responseRef.current) return;
    responseRef.current.scrollTop = responseRef.current.scrollHeight;
  }, [response]);

  async function ask(userQuery: string) {
    if (streaming) return;
    setError(null);
    setResponse('');
    setStreaming(true);

    const ac = new AbortController();
    abortRef.current = ac;

    const codeForFile = (currentFile && fileContents[currentFile]) || fileContents['script.js'] || '';

    try {
      const res = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonTitle: lesson.title,
          fileName: currentFile || 'script.js',
          unit: lesson.unit ?? null,
          code: codeForFile,
          error: lastError,
          query: userQuery,
        }),
        signal: ac.signal,
      });

      // Pick up rate-limit headers when present.
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

  function stop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const q = query.trim();
      if (q) ask(q);
    }
  }

  const askDefault = () => ask("What's wrong with my code, and how do I fix it?");
  const submitQuery = () => {
    const q = query.trim();
    if (q) ask(q);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 10 }}>
      {lastError ? (
        <div
          style={{
            background: '#2a1d1d',
            border: '1px solid #ff5555',
            borderRadius: 4,
            padding: '8px 10px',
            fontSize: 12.5,
            lineHeight: 1.4,
          }}
        >
          <div style={{ color: '#ff5555', fontWeight: 600, marginBottom: 2 }}>
            {lastError.name}: {lastError.message}
          </div>
          {lastError.file && lastError.line ? (
            <div style={{ color: '#8be9fd', fontFamily: 'monospace', fontSize: 11.5 }}>
              {lastError.file}:{lastError.line}
              {lastError.col ? `:${lastError.col}` : ''}
            </div>
          ) : null}
          {lastError.snippet ? (
            <pre
              style={{
                margin: '4px 0 0',
                padding: '4px 6px',
                background: '#282a36',
                color: '#f8f8f2',
                borderRadius: 3,
                fontFamily: 'monospace',
                fontSize: 11.5,
                whiteSpace: 'pre-wrap',
                overflowX: 'auto',
              }}
            >
              {lastError.snippet}
            </pre>
          ) : null}
        </div>
      ) : (
        <div style={{ color: '#6272a4', fontSize: 12.5, fontStyle: 'italic' }}>
          No runtime errors yet. Ask anything below — the AI sees your current code and the q5play docs.
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={askDefault}
          disabled={streaming}
          style={btnPrimary(streaming)}
        >
          <Sparkles size={13} />
          {lastError ? 'Help me fix this' : 'Help me'}
        </button>
        {streaming ? (
          <button type="button" onClick={stop} style={btnSecondary}>
            <Square size={11} />
            Stop
          </button>
        ) : null}
      </div>

      <div>
        <label
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#6272a4',
            display: 'block',
            marginBottom: 4,
          }}
        >
          Ask a question
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="e.g. Why isn't my sprite moving?  (Ctrl+Enter to send)"
          rows={3}
          style={{
            width: '100%',
            background: '#282a36',
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
          onClick={submitQuery}
          disabled={streaming || !query.trim()}
          style={{ ...btnPrimary(streaming || !query.trim()), marginTop: 6 }}
        >
          <Sparkles size={13} />
          Ask
        </button>
      </div>

      {error ? (
        <div
          style={{
            background: '#2a1d1d',
            border: '1px solid #ff5555',
            color: '#ff5555',
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
            fontSize: 11,
            color: quota.remaining <= 2 ? '#ffb86c' : '#6272a4',
            textAlign: 'right',
          }}
        >
          {quota.remaining} of {quota.limit} AI helps left today
          {lesson.unit ? ` (${lesson.unit})` : ''}
        </div>
      ) : null}

      <div
        ref={responseRef}
        className="ai-help-response"
        style={{
          flex: 1,
          minHeight: 120,
          overflowY: 'auto',
          background: '#282a36',
          border: '1px solid #44475a',
          borderRadius: 4,
          padding: '8px 12px',
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        {response ? (
          <>
            <div dangerouslySetInnerHTML={{ __html: html }} />
            {streaming ? <span style={{ color: '#bd93f9' }}>▍</span> : null}
          </>
        ) : (
          <span style={{ color: '#6272a4', fontStyle: 'italic' }}>
            {streaming ? 'Thinking…' : 'Answer will appear here.'}
          </span>
        )}
      </div>

      <style>{`
        .ai-help-response p { margin: 0 0 8px; }
        .ai-help-response p:last-child { margin-bottom: 0; }
        .ai-help-response h1,
        .ai-help-response h2,
        .ai-help-response h3,
        .ai-help-response h4 {
          color: #bd93f9;
          font-weight: 600;
          margin: 10px 0 4px;
          line-height: 1.3;
        }
        .ai-help-response h1 { font-size: 1.05em; }
        .ai-help-response h2 { font-size: 1em; }
        .ai-help-response h3,
        .ai-help-response h4 { font-size: 0.95em; }
        .ai-help-response strong { color: #f8f8f2; font-weight: 600; }
        .ai-help-response em { color: #f1fa8c; font-style: italic; }
        .ai-help-response ul,
        .ai-help-response ol { margin: 0 0 8px; padding-left: 22px; }
        .ai-help-response li { margin: 2px 0; }
        .ai-help-response code {
          background: #1e1f29;
          color: #50fa7b;
          padding: 1px 4px;
          border-radius: 3px;
          font-family: 'Fira Code', Consolas, monospace;
          font-size: 0.9em;
        }
        .ai-help-response pre {
          background: #1e1f29;
          border: 1px solid #44475a;
          border-radius: 4px;
          padding: 8px 10px;
          margin: 6px 0 10px;
          overflow-x: auto;
        }
        .ai-help-response pre code {
          background: transparent;
          color: #f8f8f2;
          padding: 0;
          font-size: 0.85em;
          line-height: 1.45;
        }
        .ai-help-response blockquote {
          border-left: 3px solid #44475a;
          margin: 6px 0;
          padding: 2px 10px;
          color: #6272a4;
        }
        .ai-help-response a { color: #8be9fd; text-decoration: underline; }
      `}</style>
    </div>
  );
}

function btnPrimary(disabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: disabled ? '#44475a' : '#bd93f9',
    color: disabled ? '#6272a4' : '#282a36',
    border: 'none',
    borderRadius: 4,
    padding: '6px 12px',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const btnSecondary: React.CSSProperties = {
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
