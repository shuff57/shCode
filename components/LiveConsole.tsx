'use client';

import { RefObject, useEffect, useRef, useState } from 'react';

// One entry in the console scrollback. REPL input and result entries are
// distinguished so we can prefix them with "> " and ":" like a real REPL.
interface PreviewError {
  name: string;
  message: string;
  file: string | null;
  line: number | null;
  col: number | null;
  snippet: string;
}
interface Entry {
  kind: 'log' | 'warn' | 'error' | 'info' | 'input' | 'result' | 'result-err';
  text: string;
  err?: PreviewError;
}

interface Props {
  /** Iframe we send evals to and filter console messages from. */
  iframeRef: RefObject<HTMLIFrameElement | null>;
  /** Bumped by the parent on Run/Reset so we can clear scrollback. */
  resetKey: number;
}

const MAX_ENTRIES = 200;

export default function LiveConsole({ iframeRef, resetKey }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingEvalIds = useRef<Set<string>>(new Set());
  const lastStructured = useRef<string>('');

  useEffect(() => {
    function handler(e: MessageEvent) {
      const iframe = iframeRef.current;
      // Only accept messages from our specific iframe so multiple live blocks
      // on the same page don't bleed logs into each other.
      if (!iframe || e.source !== iframe.contentWindow) return;
      const d = e.data;
      if (!d || typeof d !== 'object') return;

      if (d.source === 'preview-error' && d.error) {
        const err = d.error as PreviewError;
        lastStructured.current = `${err.name}: ${err.message}`;
        appendEntry({ kind: 'error', text: `${err.name}: ${err.message}`, err });
        return;
      }

      if (d.source === 'preview-console') {
        const text = (d.args ?? [])
          .map((a: unknown) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
          .join(' ');
        // Suppress the duplicate plain-string error that follows a structured one.
        if (
          d.type === 'error' &&
          lastStructured.current &&
          text.startsWith(lastStructured.current)
        ) {
          lastStructured.current = '';
          return;
        }
        appendEntry({ kind: d.type, text });
      } else if (d.source === 'preview-eval-result') {
        // Drop stray results not originating from a prompt we issued.
        if (d.id && !pendingEvalIds.current.has(d.id)) return;
        if (d.id) pendingEvalIds.current.delete(d.id);
        appendEntry({ kind: d.ok ? 'result' : 'result-err', text: d.text });
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [iframeRef]);

  useEffect(() => {
    setEntries([]);
    pendingEvalIds.current.clear();
  }, [resetKey]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [entries]);

  function appendEntry(entry: Entry) {
    setEntries((prev) => {
      const next = prev.length >= MAX_ENTRIES ? prev.slice(prev.length - MAX_ENTRIES + 1) : prev;
      return [...next, entry];
    });
  }

  function submit() {
    const expr = input.trim();
    if (!expr) return;
    appendEntry({ kind: 'input', text: expr });
    setInput('');
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) {
      appendEntry({ kind: 'result-err', text: 'Preview not running. Click Run first.' });
      return;
    }
    const id = Math.random().toString(36).slice(2);
    pendingEvalIds.current.add(id);
    iframe.contentWindow.postMessage({ source: 'preview-eval', id, expr }, '*');
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="liveconsole">
      <div className="liveconsole-header">
        <span>Console</span>
        <button type="button" onClick={() => setEntries([])}>Clear</button>
      </div>
      <div className="liveconsole-scroll" ref={scrollRef}>
        {entries.length === 0 ? (
          <div className="liveconsole-empty">
            Type an expression below, or call <code>console.log(...)</code> in your sketch.
          </div>
        ) : (
          entries.map((e, i) =>
            e.err ? (
              <div key={i} className="liveconsole-entry liveconsole-error liveconsole-error-rich">
                <div className="liveconsole-error-line">
                  <span className="liveconsole-gutter">!</span>
                  <span className="liveconsole-error-name">{e.err.name}:</span>
                  <span className="liveconsole-text">{e.err.message}</span>
                </div>
                {e.err.file && e.err.line ? (
                  <div className="liveconsole-error-loc">
                    {e.err.file}:{e.err.line}
                    {e.err.col ? `:${e.err.col}` : ''}
                  </div>
                ) : null}
                {e.err.snippet ? (
                  <code className="liveconsole-error-snippet">{e.err.snippet}</code>
                ) : null}
              </div>
            ) : (
              <div key={i} className={`liveconsole-entry liveconsole-${e.kind}`}>
                <span className="liveconsole-gutter">{prefixFor(e.kind)}</span>
                <span className="liveconsole-text">{e.text}</span>
              </div>
            )
          )
        )}
      </div>
      <div className="liveconsole-input-row">
        <span className="liveconsole-prompt">{'>'}</span>
        <input
          className="liveconsole-input"
          type="text"
          spellCheck={false}
          autoComplete="off"
          placeholder="e.g. player.constructor.name"
          value={input}
          onChange={(ev) => setInput(ev.target.value)}
          onKeyDown={onKey}
        />
      </div>
      <style>{`
        .liveconsole {
          border-top: 1px solid #44475a;
          background: #1e1f29;
          color: #f8f8f2;
          font-family: 'Fira Code', Consolas, 'Courier New', monospace;
          font-size: 12.5px;
        }
        .liveconsole-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 10px;
          background: #282a36;
          border-bottom: 1px solid #44475a;
          color: #bd93f9;
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .liveconsole-header button {
          background: transparent;
          border: 1px solid #44475a;
          color: #6272a4;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 3px;
          cursor: pointer;
        }
        .liveconsole-scroll {
          max-height: 160px;
          min-height: 80px;
          overflow-y: auto;
          padding: 6px 10px;
        }
        .liveconsole-empty {
          color: #6272a4;
          font-style: italic;
        }
        .liveconsole-empty code {
          background: #282a36;
          padding: 0 4px;
          border-radius: 2px;
        }
        .liveconsole-entry {
          display: flex;
          gap: 8px;
          padding: 1px 0;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .liveconsole-gutter {
          flex: 0 0 auto;
          width: 14px;
          color: #6272a4;
          user-select: none;
          text-align: right;
        }
        .liveconsole-text { flex: 1 1 auto; }
        .liveconsole-input .liveconsole-text,
        .liveconsole-input { color: #8be9fd; }
        .liveconsole-result .liveconsole-text { color: #f1fa8c; }
        .liveconsole-result-err .liveconsole-text { color: #ff5555; }
        .liveconsole-error .liveconsole-text { color: #ff5555; }
        .liveconsole-warn .liveconsole-text { color: #ffb86c; }
        .liveconsole-info .liveconsole-text { color: #8be9fd; }
        .liveconsole-input-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-top: 1px solid #44475a;
          background: #282a36;
        }
        .liveconsole-prompt {
          color: #50fa7b;
          font-weight: 700;
        }
        .liveconsole-input {
          flex: 1 1 auto;
          background: transparent;
          border: none;
          outline: none;
          color: #f8f8f2;
          font: inherit;
          padding: 4px 0;
        }
        .liveconsole-input::placeholder { color: #44475a; }
        .liveconsole-error-rich {
          flex-direction: column;
          gap: 2px;
          padding: 4px 0 4px 6px;
          border-left: 2px solid #ff5555;
          margin: 2px 0;
        }
        .liveconsole-error-line { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
        .liveconsole-error-name { color: #ff5555; font-weight: 600; }
        .liveconsole-error-loc { color: #8be9fd; font-size: 11.5px; padding-left: 22px; }
        .liveconsole-error-snippet {
          display: block;
          margin: 2px 0 0 22px;
          padding: 3px 6px;
          background: #282a36;
          color: #f8f8f2;
          border-radius: 3px;
          font-size: 11.5px;
          white-space: pre;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}

function prefixFor(kind: Entry['kind']): string {
  switch (kind) {
    case 'input': return '>';
    case 'result': return '⋖';
    case 'result-err': return '⋖';
    case 'error': return '!';
    case 'warn': return '△';
    case 'info': return 'i';
    default: return ' ';
  }
}
