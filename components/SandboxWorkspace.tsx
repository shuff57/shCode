'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronUp, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, RotateCcw } from 'lucide-react';
import { useLessonStore } from '../lib/store';
import CodeEditor from './CodeEditor';
import MoshionPreview from './MoshionPreview';
import Console from './Console';
import TabbedRightDrawer, { type DrawerTab } from './TabbedRightDrawer';
import AiHelpPanel from './AiHelpPanel';
import TextureEditor from './TextureEditor';
import DocsDrawer from './DocsDrawer';
import { RUNNER_SOURCE, RUN_TIMEOUT_MS } from '../lib/js-runner-source';
import {
  NO_TEACHER_MODES,
  canUseBuild,
  canUseCode,
  resolveMode,
  whyLocked,
  type TeacherModes,
} from '../lib/lesson-mode';
import {
  SANDBOX_MODES,
  getMode,
  sandboxLesson,
  type SandboxModeId,
} from '../lib/sandbox-modes';

// The B-rep kernel + three.js viewport are heavy; a plain JS or moSHion
// sandbox session should never pay for them. Same dynamic-import pattern
// DiagramAssignmentView uses for DiagramEditor.
const ReshapeStudio = dynamic(() => import('./reshape/ReshapeStudio'), { ssr: false });

const MODE_KEY = 'shCode:sandbox-mode';
// Which side (Build/Code) reSHape opens on. Read once at page load and
// handed to ReshapeStudio as `startSide` -- the studio owns the toggle
// itself from then on (see its own file header), so this is a
// load-time default, not a live mirror of whatever side the student is
// currently on.
const BUILD_KEY = 'shCode:sandbox-reshape-build';

// The plain outlined chip the Reset and Full screen buttons both wear.
const chipStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 4,
  background: 'transparent',
  color: '#6272a4',
  border: '1px solid #44475a',
  cursor: 'pointer',
  fontSize: 13,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};

interface LogLine {
  type: string;
  message: string;
}

export default function SandboxWorkspace() {
  const setLesson = useLessonStore((s) => s.setLesson);
  const fileContents = useLessonStore((s) => s.fileContents);
  const updateFile = useLessonStore((s) => s.updateFile);

  const [modeId, setModeId] = useState<SandboxModeId>('moshion');
  const mode = useMemo(() => getMode(modeId), [modeId]);
  const lesson = useMemo(() => sandboxLesson(mode), [mode]);

  const [code, setCode] = useState('');
  const [runKey, setRunKey] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleResetKey, setConsoleResetKey] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>([]);

  // reSHape's own load-time default side -- see BUILD_KEY's comment above.
  const [build, setBuild] = useState(true);
  // The studio's CURRENT side, live -- reported back through onSideChange
  // (unlike `build` above, which only ever seeds `startSide`). Drives the
  // header/mode-tabs hide-in-Build chrome, which needs to know the real
  // side, not just what it started on.
  const [reshapeSide, setReshapeSide] = useState<'build' | 'code'>('build');
  // Bumped on Reset to force ReshapeStudio to remount: it only hydrates its
  // model from `value` once, at mount (see its own file header), so writing
  // the starter back into fileContents while it stays mounted would leave
  // the OLD model on screen next to the NEW starter text.
  const [reshapeResetKey, setReshapeResetKey] = useState(0);

  // WHICH GEOMETRY ENGINE DRAWS reSHape. The B-rep kernel, always -- operator
  // decision 2026-09-03, after the Chili3D gauntlet and the B-rep-default
  // loop: oracle 134/134, three student lenses through the Build tools
  // twice. The JSCAD runner and its ?engine=jscad / ?script=0 escape hatches
  // are gone (CLAUDE.md's "JSCAD is retired" section).

  // What the student's teachers have set. A failed or missing fetch resolves to
  // 'both', so a gate that cannot be read never locks anyone out of their work.
  const [teacherModes, setTeacherModes] = useState<TeacherModes>(NO_TEACHER_MODES);
  useEffect(() => {
    let live = true;
    fetch('/api/my-lesson-modes')
      .then((r) => (r.ok ? r.json() : NO_TEACHER_MODES))
      .then((m) => { if (live) setTeacherModes(m ?? NO_TEACHER_MODES); })
      .catch(() => { /* no gate readable, so no gate applied */ });
    return () => { live = false; };
  }, []);

  // Full screen puts the preview edge to edge and floats the editor over it,
  // so a shape can be built and then looked at without the editor in the way.
  const shellRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [editorHidden, setEditorHidden] = useState(false);
  const [consoleHidden, setConsoleHidden] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  // Restore the last mode before the first paint that matters. Reading in an
  // effect rather than useState's initialiser keeps the server and client
  // markup identical, which a static export needs.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MODE_KEY);
      if (saved && SANDBOX_MODES.some((m) => m.id === saved)) {
        setModeId(saved as SandboxModeId);
      }
      const b = window.localStorage.getItem(BUILD_KEY);
      if (b === '0') setBuild(false);
    } catch { /* private mode */ }
  }, []);

  // Each mode is its own lesson id, so the store keeps three independent
  // drafts and switching back finds your code where you left it.
  useEffect(() => {
    setLesson(lesson);
    setCode('');
    setRunKey(0);
    setIsRunning(false);
    setLogs([]);
  }, [lesson, setLesson]);

  function chooseMode(next: SandboxModeId) {
    if (next === modeId) return;
    workerRef.current?.terminate();
    workerRef.current = null;
    try { window.localStorage.setItem(MODE_KEY, next); } catch { /* private mode */ }
    setEditorHidden(false);
    setConsoleHidden(false);
    setModeId(next);
  }

  // ---- Running ----------------------------------------------------------

  const runJs = useCallback((script: string) => {
    workerRef.current?.terminate();
    const collected: LogLine[] = [];
    setLogs([]);
    setIsRunning(true);

    const url = URL.createObjectURL(new Blob([RUNNER_SOURCE], { type: 'text/javascript' }));
    const worker = new Worker(url);
    workerRef.current = worker;

    const cleanup = () => {
      worker.terminate();
      URL.revokeObjectURL(url);
      if (workerRef.current === worker) workerRef.current = null;
      setIsRunning(false);
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
      const d = e.data as { kind: string; type?: string; message?: string; name?: string };
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

    worker.postMessage(script);
  }, []);

  // js/moSHion only -- reSHape's Run lives inside ReshapeStudio now (it owns
  // its own script.js -> iframe handoff, see that component's file header).
  const run = useCallback(() => {
    const script = fileContents['script.js'] || '';
    if (mode.preview === 'console') {
      runJs(script);
      return;
    }
    setCode(script);
    setRunKey((k) => k + 1);
    setConsoleResetKey((k) => k + 1);
    setIsRunning(true);
  }, [fileContents, mode.preview, runJs]);

  function stopRun() {
    workerRef.current?.terminate();
    workerRef.current = null;
    setCode('');
    setRunKey(0);
    setConsoleResetKey((k) => k + 1);
    setIsRunning(false);
  }

  function reset() {
    if (window.confirm('Reset code to the starter? Unsaved work will be lost.')) {
      setLesson(lesson);
      stopRun();
      setLogs([]);
      // ReshapeStudio's own "Clear model" button (inside its Build toolbar)
      // wipes just the model, independent of this -- this resets the SAVED
      // TEXT to the starter, so the studio needs a fresh mount to pick it up.
      if (mode.preview === 'reshape') setReshapeResetKey((k) => k + 1);
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        // reSHape has its own Ctrl+Enter handling scoped to its Code side --
        // see ReshapeStudio's own keydown effect.
        if (mode.preview !== 'reshape') run();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [run, mode.preview]);

  // Same shape as DiagramEditor's fullscreen: the browser owns the state, we
  // only mirror it, so Esc and the F11-style exits stay correct for free.
  useEffect(() => {
    const onFs = () => {
      const active = document.fullscreenElement === shellRef.current;
      setFull(active);
      if (!active) {
        setEditorHidden(false);
        setConsoleHidden(false);
      }
      setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      shellRef.current?.requestFullscreen?.().catch(() => {
        // Rejected outside a user gesture or in a sandboxed frame; staying
        // windowed is the correct fallback.
      });
    }
  }, []);

  // Pane resize — same drag-handle plumbing as LessonWorkspace. No-ops
  // gracefully (early return) when reSHape has replaced #split's contents
  // wholesale, since #editorPane/#previewPane are not in the DOM then.
  useEffect(() => {
    const split = document.getElementById('split') as HTMLElement | null;
    const divider = document.getElementById('divider') as HTMLElement | null;
    const left = document.getElementById('editorPane') as HTMLElement | null;
    const right = document.getElementById('previewPane') as HTMLElement | null;
    const overlay = document.getElementById('dragOverlay') as HTMLElement | null;
    if (!split || !divider || !left || !right || !overlay) return;

    let dragging = false;
    let rect: DOMRect | null = null;
    let rafId: number | null = null;

    const relayoutEditor = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
        rafId = null;
      });
    };

    const setPositions = (clientX: number) => {
      if (!rect) rect = split.getBoundingClientRect();
      const min = 220;
      const max = rect.width - 220;
      let x = clientX - rect.left;
      x = Math.max(min, Math.min(max, x));
      const leftPct = (x / rect.width) * 100;
      left.style.flex = `0 0 ${leftPct}%`;
      right.style.flex = `0 0 ${100 - leftPct}%`;
      relayoutEditor();
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      setPositions(e.clientX);
      e.preventDefault();
    };

    const stopDrag = () => {
      if (!dragging) return;
      dragging = false;
      overlay.style.display = 'none';
      document.body.style.userSelect = '';
      document.body.classList.remove('is-resizing');
      window.removeEventListener('pointermove', onMove, false);
      window.removeEventListener('pointerup', onUp, false);
      window.removeEventListener('pointercancel', onCancel, false);
      window.removeEventListener('blur', onWindowBlur, false);
      document.removeEventListener('visibilitychange', onVisChange, false);
    };

    const onUp = (e: PointerEvent) => {
      try {
        divider.releasePointerCapture(e.pointerId);
      } catch {}
      stopDrag();
    };
    const onCancel = () => stopDrag();
    const onWindowBlur = () => stopDrag();
    const onVisChange = () => { if (document.hidden) stopDrag(); };

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      rect = split.getBoundingClientRect();
      overlay.style.display = 'block';
      document.body.style.userSelect = 'none';
      document.body.classList.add('is-resizing');
      try { divider.setPointerCapture(e.pointerId); } catch {}
      window.addEventListener('pointermove', onMove, false);
      window.addEventListener('pointerup', onUp, false);
      window.addEventListener('pointercancel', onCancel, false);
      window.addEventListener('blur', onWindowBlur, false);
      document.addEventListener('visibilitychange', onVisChange, false);
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const step = e.shiftKey ? 40 : 10;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        rect = split.getBoundingClientRect();
        const currentLeft = left.getBoundingClientRect().width || rect.width / 2;
        const next = currentLeft + (e.key === 'ArrowRight' ? step : -step);
        setPositions(rect.left + next);
        e.preventDefault();
      }
    };

    divider.addEventListener('pointerdown', onPointerDown, false);
    divider.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('resize', relayoutEditor, false);

    return () => {
      stopDrag();
      divider.removeEventListener('pointerdown', onPointerDown, false);
      divider.removeEventListener('keydown', onKeyDown, false);
      window.removeEventListener('resize', relayoutEditor, false);
    };
  }, [modeId]);

  const drawerTabs: DrawerTab[] = [
    // moSHion only. reSHape has no sprites and the JS console has no canvas,
    // so a texture editor there is a tab that can never be acted on.
    ...(mode.preview === 'moshion'
      ? [{
          key: 'textures',
          label: 'Textures',
          color: '#8be9fd',
          content: <TextureEditor />,
          headerExtra: (
            <a href="/textures" target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
              Full page ↗
            </a>
          ),
        } as DrawerTab]
      : []),
    {
      key: 'help',
      label: 'Help',
      color: '#ffb86c',
      content: <AiHelpPanel lesson={lesson} />,
    },
    {
      key: 'docs',
      label: 'Docs',
      color: '#bd93f9',
      content: <DocsDrawer defaultSetId={mode.id} storageKey="shCode:sandbox-docs" />,
      headerExtra: mode.docsHref ? (
        <a
          href={mode.docsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary btn-sm"
        >
          Docs ↗
        </a>
      ) : undefined,
    },
  ];

  const isConsole = mode.preview === 'console';
  const isReshape = mode.preview === 'reshape';

  // The sandbox has no assignment, so only the class-wide gate can reach it.
  // Per-assignment overrides apply in lessons, where a lesson id exists.
  const gate = resolveMode('sandbox', teacherModes);
  const mayBuild = canUseBuild(gate);
  const mayCode = canUseCode(gate);
  const lockNote = whyLocked(gate);
  const reshapeSides = useMemo<('build' | 'code')[]>(() => {
    const s: ('build' | 'code')[] = [];
    if (mayBuild) s.push('build');
    if (mayCode) s.push('code');
    return s.length ? s : ['build', 'code'];
  }, [mayBuild, mayCode]);
  const reshapeIsBuild = isReshape && reshapeSide === 'build';

  // Reset and Full screen fold into ReshapeStudio's OWN toolbar row for
  // reSHape (rather than a second row above it) so the ribbon reads as one
  // strip, matching the pre-extraction sandbox the parity loop was judged
  // against -- and the program-type tabs join them too, but only on the
  // Code side; Build hides them the same way it always has (no room, and no
  // reason to switch program type mid-model).
  const reshapeToolbarExtra = isReshape ? (
    <>
      {!reshapeIsBuild && (
        <div className="sandbox-modes" role="group" aria-label="Program type">
          {SANDBOX_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={m.id === modeId}
              className={m.id === modeId ? 'sandbox-mode is-active' : 'sandbox-mode'}
              onClick={() => chooseMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
      {lockNote && <span className="sandbox-lock">{lockNote}</span>}
      <button style={chipStyle} onClick={reset}>
        <RotateCcw size={12} />
        Reset
      </button>
      <button
        style={chipStyle}
        onClick={toggleFull}
        title={full ? 'Leave full screen (Esc)' : 'Fill the screen with the preview'}
      >
        {full ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        {full ? 'Exit full screen' : 'Full screen'}
      </button>
    </>
  ) : null;

  return (
    <>
      <TabbedRightDrawer storageKey="shCode:sandbox-drawer" tabs={drawerTabs} />
      <div
        className={
          'sandbox-shell'
          + (full ? ' is-full' : '')
          + (full && editorHidden && !isReshape ? ' is-editor-hidden' : '')
          + (full && consoleHidden ? ' is-console-hidden' : '')
        }
        ref={shellRef}
      >
        {!reshapeIsBuild && (
          <div className="sandbox-header">
            <h1 className="sandbox-title">Sandbox</h1>
            <span className="sandbox-subtitle">{mode.blurb}</span>
          </div>
        )}

        {!isReshape && (
          <div className="run-toolbar sandbox-toolbar">
            <div className="sandbox-modes" role="group" aria-label="Program type">
              {SANDBOX_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={m.id === modeId}
                  className={m.id === modeId ? 'sandbox-mode is-active' : 'sandbox-mode'}
                  onClick={() => chooseMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button className="btn-run" onClick={run}>▶ Run</button>
            {isRunning && (
              <button
                className="btn-secondary btn-sm"
                style={{ color: '#ff5555', borderColor: '#ff5555' }}
                onClick={stopRun}
              >
                ■ Stop
              </button>
            )}
            <button style={chipStyle} onClick={reset}>
              <RotateCcw size={12} />
              Reset
            </button>
            <button
              style={chipStyle}
              onClick={toggleFull}
              title={full ? 'Leave full screen (Esc)' : 'Fill the screen with the preview'}
            >
              {full ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              {full ? 'Exit full screen' : 'Full screen'}
            </button>
            <span className="run-hint">Ctrl+Enter</span>
          </div>
        )}

        <div className="editor-preview-container sandbox-split" id="split">
          {isReshape ? (
            <ReshapeStudio
              key={`${modeId}-${reshapeResetKey}`}
              value={fileContents['script.js'] ?? ''}
              onChange={(t) => updateFile('script.js', t)}
              sides={reshapeSides}
              startSide={build ? 'build' : 'code'}
              onSideChange={setReshapeSide}
              toolbarExtra={reshapeToolbarExtra}
              // The sandbox's `value` on a fresh session is RESHAPE_STARTER
              // (a Code-side teaching example, box+hole already in it), not
              // saved progress -- auto-adopting it into Build pre-built a
              // model before the student touched a tool. See this prop's
              // own doc comment.
              autoRunOnMount={false}
              lessonId="sandbox"
            />
          ) : (
            <>
              <div className="pane" id="editorPane">
                <CodeEditor />
              </div>
              <div
                className="divider"
                id="divider"
                tabIndex={0}
                aria-label="Resize editor and preview"
              >
                <span className="drag-handle" aria-hidden="true"></span>
              </div>
              <div className="pane" id="previewPane">
                {isConsole ? (
                  <>
                    <div className="output-header">Output</div>
                    <pre className="console-output run-output">
                      {logs.length === 0 ? (
                        <div className="console-empty">Click Run to see output.</div>
                      ) : (
                        logs.map((log, i) => (
                          <div key={i} className={`log-entry log-${log.type}`}>
                            <span className="log-msg">{log.message}</span>
                          </div>
                        ))
                      )}
                    </pre>
                  </>
                ) : (
                  <MoshionPreview code={code} runKey={runKey} />
                )}
              </div>
              <div className="drag-overlay" id="dragOverlay" aria-hidden="true"></div>
            </>
          )}
        </div>
        {full && !isReshape && (
          <button
            type="button"
            className="sandbox-editor-toggle"
            onClick={() => setEditorHidden((h) => !h)}
            title={editorHidden ? 'Show the editor again' : 'Hide the editor and keep the shape'}
          >
            {editorHidden ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
            {editorHidden ? 'Editor' : 'Hide editor'}
          </button>
        )}

        {!isConsole && !reshapeIsBuild && (
          <div className="sandbox-console-wrap">
            <div className="output-header">Console</div>
            <div className="sandbox-console-body">
              <Console resetKey={String(consoleResetKey)} />
            </div>
          </div>
        )}
        {full && !isConsole && !reshapeIsBuild && (
          <button
            type="button"
            className="sandbox-console-toggle"
            onClick={() => setConsoleHidden((h) => !h)}
            title={consoleHidden ? 'Show the console again' : 'Hide the console and keep the shape'}
          >
            {consoleHidden ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {consoleHidden ? 'Console' : 'Hide console'}
          </button>
        )}
      </div>
      <style>{`
        .sandbox-shell {
          display: flex;
          position: relative;
          flex-direction: column;
          gap: 10px;
          height: calc(100vh - 180px);
          min-height: 560px;
          margin-right: 28px;
        }
        .sandbox-header { display: flex; align-items: baseline; gap: 12px; flex-shrink: 0; }
        .sandbox-title { margin: 0; font-size: 1.4rem; color: var(--text); }
        .sandbox-subtitle { color: #6272a4; font-size: 0.85rem; }
        .sandbox-toolbar { margin-bottom: 0; flex-shrink: 0; }
        .sandbox-modes {
          display: inline-flex;
          border: 1px solid #44475a;
          border-radius: 4px;
          overflow: hidden;
          margin-right: 10px;
        }
        .sandbox-mode {
          padding: 6px 13px;
          background: transparent;
          color: #6272a4;
          border: 0;
          border-right: 1px solid #44475a;
          cursor: pointer;
          font-size: 13px;
        }
        .sandbox-mode:last-child { border-right: 0; }
        .sandbox-mode:hover { color: var(--text); }
        .sandbox-mode.is-active { background: #44475a; color: #f8f8f2; }
        .sandbox-mode:disabled { opacity: 0.35; cursor: not-allowed; }
        .sandbox-lock { color: #ffb86c; font-size: 12px; margin-right: 10px; }
        .sandbox-split.editor-preview-container {
          height: auto;
          flex: 1 1 auto;
          min-height: 280px;
        }
        .sandbox-console-wrap {
          display: flex;
          flex-direction: column;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 4px;
          overflow: hidden;
          flex: 0 0 auto;
          height: 240px;
          min-height: 120px;
          max-height: 60vh;
          resize: vertical;
        }
        .sandbox-console-body { flex: 1; min-height: 0; padding: 6px 8px; overflow: hidden; display: flex; }
        .sandbox-console-body .console-root {
          flex: 1;
          height: auto;
          max-height: none;
          min-height: 0;
          resize: none;
        }

        /* ---- full screen ----
           The preview takes the whole screen and the editor floats over its
           left edge, so "build the shape, then get the editor out of the way"
           is one click and does not throw the shape away. The title and the
           console are the two things worth the space they were taking. */
        .sandbox-shell.is-full {
          height: 100vh;
          min-height: 0;
          margin: 0;
          padding: 8px;
          gap: 8px;
          background: var(--bg);
        }
        .sandbox-shell.is-full .sandbox-header,
        .sandbox-shell.is-full .divider { display: none; }
        .sandbox-shell.is-full .sandbox-split { min-height: 0; }
        /* !important beats the inline flex the divider drag leaves behind --
           without it the pane keeps whatever split it was dragged to. */
        .sandbox-shell.is-full #previewPane { flex: 1 1 100% !important; }
        .sandbox-shell.is-full #editorPane {
          position: absolute;
          left: 12px;
          top: 12px;
          bottom: 12px;
          /* .pane sets height:100%, which would win over the top/bottom pair
             and hang the panel 24px past the bottom of the frame. */
          height: auto;
          width: min(420px, 45%);
          flex: 0 0 auto !important;
          min-width: 0;
          z-index: 40;
          background: var(--card);
          border: 1px solid #565a70;
          border-radius: 6px;
          box-shadow: 0 12px 36px rgba(0,0,0,0.6);
          overflow: hidden;
        }
        .sandbox-shell.is-editor-hidden #editorPane { display: none; }
        .sandbox-editor-toggle {
          position: absolute;
          top: 12px;
          left: calc(min(420px, 45%) + 22px);
          z-index: 50;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          font-size: 12px;
          color: #d3d5e3;
          background: rgba(40, 42, 54, 0.92);
          border: 1px solid #565a70;
          border-radius: 4px;
          cursor: pointer;
        }
        .sandbox-editor-toggle:hover { background: #44475a; }
        .sandbox-shell.is-editor-hidden .sandbox-editor-toggle { left: 12px; }
        .sandbox-console-toggle {
          position: absolute;
          right: 12px;
          top: 12px;
          z-index: 50;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          font-size: 12px;
          color: #d3d5e3;
          background: rgba(40, 42, 54, 0.92);
          border: 1px solid #565a70;
          border-radius: 4px;
          cursor: pointer;
        }
        .sandbox-console-toggle:hover { background: #44475a; }
        /* The console sits at the bottom edge and the toggle sits above its
           right corner, so it never covers a line of output. */
        .sandbox-shell.is-full .sandbox-console-wrap {
          position: absolute;
          left: 8px;
          right: 8px;
          bottom: 8px;
          height: 42%;
          max-height: 42%;
          min-height: 0;
          resize: none;
          border: 1px solid #565a70;
          box-shadow: 0 -8px 32px rgba(0,0,0,0.45);
        }
        .sandbox-shell.is-console-hidden .sandbox-console-wrap { display: none; }
        .sandbox-shell.is-console-hidden .sandbox-console-toggle { bottom: 12px; top: auto; }
      `}</style>
    </>
  );
}
