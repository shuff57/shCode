'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useLessonStore } from '../lib/store';
import type { Lesson } from '../lib/types';
import CodeEditor from './CodeEditor';
import ShPlayPreview from './ShPlayPreview';
import Console from './Console';
import TabbedRightDrawer, { type DrawerTab } from './TabbedRightDrawer';
import AiHelpPanel from './AiHelpPanel';
import ShPlayDocsContent from './ShPlayDocsContent';

const STARTER_CODE = `// shPlay sandbox — try it out!

function setup() {
  new Canvas(400, 400);
}

function draw() {
  background(40, 42, 54);
  fill(80, 250, 123);
  noStroke();
  circle(mouseX, mouseY, 40);
}
`;

const SANDBOX_LESSON: Lesson = {
  id: 'sandbox',
  title: 'Sandbox',
  description: 'A blank shPlay canvas.',
  difficulty: 'beginner',
  estimateMins: 0,
  unit: 'Sandbox',
  preview: 'shplay',
  files: [
    {
      type: 'file',
      id: 'sandbox-script',
      name: 'script.js',
      path: 'script.js',
      content: STARTER_CODE,
    },
  ],
  steps: [],
  requirements: [],
};

export default function SandboxWorkspace() {
  const setLesson = useLessonStore((s) => s.setLesson);
  const fileContents = useLessonStore((s) => s.fileContents);

  const [q5Code, setQ5Code] = useState('');
  const [runKey, setRunKey] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleResetKey, setConsoleResetKey] = useState(0);

  useEffect(() => {
    setLesson(SANDBOX_LESSON);
  }, [setLesson]);

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

  function runQ5() {
    setQ5Code(fileContents['script.js'] || '');
    setRunKey((k) => k + 1);
    setConsoleResetKey((k) => k + 1);
    setIsRunning(true);
  }

  function stopRun() {
    setQ5Code('');
    setRunKey(0);
    setConsoleResetKey((k) => k + 1);
    setIsRunning(false);
  }

  function reset() {
    if (window.confirm('Reset code to the starter? Unsaved work will be lost.')) {
      setLesson(SANDBOX_LESSON);
      stopRun();
    }
  }

  // Ctrl+Enter to run
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        runQ5();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileContents]);

  const drawerTabs: DrawerTab[] = [
    {
      key: 'help',
      label: 'Help',
      color: '#ffb86c',
      content: <AiHelpPanel lesson={SANDBOX_LESSON} />,
    },
    {
      key: 'docs',
      label: 'Docs',
      color: '#bd93f9',
      content: <ShPlayDocsContent />,
      headerExtra: (
        <a
          href="/docs/shplay"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary btn-sm"
        >
          Docs ↗
        </a>
      ),
    },
  ];

  return (
    <>
      <TabbedRightDrawer storageKey="shCode:sandbox-drawer" tabs={drawerTabs} />
      <div className="sandbox-shell">
        <div className="sandbox-header">
          <h1 className="sandbox-title">Sandbox</h1>
          <span className="sandbox-subtitle">A blank shPlay canvas to try out ideas.</span>
        </div>
        <div className="run-toolbar sandbox-toolbar">
          {isRunning ? (
            <button
              className="btn-run"
              style={{ background: '#ff5555', borderColor: '#ff5555' }}
              onClick={stopRun}
            >
              ■ Stop
            </button>
          ) : (
            <button className="btn-run" onClick={runQ5}>▶ Run</button>
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
            <ShPlayPreview code={q5Code} runKey={runKey} />
          </div>
          <div className="drag-overlay" id="dragOverlay" aria-hidden="true"></div>
        </div>
        <div className="sandbox-console-wrap">
          <div className="output-header">Console</div>
          <div className="sandbox-console-body">
            <Console resetKey={String(consoleResetKey)} />
          </div>
        </div>
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
      `}</style>
    </>
  );
}
