'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import MoshionPreview from './MoshionPreview';
import LiveConsole from './LiveConsole';
import CodeMirrorPane from './CodeMirrorPane';
import { RUNNER_SOURCE, RUN_TIMEOUT_MS } from '../lib/js-runner-source';

interface Props {
  code: string;
  label?: string;
  height?: number;
  previewSize?: number;
  /** Stable id for this block — combined with lessonId to key localStorage. */
  blockId?: string;
  /** Lesson id that hosts this block. When both lessonId and blockId are
   *  provided, edits persist to localStorage under
   *  `shCode:liveBlock:<lessonId>:<blockId>`. */
  lessonId?: string;
  /** When true, render a DevTools-style console + REPL under the preview.
   *  Only meaningful when `plain` is false — there's no running iframe to
   *  attach a REPL to in plain mode. */
  showConsole?: boolean;
  /** Plain console-track code (no moSHion/canvas). Executes directly in the
   *  main thread (no moshion iframe) and shows a captured Output pane
   *  side-by-side with the editor — the same layout and execution model as
   *  the in-app console-lesson workspace (see LessonWorkspace's isConsoleMode
   *  branch). Use for Unit 1-4 `console.log`-only reading/example blocks;
   *  leave false for moshion/canvas sketches. */
  plain?: boolean;
}

interface PlainLogEntry {
  type: 'log' | 'warn' | 'error';
  message: string;
}

// Runs the block's code in a Worker with a kill timer, exactly as the graded
// console labs do (LessonWorkspace) and the sandbox does (SandboxWorkspace).
// This is the third caller of the same shared runner.
//
// It used to be a direct `new Function(code)()` on the main thread. These
// blocks are EDITABLE, and several readings hand the student a loop and invite
// them to change it -- 1.5.20 and 1.5.23 teach, in words, that "a loop that
// never increments its condition never stops". Typing that loop froze the tab
// hard enough that the block's own Reset button stopped responding, and the
// only way out was to close the tab and lose the edit. A fourteen-year-old
// reading about infinite loops should not have to conclude they broke the
// browser.
//
// Asynchronous because a timeout cannot interrupt synchronous main-thread
// code -- moving off the thread is the whole fix, not a detail of it.
function runPlainCode(code: string, done: (logs: PlainLogEntry[]) => void): () => void {
  const logs: PlainLogEntry[] = [];
  const push = (type: PlainLogEntry['type'], message: string) => logs.push({ type, message });

  if (typeof Worker === 'undefined') {
    // No Worker (very old browser): the direct call, which is the path that
    // can hang. Fallback only, never the default -- same tradeoff, and same
    // comment, as LessonWorkspace.
    const orig = { log: console.log, warn: console.warn, error: console.error };
    const capture = (type: PlainLogEntry['type']) => (...args: unknown[]) => {
      push(type, args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' '));
    };
    console.log = capture('log');
    console.warn = capture('warn');
    console.error = capture('error');
    try {
      new Function(code)(); // student/reading code execution (educational tool)
    } catch (e: unknown) {
      const name = e instanceof Error ? e.name : 'Error';
      const msg = e instanceof Error ? e.message : String(e);
      push('error', `${name}: ${msg}`);
    }
    console.log = orig.log;
    console.warn = orig.warn;
    console.error = orig.error;
    done(logs);
    return () => {};
  }

  const url = URL.createObjectURL(new Blob([RUNNER_SOURCE], { type: 'text/javascript' }));
  const worker = new Worker(url);
  let settled = false;

  const cleanup = () => {
    worker.terminate();
    URL.revokeObjectURL(url);
  };

  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(killer);
    cleanup();
    done(logs);
  };

  const killer = setTimeout(() => {
    push(
      'error',
      `Your code was still running after ${RUN_TIMEOUT_MS / 1000} seconds, so it was stopped. That usually means a loop never reaches its stopping point — check that the value in the condition actually changes inside the loop.`,
    );
    finish();
  }, RUN_TIMEOUT_MS);

  worker.onmessage = (e: MessageEvent) => {
    const d = e.data as { kind: string; type?: PlainLogEntry['type']; message?: string; name?: string };
    if (d.kind === 'log') {
      push(d.type || 'log', d.message || '');
      return;
    }
    if (d.kind === 'error') {
      push('error', `${d.name || 'Error'}: ${d.message || ''}`);
    }
    finish();
  };

  worker.onerror = (e: ErrorEvent) => {
    push('error', e.message || 'Error');
    finish();
  };

  worker.postMessage(code);

  // Caller cancels on unmount or on a second Run, so a slow block cannot post
  // logs into a component that has moved on.
  return () => {
    if (settled) return;
    settled = true;
    clearTimeout(killer);
    cleanup();
  };
}

function storageKeyFor(lessonId: string | undefined, blockId: string | undefined): string | null {
  if (!lessonId || !blockId) return null;
  return `shCode:liveBlock:${lessonId}:${blockId}`;
}

function legacyStorageKeyFor(lessonId: string | undefined, blockId: string | undefined): string | null {
  if (!lessonId || !blockId) return null;
  return `liveCodeBlock:${lessonId}:${blockId}`;
}

export default function LiveCodeBlock({
  code,
  label,
  height = 360,
  previewSize = 360,
  blockId,
  lessonId,
  showConsole = false,
  plain = false,
}: Props) {
  const initialCode = code.trim();
  const storageKey = storageKeyFor(lessonId, blockId);
  const legacyKey = legacyStorageKeyFor(lessonId, blockId);

  // Load any saved edit synchronously so the first render of the editor
  // already reflects the student's in-progress work, avoiding a flash
  // of the original starter code on reload.
  const [editorCode, setEditorCode] = useState<string>(() => {
    if (!storageKey || typeof window === 'undefined') return initialCode;
    // One-time migration from the old `liveCodeBlock:*` key.
    if (legacyKey) {
      const legacyValue = window.localStorage.getItem(legacyKey);
      if (legacyValue !== null) {
        if (window.localStorage.getItem(storageKey) === null) {
          window.localStorage.setItem(storageKey, legacyValue);
        }
        window.localStorage.removeItem(legacyKey);
      }
    }
    const saved = window.localStorage.getItem(storageKey);
    return saved !== null ? saved : initialCode;
  });

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [committedCode, setCommittedCode] = useState('');
  const [runKey, setRunKey] = useState(0);

  // Persist edits to localStorage, debounced so we don't write on every
  // keystroke. Removes the entry when the code is back at its starter so
  // stale storage doesn't accumulate.
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      if (editorCode === initialCode) {
        window.localStorage.removeItem(storageKey);
      } else {
        window.localStorage.setItem(storageKey, editorCode);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [editorCode, initialCode, storageKey]);

  const [plainLogs, setPlainLogs] = useState<PlainLogEntry[]>([]);
  const [hasRunPlain, setHasRunPlain] = useState(false);
  const [running, setRunning] = useState(false);

  // Cancels the in-flight Worker run, if any.
  const cancelRunRef = useRef<(() => void) | null>(null);
  useEffect(() => () => { cancelRunRef.current?.(); }, []);

  function run() {
    if (plain) {
      // A second Run while one is still going would otherwise leave the first
      // Worker alive to post into a state it no longer owns.
      cancelRunRef.current?.();
      setRunning(true);
      setHasRunPlain(true);
      cancelRunRef.current = runPlainCode(editorCode, (logs) => {
        cancelRunRef.current = null;
        setPlainLogs(logs);
        setRunning(false);
      });
      return;
    }
    setCommittedCode(editorCode);
    setRunKey((k) => k + 1);
  }

  function reset() {
    // Reset is the escape hatch from a runaway loop, so it has to stop the run
    // as well as clear the editor.
    cancelRunRef.current?.();
    cancelRunRef.current = null;
    setRunning(false);
    setEditorCode(initialCode);
    setCommittedCode('');
    setRunKey(0);
    setPlainLogs([]);
    setHasRunPlain(false);
    if (storageKey && typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
  }

  return (
    <div className="livecodeblock">
      {label && <div className="livecodeblock-label">{label}</div>}
      <div
        className="livecodeblock-body"
        style={
          {
            '--lcb-editor-h': `${height}px`,
            '--lcb-preview-side': `${previewSize}px`,
          } as CSSProperties
        }
      >
        <div className="livecodeblock-editor">
          <CodeMirrorPane
            value={editorCode}
            onChange={setEditorCode}
            fileKey={storageKey ?? blockId ?? 'live'}
            language="javascript"
          />
        </div>
        <div className={`livecodeblock-preview${plain ? ' livecodeblock-preview--plain' : ''}`}>
          {plain ? (
            <>
              <div className="output-header">Output</div>
              <pre className="console-output run-output">
                {!hasRunPlain ? (
                  <div className="console-empty">Click Run to see output.</div>
                ) : plainLogs.length === 0 ? (
                  <div className="console-empty">(no output)</div>
                ) : (
                  plainLogs.map((log, i) => (
                    <div key={i} className={`log-entry log-${log.type}`}>
                      <span className="log-msg">{log.message}</span>
                    </div>
                  ))
                )}
              </pre>
            </>
          ) : (
            <MoshionPreview ref={iframeRef} code={committedCode} runKey={runKey} />
          )}
        </div>
      </div>
      {showConsole && !plain && <LiveConsole iframeRef={iframeRef} resetKey={runKey} />}
      <div className="livecodeblock-toolbar">
        <button type="button" className="btn-run" onClick={run} disabled={running}>
          <Play size={13} strokeWidth={2.5} /> {running ? 'Running…' : 'Run'}
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={reset}>
          <RotateCcw size={12} /> Reset
        </button>
      </div>
      <style>{`
        /* Same chrome palette as the graded editor (.editor-card /
           .editor-body / .editor-file-toolbar in globals.css) so a live
           block in a reading looks like the same tool, not a different one. */
        .livecodeblock {
          border: 1px solid var(--border);
          border-radius: 4px;
          margin: 16px 0;
          background: var(--card);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .livecodeblock-label {
          padding: 6px 12px;
          background: var(--muted);
          border-bottom: 1px solid var(--border);
          font-size: 12px;
          color: var(--text);
          font-weight: 600;
        }

        /* Column layout (default / narrow): editor stacked above preview.
           Each child takes its own explicit height so nothing grows to
           indeterminate parent size. */
        .livecodeblock-body {
          display: flex;
          flex-direction: column;
        }
        .livecodeblock-editor {
          height: var(--lcb-editor-h);
          background: var(--card);
          overflow: hidden;
        }
        .livecodeblock-preview {
          width: 100%;
          height: var(--lcb-preview-side);
          background: #000;
          position: relative;
        }
        .livecodeblock-preview .jscad-frame,
        .livecodeblock-preview .jscad-empty {
          width: 100%;
          height: 100%;
          display: block;
        }

        /* Plain console-track mode: no canvas, so the preview pane becomes
           a flexible Output column (like the in-app console lesson split)
           instead of a fixed square. */
        .livecodeblock-preview--plain {
          background: var(--card);
          display: flex;
          flex-direction: column;
        }
        .livecodeblock-preview--plain .run-output {
          height: 100%;
        }

        /* Row layout: editor and preview side-by-side, both matching the
           preview's square height so the iframe is never clipped. */
        @media (min-width: 720px) {
          .livecodeblock-body {
            flex-direction: row;
            height: var(--lcb-preview-side);
          }
          .livecodeblock-editor {
            flex: 1 1 0;
            min-width: 0;
            height: 100%;
            border-right: 1px solid var(--border);
          }
          .livecodeblock-preview {
            width: var(--lcb-preview-side);
            height: 100%;
            flex-shrink: 0;
          }
          .livecodeblock-preview--plain {
            width: auto;
            flex: 1 1 0;
            min-width: 0;
          }
        }

        .livecodeblock-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: var(--card);
          border-top: 1px solid var(--border);
        }
      `}</style>
    </div>
  );
}
