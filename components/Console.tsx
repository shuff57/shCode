'use client';

import { useEffect, useState } from 'react';

interface LogEntry {
  type: string;
  message: string;
}

export default function Console({ resetKey }: { resetKey: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== 'preview-console') return;
      const text = data.args.map((a: any) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      setLogs((prev) => [...prev, { type: data.type, message: text }]);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // clear logs when resetKey changes
  useEffect(() => {
    setLogs([]);
  }, [resetKey]);

  return (
    <div className="console-root">
      <div className="console-controls">
        <button onClick={() => setLogs([])}>Clear</button>
      </div>
      <pre className="console-output">
        {logs.map((log, i) => (
          <div key={i} className={`log-${log.type}`}>{log.message}</div>
        ))}
      </pre>
    </div>
  );
}

