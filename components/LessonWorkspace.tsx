'use client';
import { useEffect, useState } from 'react';
import { Lesson } from '../lib/lessons';
import { useLessonStore } from '../lib/store';
import FileExplorer from './FileExplorer';
import LessonSteps from './LessonSteps';
import CodeEditor from './CodeEditor';
import LivePreview from './LivePreview';
import RequirementsSection from './RequirementsSection';

export default function LessonWorkspace({ lesson }: { lesson: Lesson }) {
  const setLesson = useLessonStore((s) => s.setLesson);
  const files = useLessonStore((s) => s.fileContents);
  const ui = useLessonStore((s) => s.ui);
  const setSidebarOpen = useLessonStore((s) => s.setSidebarOpen);
  const setActiveTab = useLessonStore((s) => s.setActiveTab);
  const requirements = useLessonStore((s) => s.requirements);
  const setRequirements = useLessonStore((s) => s.setRequirements);
  const [srcDoc, setSrcDoc] = useState('');

  // enable pane resizing for editor and preview
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
    const onVisChange = () => {
      if (document.hidden) stopDrag();
    };

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      rect = split.getBoundingClientRect();
      overlay.style.display = 'block';
      document.body.style.userSelect = 'none';
      document.body.classList.add('is-resizing');
      try {
        divider.setPointerCapture(e.pointerId);
      } catch {}
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

  useEffect(() => {
    setLesson(lesson);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson]);

  // build preview and trigger tests with debounce
  useEffect(() => {
    const to = setTimeout(() => {
      const html = files['index.html'] || '';
      const css = files['style.css'] || '';
      const js = files['script.js'] || '';
      const doc = `${html}\n<style>${css}</style>\n<script>${js}</script>`;
      setSrcDoc(doc);
      const to2 = setTimeout(() => {
        runTests();
      }, 600);
      return () => clearTimeout(to2);
    }, 600);
    return () => clearTimeout(to);
  }, [files]);

  async function runTests() {
    const res = await fetch('/api/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, files }),
    });
    const data = await res.json();
    setRequirements(
      lesson.requirements.map((r) => ({ ...r, ...data.find((d: any) => d.id === r.id) }))
    );
  }

  const summary = {
    passed: requirements.filter((r) => r.status === 'passed').length,
    total: requirements.length,
  };

  return (
    <>
      <div id="titleRow">
        <h1>{lesson.title}</h1>
      </div>
      <div
        id="sidebarHover"
        aria-hidden="true"
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={(e) => {
          const sidebar = document.getElementById('sidebar');
          if (!(e.relatedTarget instanceof Node) || !sidebar?.contains(e.relatedTarget)) {
            setSidebarOpen(false);
          }
        }}
      ></div>
      <aside
        id="sidebar"
        className={ui.sidebarOpen ? 'open' : ''}
        aria-label="File explorer"
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
      >
        <div className="sidebar-tabs">
          <button
            style={ui.activeSidebarTab === 'Files' ? { fontWeight: 'bold' } : {}}
            onClick={() => setActiveTab('Files')}
          >
            Files
          </button>
          <button
            style={ui.activeSidebarTab === 'Steps' ? { fontWeight: 'bold' } : {}}
            onClick={() => setActiveTab('Steps')}
          >
            Steps
          </button>
        </div>
        <div className="sidebar-content">
          {ui.activeSidebarTab === 'Files' ? (
            <FileExplorer tree={lesson.files} />
          ) : (
            <LessonSteps lesson={lesson} />
          )}
        </div>
      </aside>
      <details className="editor-card" open>
        <summary>Starter Code & Live Preview</summary>
        <div className="editor-body">
          <div className="editor-preview-container" id="split">
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
              <LivePreview srcDoc={srcDoc} />
            </div>
            <div className="drag-overlay" id="dragOverlay" aria-hidden="true"></div>
          </div>
        </div>
      </details>
      <RequirementsSection
        requirements={requirements}
        summary={summary}
        onRerun={runTests}
      />
    </>
  );
}
