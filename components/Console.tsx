'use client';

import { useEffect, useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';

interface LogEntry {
  type: string;
  message: string;
  timestamp: string;
}

type ConsoleTab = 'all' | 'warn' | 'error';

export default function Console({ resetKey }: { resetKey: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tab, setTab] = useState<ConsoleTab>('all');
  const scrollRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== 'preview-console') return;
      const text = data.args
        .map((a: any) =>
          typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
        )
        .join(' ');
      setLogs((prev) => [
        ...prev,
        { type: data.type, message: text, timestamp: new Date().toLocaleTimeString() },
      ]);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // clear logs when resetKey changes
  useEffect(() => {
    setLogs([]);
  }, [resetKey]);

  // auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, tab]);

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
          filtered.map((log, i) => (
            <div key={i} className={`log-entry log-${log.type}`}>
              <span className="log-time">{log.timestamp}</span>
              <span className="log-msg">{log.message}</span>
            </div>
          ))
        )}
      </pre>
    </div>
  );
}
