'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import CodeMirrorPane from './CodeMirrorPane';
import { RUN_TIMEOUT_MS, errorWithLocation, runStudentCode } from '../lib/js-runner-source';

interface Props {
  initialCode: string;
  fileKey: string;
}

interface LogEntry {
  type: 'log' | 'warn' | 'error';
  message: string;
}

// Editor + output pair for plain-JavaScript snippets in the docs drawer.
// Runs through the shared runner with a kill timer, exactly like the console
// lessons and the sandbox's JavaScript mode — a docs page that teaches an
// infinite loop (it does; see Loops > Infinite loops) must not be able to
// freeze the tab.
//
// The runner injects a small in-memory localStorage stand-in (see
// lib/js-runner-source.ts), so the JSON & Storage section's save-by-key
// pattern runs for real here without this component adding anything, and it
// raises prompt() for real, so the Input section's own example runs. The
// "survives the page closing" half cannot be shown in a console runner, and
// the page body says so.

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
    const finish = () => {
      cancelRef.current = null;
      setRunning(false);
    };
    cancelRef.current = finish;

    const run = runStudentCode(
      code,
      (d) => {
        if (d.kind === 'log') {
          collected.push({ type: d.type || 'log', message: d.message || '' });
          setLogs([...collected]);
          return;
        }
        if (d.kind === 'error') {
          collected.push({ type: 'error', message: errorWithLocation(d.name, d.message, d.line, d.col) });
          setLogs([...collected]);
        }
        finish();
      },
      () => {
        collected.push({
          type: 'error',
          message: `Your code was still running after ${RUN_TIMEOUT_MS / 1000} seconds, so it was stopped. That usually means a loop never reaches its stopping point — check that the value in the condition actually changes inside the loop.`,
        });
        setLogs([...collected]);
        finish();
      },
      () => {
        collected.length = 0;
      },
    );
    // Stopping a run that is waiting on an open prompt() dialog has to work too,
    // so cancelling means killing, not just clearing the button state.
    const cancel = () => {
      run.kill();
      finish();
    };
    cancelRef.current = cancel;
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
    border: '1px solid var(--c-line)',
    borderRadius: 4,
    overflow: 'hidden',
  };

  return (
    <div className="doc-live-snippet" style={{ margin: '8px 0 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="doc-live-toolbar" style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn-run"
          onClick={handleRun}
          disabled={running}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minHeight: 32, fontSize: 14 }}
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
            color: dirty || hasRun ? 'var(--c-purple)' : 'var(--c-comment)',
            border: '1px solid var(--c-line)',
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
      <div className="doc-live-editor" style={{ ...paneStyle, height: 180 }}>
        <CodeMirrorPane value={code} onChange={setCode} fileKey={fileKey} />
      </div>
      <div className="doc-live-output" style={{ ...paneStyle, background: 'var(--x-111111)', minHeight: 90, maxHeight: 220, overflowY: 'auto' }}>
        {!hasRun ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              overflowX: 'auto',
              color: 'var(--c-meta)',
              fontSize: 13,
              padding: 8,
              textAlign: 'center',
              minHeight: 90,
            }}
          >
            <span>Click Run to see the output</span>
          </div>
        ) : logs.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              overflowX: 'auto',
              color: 'var(--c-meta)',
              fontSize: 13,
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
                  color: log.type === 'error' ? 'var(--c-red)' : log.type === 'warn' ? 'var(--c-orange)' : 'var(--c-fg)',
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

    </div>
  );
}
