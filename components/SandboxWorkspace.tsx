'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useLessonStore } from '../lib/store';
import CodeEditor from './CodeEditor';
import ShPlayPreview from './ShPlayPreview';
import JscadPreview from './JscadPreview';
import JscadParamsPanel, { type ParamDef, type ParamValues } from './JscadParamsPanel';
import Console from './Console';
import TabbedRightDrawer, { type DrawerTab } from './TabbedRightDrawer';
import AiHelpPanel from './AiHelpPanel';
import ShPlayDocsContent from './ShPlayDocsContent';
import ModelEditor from './model/ModelEditor';
import { EMPTY_DOC, type ModelDoc } from '../lib/model-types';
import { applyParam, paramValues as docParams, toJscad } from '../lib/model-codegen';
import { RUNNER_SOURCE, RUN_TIMEOUT_MS } from '../lib/js-runner-source';
import {
  SANDBOX_MODES,
  getMode,
  sandboxLesson,
  type SandboxModeId,
} from '../lib/sandbox-modes';

const MODE_KEY = 'shCode:sandbox-mode';
const BUILD_KEY = 'shCode:sandbox-jscad-build';

interface LogLine {
  type: string;
  message: string;
}

export default function SandboxWorkspace() {
  const setLesson = useLessonStore((s) => s.setLesson);
  const fileContents = useLessonStore((s) => s.fileContents);
  const updateFile = useLessonStore((s) => s.updateFile);

  const [modeId, setModeId] = useState<SandboxModeId>('shplay');
  const mode = useMemo(() => getMode(modeId), [modeId]);
  const lesson = useMemo(() => sandboxLesson(mode), [mode]);

  const [code, setCode] = useState('');
  const [runKey, setRunKey] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleResetKey, setConsoleResetKey] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>([]);

  // JSCAD dimensions, published by the runner on every load.
  const [paramDefs, setParamDefs] = useState<ParamDef[]>([]);
  const [paramValues, setParamValues] = useState<ParamValues>({});
  const [rebuildMs, setRebuildMs] = useState<number | null>(null);
  const [stale, setStale] = useState<'empty' | 'error' | null>(null);

  // Build mode: the model is a ModelDoc and the code is generated from it.
  // Toggling to Code shows that generated source, read-only -- editing it would
  // need the code parsed back into features, which is a permanent non-goal.
  const [build, setBuild] = useState(false);
  const [doc, setDoc] = useState<ModelDoc>(EMPTY_DOC);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
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
      if (b === '1') setBuild(true);
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
    setParamDefs([]);
    setParamValues({});
    setRebuildMs(null);
    setStale(null);
  }, [lesson, setLesson]);

  function chooseMode(next: SandboxModeId) {
    if (next === modeId) return;
    workerRef.current?.terminate();
    workerRef.current = null;
    try { window.localStorage.setItem(MODE_KEY, next); } catch { /* private mode */ }
    setModeId(next);
  }

  // ---- JSCAD: dimensions in, rebuild timings out ----------------------------

  useEffect(() => {
    if (mode.preview !== 'jscad') return;
    const onMessage = (e: MessageEvent) => {
      // Filter by source, not origin: the runner frame is sandboxed without
      // allow-same-origin, so its origin is opaque ("null") by design.
      if (frameRef.current && e.source !== frameRef.current.contentWindow) return;
      const d = e.data as {
        source?: string; defs?: ParamDef[]; values?: ParamValues;
        ms?: number; empty?: boolean; failed?: boolean;
      };
      if (d?.source === 'jscad-params') {
        setParamDefs(Array.isArray(d.defs) ? d.defs : []);
        setParamValues(d.values ?? {});
        setRebuildMs(null);
        setStale(null);
      } else if (d?.source === 'jscad-rebuilt' && typeof d.ms === 'number') {
        setStale(d.failed ? 'error' : d.empty ? 'empty' : null);
        if (!d.empty && !d.failed) setRebuildMs(d.ms);
      } else if (d?.source === 'preview-error') {
        // A script that throws on load never reaches jscad-rebuilt, so without
        // this the failure is visible only inside the frame — and the panel
        // goes on showing numbers for a model that was never built.
        setStale('error');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [mode.preview]);

  const setParams = useCallback((next: ParamValues) => {
    setParamValues((prev) => ({ ...prev, ...next }));
    // Keep the doc in step, or the generated code would still describe the old
    // numbers the next time a structural edit regenerates it.
    setDoc((prev) => {
      let d = prev;
      for (const [k, v] of Object.entries(next)) {
        if (typeof v === 'number') d = applyParam(d, k, v);
      }
      return d;
    });
    frameRef.current?.contentWindow?.postMessage(
      { source: 'jscad-set-params', params: next },
      '*'
    );
  }, []);

  // Leaving Build with something built is the one-way door. The generated file
  // is handed over to be edited by hand, and the shape tools stop driving it --
  // going back the other way would mean parsing JavaScript into features, which
  // is a permanent non-goal.
  function chooseBuild(on: boolean) {
    if (!on && doc.features.length > 0) {
      const ok = window.confirm(
        'Copy what you built into the code editor? You can edit the code freely '
        + 'after this, but the shape tools will no longer be driving it.'
      );
      if (!ok) return;
      updateFile('script.js', toJscad(doc));
      setDoc(EMPTY_DOC);
    }
    try { window.localStorage.setItem(BUILD_KEY, on ? '1' : '0'); } catch { /* private mode */ }
    setBuild(on);
  }

  // Adding, deleting or reordering changes the shape of the file, so this is
  // the slow path: regenerate and reload. Changing a number never comes here.
  const applyDoc = useCallback((next: ModelDoc) => {
    setDoc(next);
    setParamDefs([]);
    setParamValues(() => docParams(next));
    setRebuildMs(null);
    setStale(null);
    setCode(toJscad(next));
    setRunKey((k) => k + 1);
    setIsRunning(true);
  }, []);

  // ---- Running --------------------------------------------------------------

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

  const run = useCallback(() => {
    const script = fileContents['script.js'] || '';
    if (mode.preview === 'console') {
      runJs(script);
      return;
    }
    // A fresh runKey remounts the frame. This is the slow path — it reparses
    // the whole script — and is why a dimension change goes by postMessage
    // instead of coming through here.
    setParamDefs([]);
    setParamValues({});
    setRebuildMs(null);
    setStale(null);
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
    setParamDefs([]);
    setParamValues({});
    setRebuildMs(null);
    setStale(null);
  }

  function reset() {
    if (window.confirm('Reset code to the starter? Unsaved work will be lost.')) {
      setLesson(lesson);
      stopRun();
      setLogs([]);
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [run]);

  // Pane resize — same drag-handle plumbing as LessonWorkspace.
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
  }, []);

  const drawerTabs: DrawerTab[] = [
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
      content:
        mode.id === 'shplay' ? (
          <ShPlayDocsContent />
        ) : (
          <div style={{ padding: '12px 14px', color: '#6272a4', fontSize: 13, lineHeight: 1.6 }}>
            {mode.docsHref
              ? 'Open the full reference in a new tab.'
              : 'This mode is plain JavaScript — no library reference needed.'}
          </div>
        ),
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
  const isJscad = mode.preview === 'jscad';

  return (
    <>
      <TabbedRightDrawer storageKey="shCode:sandbox-drawer" tabs={drawerTabs} />
      <div className="sandbox-shell">
        <div className="sandbox-header">
          <h1 className="sandbox-title">Sandbox</h1>
          <span className="sandbox-subtitle">{mode.blurb}</span>
        </div>

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

          {isJscad && (
            <div className="sandbox-modes" role="group" aria-label="Editing mode">
              <button
                type="button"
                aria-pressed={!build}
                className={!build ? 'sandbox-mode is-active' : 'sandbox-mode'}
                onClick={() => chooseBuild(false)}
              >
                Code
              </button>
              <button
                type="button"
                aria-pressed={build}
                className={build ? 'sandbox-mode is-active' : 'sandbox-mode'}
                onClick={() => chooseBuild(true)}
              >
                Build
              </button>
            </div>
          )}

          {isRunning ? (
            <button
              className="btn-run"
              style={{ background: '#ff5555', borderColor: '#ff5555' }}
              onClick={stopRun}
            >
              ■ Stop
            </button>
          ) : (
            <button className="btn-run" onClick={run}>▶ Run</button>
          )}
          <button
            style={{
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
            }}
            onClick={reset}
          >
            <RotateCcw size={12} />
            Reset
          </button>
          <span className="run-hint">Ctrl+Enter</span>
        </div>

        <div className="editor-preview-container sandbox-split" id="split">
          <div className="pane" id="editorPane">
            {isJscad && build ? (
              <ModelEditor doc={doc} onChange={applyDoc} />
            ) : (
              <CodeEditor />
            )}
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
            ) : isJscad ? (
              <div className="jscad-pane">
                <div className="jscad-pane-view">
                  <JscadPreview ref={frameRef} code={code} runKey={runKey} />
                </div>
                {runKey > 0 && (
                  <aside className="jscad-pane-params">
                    <JscadParamsPanel
                      defs={paramDefs}
                      values={paramValues}
                      onChange={setParams}
                      lastMs={rebuildMs}
                      stale={stale}
                    />
                  </aside>
                )}
              </div>
            ) : (
              <ShPlayPreview code={code} runKey={runKey} />
            )}
          </div>
          <div className="drag-overlay" id="dragOverlay" aria-hidden="true"></div>
        </div>

        {!isConsole && (
          <div className="sandbox-console-wrap">
            <div className="output-header">Console</div>
            <div className="sandbox-console-body">
              <Console resetKey={String(consoleResetKey)} />
            </div>
          </div>
        )}
      </div>
      <style>{`
        .sandbox-shell {
          display: flex;
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
        .sandbox-split.editor-preview-container {
          height: auto;
          flex: 1 1 auto;
          min-height: 280px;
        }
        .jscad-pane { display: flex; height: 100%; min-height: 0; }
        .jscad-pane-view { flex: 1 1 auto; min-width: 0; display: flex; }
        .jscad-pane-view .jscad-frame, .jscad-pane-view .jscad-empty { flex: 1; }
        .jscad-pane-params {
          flex: 0 0 208px;
          min-width: 0;
          border-left: 1px solid var(--border);
          background: var(--card);
          display: flex;
          flex-direction: column;
          overflow: hidden;
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
      `}</style>
    </>
  );
}
