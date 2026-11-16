'use client';

import { registerFlush } from '../lib/draft-autosave';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import MoshionPreview from './MoshionPreview';
import LiveConsole from './LiveConsole';
import CodeMirrorPane from './CodeMirrorPane';
import CodeWorkspace from './CodeWorkspace';
import EditorPreviewSplit from './EditorPreviewSplit';
import { RUN_TIMEOUT_MS, errorWithLocation, lineColOf, runStudentCode } from '../lib/js-runner-source';
import { ownedLocal } from '../lib/owned-storage';

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

// Runs the block's code through the shared runner with a kill timer, exactly as the graded
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
    // comment, as LessonWorkspace. No prompt() here (there is nothing to raise
    // a dialog with), but no book fence needs one.
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
      const { line, col } = lineColOf(e);
      push('error', errorWithLocation(name, msg, line, col));
    }
    console.log = orig.log;
    console.warn = orig.warn;
    console.error = orig.error;
    done(logs);
    return () => {};
  }

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    done(logs);
  };

  const run = runStudentCode(
    code,
    (d) => {
      if (d.kind === 'log') {
        push(d.type || 'log', d.message || '');
        return;
      }
      if (d.kind === 'error') {
        push('error', errorWithLocation(d.name, d.message, d.line, d.col));
      }
      finish();
    },
    () => {
      push(
        'error',
        `Your code was still running after ${RUN_TIMEOUT_MS / 1000} seconds, so it was stopped. That usually means a loop never reaches its stopping point — check that the value in the condition actually changes inside the loop.`,
      );
      finish();
    },
    () => {
      logs.length = 0;
    },
  );

  // Caller cancels on unmount or on a second Run, so a slow block cannot post
  // logs into a component that has moved on — and a block parked on an open
  // prompt() dialog is stopped here too.
  return () => {
    if (settled) return;
    settled = true;
    run.kill();
  };
}

/** Window event a live block's sketch Run sends; every other block stops its own sketch on it. */
export const LIVE_SKETCH_RUN = 'shcode:live-sketch-run';

function storageKeyFor(lessonId: string | undefined, blockId: string | undefined): string | null {
  if (!lessonId || !blockId) return null;
  // `w1:<owner>:liveBlock:<lessonId>:<blockId>` (lib/owned-storage.ts). The older
  // unprefixed `shCode:liveBlock:` and `liveCodeBlock:` keys are set aside there.
  return `liveBlock:${lessonId}:${blockId}`;
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

  // Load any saved edit synchronously so the first render of the editor
  // already reflects the student's in-progress work, avoiding a flash
  // of the original starter code on reload.
  const [editorCode, setEditorCode] = useState<string>(() => {
    if (!storageKey || typeof window === 'undefined') return initialCode;
    const saved = ownedLocal.getItem(storageKey);
    return saved !== null ? saved : initialCode;
  });

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [committedCode, setCommittedCode] = useState('');
  const [runKey, setRunKey] = useState(0);

  // One sketch at a time. Running a block stops every other block's sketch on the page (its frame
  // unmounts back to "Click Run"), so a reading with three blocks does not end up with three
  // sketches ticking at once (5.1.4's two sprite crowds doubled the cost; 5.1 editor audit r2).
  const blockToken = useRef({});
  useEffect(() => {
    const onOtherRun = (e: Event) => {
      if ((e as CustomEvent<{ token: object }>).detail?.token === blockToken.current) return;
      setCommittedCode('');
      setRunKey(0);
    };
    window.addEventListener(LIVE_SKETCH_RUN, onOtherRun);
    return () => window.removeEventListener(LIVE_SKETCH_RUN, onOtherRun);
  }, []);

  // Persist edits to localStorage, debounced so we don't write on every
  // keystroke. Removes the entry when the code is back at its starter so
  // stale storage doesn't accumulate.
  // A pending write is flushed, never dropped, when the block unmounts or the page
  // hides: it can only ever land in this page's own owner's keys.
  const pendingWrite = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    const write = () => {
      pendingWrite.current = null;
      if (editorCode === initialCode) {
        ownedLocal.removeItem(storageKey);
      } else {
        ownedLocal.setItem(storageKey, editorCode);
      }
    };
    pendingWrite.current = write;
    const timer = setTimeout(write, 300);
    return () => clearTimeout(timer);
  }, [editorCode, initialCode, storageKey]);
  useEffect(() => {
    const flush = () => pendingWrite.current?.();
    window.addEventListener('pagehide', flush);
    const offFlush = registerFlush(flush);
    return () => {
      offFlush();
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

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
    window.dispatchEvent(new CustomEvent(LIVE_SKETCH_RUN, { detail: { token: blockToken.current } }));
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
      ownedLocal.removeItem(storageKey);
    }
  }

  return (
    <div className="livecodeblock">
      {label && <div className="livecodeblock-label">{label}</div>}
      <div className="livecodeblock-toolbar">
        <button type="button" className="btn-run" onClick={run} disabled={running}>
          <Play size={13} strokeWidth={2.5} /> {running ? 'Running…' : 'Run'}
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={reset}>
          <RotateCcw size={12} /> Reset
        </button>
      </div>
      <CodeWorkspace
        style={{ '--workspace-height': `${Math.max(280, height, previewSize) + (showConsole && !plain ? 132 : 0)}px` } as CSSProperties}
        consoleResetKey={showConsole && !plain ? String(runKey) : undefined}
        consoleContent={<LiveConsole iframeRef={iframeRef} resetKey={runKey} />}
      >
        <EditorPreviewSplit embedded className="livecodeblock-body" editor={
          <div className="livecodeblock-editor">
            <CodeMirrorPane
              value={editorCode}
              onChange={setEditorCode}
              fileKey={storageKey ?? blockId ?? 'live'}
              language="javascript"
            />
          </div>
        } preview={
          <div className={`livecodeblock-preview${plain ? ' livecodeblock-preview--plain' : ''}`}>
            {plain ? (
              <>
                <div className="output-header">Output</div>
                <pre
                  className="console-output run-output"
                  role="log"
                  aria-live="polite"
                  aria-atomic="false"
                  aria-relevant="additions text"
                  aria-label="Program output"
                >
                  {!hasRunPlain ? (
                    <div className="console-empty livecode-empty"><span className="livecode-empty-icon" aria-hidden="true">▶</span><span>Press <strong>Run</strong> to see what this code prints.</span></div>
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
        } />
      </CodeWorkspace>
      <style>{`
        /* Same chrome palette as the graded editor (.editor-card /
           .editor-body / .editor-file-toolbar in globals.css) so a live
           block in a reading looks like the same tool, not a different one. */
        .livecodeblock {
          border: 1px solid var(--border);
          border-radius: 4px;
          margin: 16px 0;
          background: var(--card);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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

        .livecodeblock .livecodeblock-body { border: 0; border-radius: 0; box-shadow: none; }
        .livecodeblock-editor, .livecodeblock-preview { height: 100%; width: 100%; min-height: 0; overflow: hidden; }
        .livecodeblock-preview { background: var(--x-000000); position: relative; }
        .livecodeblock-preview--plain { background: var(--card); display: flex; flex-direction: column; }
        .livecodeblock-preview--plain .run-output { flex: 1; min-height: 0; }

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
