'use client';
import { useEffect, useState, useCallback } from 'react';
import type { Lesson } from '../lib/types';
import { useLessonStore } from '../lib/store';
import { buildPreviewHtml, buildJscadPreviewHtml } from '../lib/preview-builder';
import { saveProgress } from '../lib/version-control';
import { grade } from '../lib/grader';
import type { GradeReport as GradeReportType } from '../lib/grader';
import FileExplorer from './FileExplorer';
import LessonSteps from './LessonSteps';
import CodeEditor from './CodeEditor';
import LivePreview from './LivePreview';
import JscadPreview from './JscadPreview';
import Q5PlayPreview from './Q5PlayPreview';
import RequirementsSection from './RequirementsSection';
import Console from './Console';
import CommitDialog from './CommitDialog';
import HistoryPanel from './HistoryPanel';
import AssignmentHeader from './AssignmentHeader';
import SubmitDialog from './SubmitDialog';
import GradeReportView from './GradeReport';

interface Neighbor {
  id: string;
  title: string;
}

interface LessonWorkspaceProps {
  lesson: Lesson;
  mode?: 'lesson' | 'assignment';
  prev?: Neighbor | null;
  next?: Neighbor | null;
  basePath?: string;
}

export default function LessonWorkspace({
  lesson,
  mode,
  prev = null,
  next = null,
  basePath = '/lesson',
}: LessonWorkspaceProps) {
  const setLesson = useLessonStore((s) => s.setLesson);
  const files = useLessonStore((s) => s.fileContents);
  const ui = useLessonStore((s) => s.ui);
  const setSidebarOpen = useLessonStore((s) => s.setSidebarOpen);
  const setActiveTab = useLessonStore((s) => s.setActiveTab);
  const requirements = useLessonStore((s) => s.requirements);
  const setRequirements = useLessonStore((s) => s.setRequirements);
  const commits = useLessonStore((s) => s.commits);
  const commitChanges = useLessonStore((s) => s.commitChanges);
  const getDirtyCount = useLessonStore((s) => s.getDirtyCount);

  const [srcDoc, setSrcDoc] = useState('');
  const [runKey, setRunKey] = useState(0);
  const [consoleOutput, setConsoleOutput] = useState<Array<{type: string; message: string; timestamp: string}>>([]);
  const [commitOpen, setCommitOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gradeReport, setGradeReport] = useState<GradeReportType | null>(null);

  const isAssignment = mode === 'assignment' || lesson.type === 'assignment' || lesson.type === 'project';

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

  const isConsoleMode = lesson.preview === 'console';
  const isJscadMode = lesson.preview === 'jscad';
  const isQ5Mode = lesson.preview === 'q5play';

  // For JSCAD lessons: auto-run on first load
  useEffect(() => {
    if (!isJscadMode) return;
    const scriptContent = files['script.js'] || '';
    if (!scriptContent.trim()) return;
    const to = setTimeout(() => {
      const doc = buildJscadPreviewHtml(scriptContent);
      setSrcDoc(doc);
      setTimeout(() => runTests(), 600);
    }, 300);
    return () => clearTimeout(to);
  }, [isJscadMode]); // only on mount, not on every keystroke

  // For HTML lessons: auto-build preview on every change (debounced)
  useEffect(() => {
    if (isConsoleMode || isJscadMode || isQ5Mode) return;
    const to = setTimeout(() => {
      const doc = buildPreviewHtml(lesson.files, files);
      setSrcDoc(doc);
      const to2 = setTimeout(() => {
        runTests();
      }, 600);
      return () => clearTimeout(to2);
    }, 600);
    return () => clearTimeout(to);
  }, [files, isConsoleMode, isJscadMode]);

  // For console lessons: run JS directly and capture output.
  // This is intentional — students write code in the editor and we execute it,
  // similar to CodeHS, Replit, or any browser-based coding education tool.
  function runCode() {
    const logs: Array<{type: string; message: string; timestamp: string}> = [];
    const time = () => new Date().toLocaleTimeString();

    const scriptContent = files['script.js'] || '';

    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    const capture = (type: string) => (...args: unknown[]) => {
      const text = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      logs.push({ type, message: text, timestamp: time() });
    };

    console.log = capture('log');
    console.warn = capture('warn');
    console.error = capture('error');

    try {
      const run = new Function(scriptContent); // student code execution (educational tool)
      run();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logs.push({ type: 'error', message: msg, timestamp: time() });
    }

    console.log = origLog;
    console.warn = origWarn;
    console.error = origError;

    setConsoleOutput(logs);
    setRunKey((k) => k + 1);
    setTimeout(() => runTests(), 200);
  }

  // For JSCAD lessons: build 3D preview and render in iframe
  function runJscad() {
    const scriptContent = files['script.js'] || '';
    const doc = buildJscadPreviewHtml(scriptContent);
    setSrcDoc(doc);
    setRunKey((k) => k + 1);
    setTimeout(() => runTests(), 600);
  }

  // For q5play lessons: bump runKey to reload the runner iframe with latest code
  function runQ5() {
    setRunKey((k) => k + 1);
    setTimeout(() => runTests(), 400);
  }

  // Auto-save to localStorage (debounced)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      const state = useLessonStore.getState();
      if (state.lesson) {
        saveProgress(state.lesson.id, {
          fileContents: state.fileContents,
          commits: state.commits,
          lastCommittedFileContents: state.lastCommittedFileContents,
          completedSteps: [],
        });
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [files, commits]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (isConsoleMode) {
          runCode();
        } else if (isJscadMode) {
          runJscad();
        } else if (isQ5Mode) {
          runQ5();
        } else {
          setCommitOpen(true);
        }
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        setHistoryOpen((prev) => !prev);
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        runTests();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function runTests() {
    const report = grade(
      lesson.requirements,
      files,
      lesson.grading?.passingScore || 0
    );
    setRequirements(
      lesson.requirements.map((r) => ({
        ...r,
        ...report.results.find((d) => d.id === r.id),
      }))
    );
    setGradeReport(report);
  }

  const runClientGrade = useCallback(() => {
    const report = grade(
      lesson.requirements,
      files,
      lesson.grading?.passingScore || 0
    );
    setGradeReport(report);
    return report;
  }, [lesson, files]);

  const handleCommit = (message: string) => {
    commitChanges(message);
  };

  const handleSubmit = () => {
    const report = runClientGrade();
    setGradeReport(report);
    setSubmitOpen(true);
  };

  const confirmSubmit = () => {
    setSubmitted(true);
    setSubmitOpen(false);
    if (typeof window !== 'undefined' && lesson) {
      const state = useLessonStore.getState();
      saveProgress(lesson.id, {
        fileContents: state.fileContents,
        commits: state.commits,
        lastCommittedFileContents: state.lastCommittedFileContents,
        completedSteps: [],
      });
    }
  };

  const summary = {
    passed: requirements.filter((r) => r.status === 'passed').length,
    total: requirements.length,
  };

  const dirtyCount = getDirtyCount();
  const totalScore = gradeReport?.totalScore || 0;
  const totalPossible = gradeReport?.totalPossible || 0;

  return (
    <>
      {isAssignment ? (
        <AssignmentHeader
          lesson={lesson}
          dirtyCount={dirtyCount}
          score={totalScore}
          totalPossible={totalPossible}
          onOpenCommit={() => setCommitOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
          onSubmit={handleSubmit}
          submitted={submitted}
        />
      ) : (
        <div id="titleRow">
          <h1>{lesson.title}</h1>
          <div className="title-actions">
            <button className="btn-secondary btn-sm" onClick={() => setCommitOpen(true)}>
              Commit{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
            </button>
            <button className="btn-secondary btn-sm" onClick={() => setHistoryOpen(true)}>
              History
            </button>
          </div>
        </div>
      )}
      <div
        id="sidebarHover"
        aria-hidden="true"
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={(e) => {
          const sidebar = document.getElementById('sidebar');
          const to = e.relatedTarget;
          if (!sidebar || !(to instanceof Node) || !sidebar.contains(to)) {
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
        {ui.activeSidebarTab === 'Files' && (
          <div className="sidebar-actions">
            <button type="button">Add file</button>
            <button type="button">Upload file(s)</button>
          </div>
        )}
      </aside>
      <details className="editor-card" open>
        <summary>{isConsoleMode ? 'Code Editor' : isJscadMode ? 'Code Editor & 3D Viewer' : isQ5Mode ? 'Code Editor & q5play Preview' : 'Starter Code & Live Preview'}</summary>
        <div className="editor-body">
          {(isConsoleMode || isJscadMode || isQ5Mode) && (
            <div className="run-toolbar">
              <button className="btn-run" onClick={isJscadMode ? runJscad : isQ5Mode ? runQ5 : runCode}>
                ▶ Run
              </button>
              <span className="run-hint">Ctrl+Enter</span>
            </div>
          )}
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
              {isConsoleMode ? (
                <>
                  <div className="output-header">Output</div>
                  <pre className="console-output run-output">
                    {consoleOutput.length === 0 ? (
                      <div className="console-empty">Click Run to see output.</div>
                    ) : (
                      consoleOutput.map((log, i) => (
                        <div key={i} className={`log-entry log-${log.type}`}>
                          <span className="log-msg">{log.message}</span>
                        </div>
                      ))
                    )}
                  </pre>
                </>
              ) : isJscadMode ? (
                <JscadPreview srcDoc={srcDoc} />
              ) : isQ5Mode ? (
                <Q5PlayPreview code={files['script.js'] || ''} runKey={runKey} />
              ) : (
                <LivePreview srcDoc={srcDoc} />
              )}
            </div>
            <div className="drag-overlay" id="dragOverlay" aria-hidden="true"></div>
          </div>
          {!isConsoleMode && (
            <details className="console">
              <summary>Console</summary>
              <div className="console-body">
                <Console resetKey={isJscadMode ? String(runKey) : srcDoc} />
              </div>
            </details>
          )}
        </div>
      </details>
      <RequirementsSection
        requirements={requirements}
        summary={summary}
        onRerun={runTests}
      />

      {submitted && gradeReport && (
        <GradeReportView
          report={gradeReport}
          commitCount={commits.length}
          onReopen={() => setSubmitted(false)}
          allowReopen={lesson.grading?.allowLateSubmit}
        />
      )}

      {(prev || next) && (
        <nav className="lesson-nav">
          {prev ? (
            <a className="lesson-nav-link" href={`${basePath}/${prev.id}`}>
              <span className="lesson-nav-arrow">←</span>
              <span className="lesson-nav-label">
                <span className="lesson-nav-kicker">Previous</span>
                <span className="lesson-nav-title">{prev.title}</span>
              </span>
            </a>
          ) : (
            <span />
          )}
          {next ? (
            <a className="lesson-nav-link lesson-nav-link-right" href={`${basePath}/${next.id}`}>
              <span className="lesson-nav-label">
                <span className="lesson-nav-kicker">Next</span>
                <span className="lesson-nav-title">{next.title}</span>
              </span>
              <span className="lesson-nav-arrow">→</span>
            </a>
          ) : (
            <span />
          )}
        </nav>
      )}

      <CommitDialog
        isOpen={commitOpen}
        onClose={() => setCommitOpen(false)}
        onCommit={handleCommit}
        dirtyCount={dirtyCount}
      />
      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
      <SubmitDialog
        isOpen={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onConfirm={confirmSubmit}
        report={gradeReport}
      />
    </>
  );
}
