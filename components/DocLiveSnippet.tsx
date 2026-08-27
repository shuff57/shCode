'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import CodeMirrorPane from './CodeMirrorPane';
import { RUNNER_SOURCE, RUN_TIMEOUT_MS } from '../lib/js-runner-source';

interface Props {
  initialCode: string;
  fileKey: string;
}

interface LogEntry {
  type: 'log' | 'warn' | 'error';
  message: string;
}

// Editor + output pair for plain-JavaScript snippets in the docs drawer.
// Runs in a Worker with a kill timer, exactly like the console lessons and
// the sandbox's JavaScript mode — a docs page that teaches an infinite loop
// (it does; see Loops > Infinite loops) must not be able to freeze the tab.
//
// The Worker has no window, so localStorage does not exist there. The JSON &
// Storage section teaches the save-by-key pattern, so a small in-memory
// localStorage is injected ahead of the runner: the pattern runs for real
// (save, load, parse, missing-key check) within the one run. The "survives
// the page closing" half cannot be shown in a console runner, and the page
// body says so.
const STORAGE_SHIM = `
const __store = new Map();
const localStorage = {
  setItem: (k, v) => { __store.set(String(k), String(v)); },
  getItem: (k) => (__store.has(String(k)) ? __store.get(String(k)) : null),
  removeItem: (k) => { __store.delete(String(k)); },
};
`;

export default function DocLiveSnippet({ initialCode, fileKey }: Props) {
  const [code, setCode] = useState(initialCode);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const dirty = code !== initialCode;

  useEffect(() => () => { cancelRef.current?.(); }, []);

  const handleRun = () => {
    cancelRef.current?.();
    setLogs([]);
    setHasRun(true);
    setRunning(true);

    const collected: LogEntry[] = [];
    const url = URL.createObjectURL(new Blob([RUNNER_SOURCE], { type: 'text/javascript' }));
    const worker = new Worker(url);

    const cleanup = () => {
      worker.terminate();
      URL.revokeObjectURL(url);
      cancelRef.current = null;
      setRunning(false);
    };

    const killer = setTimeout(() => {
      collected.push({
        type: 'error',
        message: `Your code was still running after ${RUN_TIMEOUT_MS / 1000} seconds, so it was stopped. That usually means a loop never reaches its stopping point — check that the value in the condition actually changes inside the loop.`,
      });
      setLogs([...collected]);
      cleanup();
    }, RUN_TIMEOUT_MS);

    worker.onmessage = (e: MessageEvent) => {
      const d = e.data as { kind: string; type?: LogEntry['type']; message?: string; name?: string };
      if (d.kind === 'log') {
        collected.push({ type: d.type || 'log', message: d.message || '' });
        setLogs([...collected]);
        return;
      }
      if (d.kind === 'error') {
        collected.push({ type: 'error', message: `${d.name || 'Error'}: ${d.message || ''}` });
        setLogs([...collected]);
      }
      clearTimeout(killer);
      cleanup();
    };

    worker.onerror = (e: ErrorEvent) => {
      clearTimeout(killer);
      collected.push({ type: 'error', message: e.message || 'Error' });
      setLogs([...collected]);
      cleanup();
    };

    worker.postMessage(STORAGE_SHIM + '\n' + code);
    cancelRef.current = cleanup;
  };

  const handleReset = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setCode(initialCode);
    setLogs([]);
    setHasRun(false);
    setRunning(false);
  };

  const paneStyle = {
    border: '1px solid #44475a',
    borderRadius: 4,
    overflow: 'hidden',
  };

  return (
    <div style={{ margin: '8px 0 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ ...paneStyle, height: 180 }}>
        <CodeMirrorPane value={code} onChange={setCode} fileKey={fileKey} />
      </div>
      <div style={{ ...paneStyle, background: '#111', minHeight: 90, maxHeight: 220, overflowY: 'auto' }}>
        {!hasRun ? (
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              color: '#6272a4',
              fontSize: '0.8rem',
              padding: 8,
              textAlign: 'center',
              minHeight: 90,
            }}
          >
            Click <strong style={{ color: '#50fa7b', margin: '0 4px' }}>Run</strong> to see the output
          </div>
        ) : logs.length === 0 ? (
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              color: '#6272a4',
              fontSize: '0.8rem',
              padding: 8,
              minHeight: 90,
            }}
          >
            (no output)
          </div>
        ) : (
          <pre style={{ margin: 0, padding: '8px 10px', fontSize: '0.78rem', lineHeight: 1.5, fontFamily: "'Fira Code', Consolas, monospace" }}>
            {logs.map((log, i) => (
              <div
                key={i}
                style={{
                  color: log.type === 'error' ? '#ff5555' : log.type === 'warn' ? '#ffb86c' : '#f8f8f2',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {log.message}
              </div>
            ))}
          </pre>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: '#50fa7b',
            color: '#21222c',
            border: 'none',
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: running ? 'default' : 'pointer',
            opacity: running ? 0.6 : 1,
          }}
        >
          <Play size={12} /> {running ? 'Running…' : 'Run'}
        </button>
        <button
          type="button"
          disabled={!dirty && !hasRun}
          onClick={handleReset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            color: dirty || hasRun ? '#bd93f9' : '#6272a4',
            border: '1px solid #44475a',
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: dirty || hasRun ? 'pointer' : 'default',
          }}
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>
    </div>
  );
}
