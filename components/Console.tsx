'use client';

import { useEffect, useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';

interface PreviewError {
  name: string;
  message: string;
  file: string | null;
  line: number | null;
  col: number | null;
  snippet: string;
}

interface LogEntry {
  type: string;
  message: string;
  timestamp: string;
  err?: PreviewError;
}

type ConsoleTab = 'all' | 'warn' | 'error';

export default function Console({ resetKey }: { resetKey: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tab, setTab] = useState<ConsoleTab>('all');
  const scrollRef = useRef<HTMLPreElement>(null);
  // Track the most recent line:col already rendered as a structured error so
  // we can suppress the duplicate string-only 'preview-console' message that
  // arrives right after the structured 'preview-error'.
  const lastStructured = useRef<string>('');

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;
      const time = new Date().toLocaleTimeString();

      if (data.source === 'preview-error' && data.error) {
        const err = data.error as PreviewError;
        lastStructured.current = `${err.name}: ${err.message}`;
        setLogs((prev) => [
          ...prev,
          {
            type: 'error',
            message: `${err.name}: ${err.message}`,
            timestamp: time,
            err,
          },
        ]);
        return;
      }

      if (data.source !== 'preview-console') return;
      const text = (data.args ?? [])
        .map((a: unknown) =>
          typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
        )
        .join(' ');

      // Suppress the duplicate plain-string error that follows a structured one.
      if (
        data.type === 'error' &&
        lastStructured.current &&
        text.startsWith(lastStructured.current)
      ) {
        lastStructured.current = '';
        return;
      }

      setLogs((prev) => [
        ...prev,
        { type: data.type, message: text, timestamp: time },
      ]);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // clear logs when resetKey changes
  useEffect(() => {
    setLogs([]);
    lastStructured.current = '';
  }, [resetKey]);

  // auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, tab]);

  function jumpTo(err: PreviewError) {
    if (!err.file || !err.line) return;
    window.dispatchEvent(
      new CustomEvent('shcode:goto', {
        detail: { file: err.file, line: err.line, col: err.col ?? 1 },
      })
    );
  }

  const filtered =
    tab === 'all' ? logs : logs.filter((l) => l.type === tab);

  const warnCount = logs.filter((l) => l.type === 'warn').length;
  const errorCount = logs.filter((l) => l.type === 'error').length;

  return (
    <div className="console-root">
      <div className="console-controls">
        <div className="console-tabs">
          <button
            className={tab === 'all' ? 'active' : ''}
            onClick={() => setTab('all')}
          >
            All
          </button>
          <button
            className={`${tab === 'warn' ? 'active' : ''} ${warnCount > 0 ? 'has-count' : ''}`}
            onClick={() => setTab('warn')}
          >
            Warnings{warnCount > 0 ? ` (${warnCount})` : ''}
          </button>
          <button
            className={`${tab === 'error' ? 'active' : ''} ${errorCount > 0 ? 'has-count' : ''}`}
            onClick={() => setTab('error')}
          >
            Errors{errorCount > 0 ? ` (${errorCount})` : ''}
          </button>
        </div>
        <button className="console-clear" onClick={() => setLogs([])}>
          <Trash2 size={14} /> Clear
        </button>
      </div>
      <pre className="console-output" ref={scrollRef}>
        {filtered.length === 0 ? (
          <div className="console-empty">No messages.</div>
        ) : (
          filtered.map((log, i) =>
            log.err ? (
              <div key={i} className="log-entry log-error log-error-rich">
                <div className="log-error-line">
                  <span className="log-time">{log.timestamp}</span>
                  <span className="log-error-name">{log.err.name}:</span>
                  <span className="log-msg">{log.err.message}</span>
                </div>
                {log.err.file && log.err.line ? (
                  <button
                    type="button"
                    className="log-error-loc"
                    onClick={() => jumpTo(log.err!)}
                    title="Click to jump to this line in the editor"
                  >
                    {log.err.file}:{log.err.line}
                    {log.err.col ? `:${log.err.col}` : ''}
                  </button>
                ) : null}
                {log.err.snippet ? (
                  <code className="log-error-snippet">{log.err.snippet}</code>
                ) : null}
              </div>
            ) : (
              <div key={i} className={`log-entry log-${log.type}`}>
                <span className="log-time">{log.timestamp}</span>
                <span className="log-msg">{log.message}</span>
              </div>
            )
          )
        )}
      </pre>
      <style>{`
        .log-error-rich {
          display: block;
          padding: 4px 0;
          border-left: 2px solid #ff5555;
          padding-left: 8px;
          margin: 2px 0;
        }
        .log-error-line { display: flex; gap: 6px; align-items: baseline; flex-wrap: wrap; }
        .log-error-name { color: #ff5555; font-weight: 600; }
        .log-error-loc {
          display: inline-block;
          margin-top: 2px;
          background: transparent;
          border: none;
          color: #8be9fd;
          font: inherit;
          padding: 0;
          cursor: pointer;
          text-decoration: underline dotted;
        }
        .log-error-loc:hover { color: #50fa7b; }
        .log-error-snippet {
          display: block;
          margin-top: 4px;
          padding: 4px 6px;
          background: #282a36;
          color: #f8f8f2;
          border-radius: 3px;
          font-family: 'Fira Code', Consolas, monospace;
          font-size: 0.85em;
          white-space: pre;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
