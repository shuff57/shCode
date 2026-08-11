'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import type { Lesson } from '../lib/types';
import { useLessonStore } from '../lib/store';
import { buildPreviewHtml, buildJscadPreviewHtml } from '../lib/preview-builder';
import { saveProgress } from '../lib/version-control';
import { recordSubmission } from '../lib/written-grader-store';
import { recordLessonCompleted } from '../lib/progress';
import { navigateToNextLesson } from '../lib/lesson-neighbors';
import { grade } from '../lib/grader';
import type { GradeReport as GradeReportType } from '../lib/grader';
import FileExplorer from './FileExplorer';
import CodeEditor from './CodeEditor';
import LivePreview from './LivePreview';
import JscadPreview from './JscadPreview';
import ShPlayPreview from './ShPlayPreview';
import RequirementsSection from './RequirementsSection';
import Console from './Console';
import CommitDialog from './CommitDialog';
import HistoryPanel from './HistoryPanel';
import AssignmentHeader from './AssignmentHeader';
import SubmitDialog from './SubmitDialog';
import GradeReportView from './GradeReport';
import TeacherPushBanner from './TeacherPushBanner';
import CrossDeviceSyncBanner from './CrossDeviceSyncBanner';
import ShPlayDocsContent from './ShPlayDocsContent';
import AiHelpPanel from './AiHelpPanel';
import TabbedRightDrawer, { type DrawerTab } from './TabbedRightDrawer';
import SolutionPanel from './SolutionPanel';
import KeyboardShortcutModal from './KeyboardShortcutModal';
import { RotateCcw, Send } from 'lucide-react';

interface LessonWorkspaceProps {
  lesson: Lesson;
  mode?: 'lesson' | 'assignment';
}

export default function LessonWorkspace({
  lesson,
  mode,
}: LessonWorkspaceProps) {
  const setLesson = useLessonStore((s) => s.setLesson);
  const resetLesson = useLessonStore((s) => s.resetLesson);
  const files = useLessonStore((s) => s.fileContents);
  const currentFile = useLessonStore((s) => s.currentFile);
  const updateFile = useLessonStore((s) => s.updateFile);
  const requirements = useLessonStore((s) => s.requirements);
  const setRequirements = useLessonStore((s) => s.setRequirements);
  const commits = useLessonStore((s) => s.commits);
  const commitChanges = useLessonStore((s) => s.commitChanges);
  const getDirtyCount = useLessonStore((s) => s.getDirtyCount);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = () => {
    if (!currentFile) return;
    const blob = new Blob([files[currentFile] ?? ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.split('/').pop() || 'file.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentFile) return;
    const text = await file.text();
    updateFile(currentFile, text);
  };

  const [srcDoc, setSrcDoc] = useState('');
  const [runKey, setRunKey] = useState(0);
  const [q5Code, setQ5Code] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [consoleOutput, setConsoleOutput] = useState<Array<{type: string; message: string; timestamp: string}>>([]);
  // Bumped on every Run/Stop (and on HTML auto-rebuild) so the Console
  // component can clear scrollback. Also drives the auto-open behavior of
  // the collapsible Console panel.
  const [consoleResetKey, setConsoleResetKey] = useState(0);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [commitOpen, setCommitOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [gradeReport, setGradeReport] = useState<GradeReportType | null>(null);
  // Set true when an admin/teacher inserts the reference solution; pauses
  // localStorage autosave so their progress record stays clean. Cleared by
  // the Reset button (which also restores the starter).
  const [solutionLoaded, setSolutionLoaded] = useState(false);
  // Last runtime error from the most recent run (uncaught exception in console
  // mode, or a `preview-error` postMessage from the q5/jscad iframe). Blocks
  // Submit even when every requirement is green — otherwise students could
  // submit code that satisfies static graders but crashes at runtime.
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [shortcutModalOpen, setShortcutModalOpen] = useState(false);

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
  const isQ5Mode = lesson.preview === 'shplay';

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
      setConsoleResetKey((k) => k + 1);
      setRuntimeError(null);
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
    setRuntimeError(null);
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
      const name = e instanceof Error ? e.name : 'Error';
      const msg = e instanceof Error ? e.message : String(e);
      logs.push({ type: 'error', message: msg, timestamp: time() });
      setRuntimeError(`${name}: ${msg}`);
    }

    console.log = origLog;
    console.warn = origWarn;
    console.error = origError;

    setConsoleOutput(logs);
    setRunKey((k) => k + 1);
    setConsoleResetKey((k) => k + 1);
    setConsoleOpen(true);
    setTimeout(() => runTests(), 200);
  }

  // For JSCAD lessons: build 3D preview and render in iframe
  function runJscad() {
    setRuntimeError(null);
    const scriptContent = files['script.js'] || '';
    const doc = buildJscadPreviewHtml(scriptContent);
    setSrcDoc(doc);
    setRunKey((k) => k + 1);
    setConsoleResetKey((k) => k + 1);
    setConsoleOpen(true);
    setIsRunning(true);
    setTimeout(() => runTests(), 600);
  }

  // For shPlay lessons: snapshot the current code and bump runKey to reload the iframe.
  // We snapshot so edits after Run don't re-trigger the iframe until the next Run.
  function runQ5() {
    setRuntimeError(null);
    setQ5Code(files['script.js'] || '');
    setRunKey((k) => k + 1);
    setConsoleResetKey((k) => k + 1);
    setConsoleOpen(true);
    setIsRunning(true);
    setTimeout(() => runTests(), 400);
  }

  // Stop unloads the iframe back to its empty state without touching the editor.
  function stopRun() {
    setQ5Code('');
    setSrcDoc('');
    setRunKey(0);
    setConsoleResetKey((k) => k + 1);
    setIsRunning(false);
    setRuntimeError(null);
  }

  // Listen for uncaught errors from the q5/jscad iframe runner. The runner
  // posts `preview-error` for window.onerror + unhandledrejection events;
  // those are the only signals that mean "code crashed", as opposed to
  // student calls to console.error.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.source === 'preview-error' && data.error) {
        const err = data.error as { name?: string; message?: string };
        setRuntimeError(`${err.name || 'Error'}: ${err.message || ''}`);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Auto-save to localStorage (debounced). Skipped while the reference
  // solution is loaded so an admin/teacher reviewing it can't accidentally
  // overwrite their own draft.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (solutionLoaded) return;
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
  }, [files, commits, solutionLoaded]);

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
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          setShortcutModalOpen(true);
        }
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

  const handleCommit = async (message: string) => {
    try {
      await commitChanges(message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('401')) {
        alert('Please sign in to save your work. Reload the page to sign in, then try again.');
      } else {
        alert(`Commit failed: ${msg}`);
      }
    }
  };

  const handleSubmit = () => {
    const report = runClientGrade();
    setGradeReport(report);
    setSubmitOpen(true);
  };

  const confirmSubmit = async () => {
    setSubmitOpen(false);
    if (typeof window === 'undefined' || !lesson) return;
    try {
      await commitChanges('submitted');
    } catch (err) {
      console.warn('Auto-commit on submit failed:', err);
    }
    const state = useLessonStore.getState();
    saveProgress(lesson.id, {
      fileContents: state.fileContents,
      commits: state.commits,
      lastCommittedFileContents: state.lastCommittedFileContents,
      completedSteps: [],
    });
    if (gradeReport) {
      const ok = await recordSubmission({
        lessonId: lesson.id,
        response: state.fileContents['script.js'] || '',
        gradeJson: gradeReport,
        score: gradeReport.totalScore,
        possible: gradeReport.totalPossible,
      });
      if (!ok) {
        alert('Submission could not be recorded on the server. Please reload and try again.');
        return;
      }
      await recordLessonCompleted(lesson.id, gradeReport.totalScore);
    }
    setSubmitted(true);
    navigateToNextLesson(lesson.id);
  };

  const dirtyCount = getDirtyCount();
  const totalScore = gradeReport?.totalScore || 0;
  const totalPossible = gradeReport?.totalPossible || 0;
  const passedCriteria = requirements.filter((r) => r.status === 'passed').length;
  const totalCriteria = requirements.length;
  const allRequirementsPassed = totalCriteria > 0 && passedCriteria === totalCriteria;
  // q5 lessons and mastery-based lessons (zero-points convention: totalPossible
  // === 0) gate Submit on every requirement being green. Legacy point-based
  // assignments (nonzero totalPoints, e.g. sdlc-overview) keep the
  // score-vs-passingScore rule so their existing partial-credit thresholds
  // still work. Without the isNoPoints branch, a zero-points non-q5 lesson
  // (e.g. any console lab) always satisfies totalScore >= passingScore as
  // 0 >= 0, letting Submit through with nothing green. Either way, an
  // uncaught runtime error from the most recent run blocks Submit so
  // students can't ship code that satisfies static graders but crashes.
  const isNoPoints = totalPossible === 0;
  const canSubmit =
    !runtimeError &&
    (isQ5Mode || isNoPoints
      ? allRequirementsPassed
      : totalScore >= (lesson.grading?.passingScore ?? 0));
  const showAssignmentHeader = isAssignment || isQ5Mode;
  // q5 grading is binary/completion-based — show criteria counts, not points.
  const headerScore = isQ5Mode ? passedCriteria : totalScore;
  const headerTotal = isQ5Mode ? totalCriteria : totalPossible;
  const headerUnitLabel = isQ5Mode ? '' : 'pts';

  return (
    <>
      <CrossDeviceSyncBanner />
      <TeacherPushBanner />
      <TabbedRightDrawer
        storageKey="shCode:drawer"
        tabs={[
          {
            key: 'help',
            label: 'Help',
            color: '#ffb86c',
            content: <AiHelpPanel lesson={lesson} />,
          },
          ...(isQ5Mode
            ? ([
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
              ] as DrawerTab[])
            : []),
          {
            key: 'quest',
            label: 'Quest',
            color: '#50fa7b',
            content:
              requirements.length === 0 ? (
                <p style={{ color: '#6272a4' }}>No graded items for this lesson.</p>
              ) : (
                <RequirementsSection requirements={requirements} />
              ),
          },
          {
            key: 'file',
            label: 'File',
            color: '#8be9fd',
            content: (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!currentFile}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={handleDownload}
                    disabled={!currentFile}
                  >
                    Download
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".js,.ts,.html,.css,.json,.txt,.md"
                    onChange={handleUpload}
                    style={{ display: 'none' }}
                  />
                </div>
                <FileExplorer tree={lesson.files} />
              </>
            ),
          },
        ]}
      />
      {showAssignmentHeader ? (
        <AssignmentHeader
          lesson={lesson}
          score={headerScore}
          totalPossible={headerTotal}
          onSubmit={handleSubmit}
          submitted={submitted}
          canSubmit={canSubmit}
          unitLabel={headerUnitLabel}
          showStatus={!isQ5Mode}
          showSubmit={!isQ5Mode}
          scoreAlign={isQ5Mode ? 'right' : 'center'}
        />
      ) : (
        <div id="titleRow">
          <h1>{lesson.title}</h1>
        </div>
      )}
      <div className="editor-card">
        <div className="editor-body">
          <div className="run-toolbar">
            {(isConsoleMode || isJscadMode || isQ5Mode) && (
              <>
                {isRunning && (isJscadMode || isQ5Mode) ? (
                  <button
                    className="btn-run"
                    style={{ background: '#ff5555', borderColor: '#ff5555' }}
                    onClick={stopRun}
                  >
                    ■ Stop
                  </button>
                ) : (
                  <button
                    className="btn-run"
                    onClick={isJscadMode ? runJscad : isQ5Mode ? runQ5 : runCode}
                  >
                    ▶ Run
                  </button>
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
                  onClick={() => {
                    if (window.confirm('Reset your code to the starter? Unsaved work will be lost.')) {
                      resetLesson(lesson);
                      stopRun();
                      setSolutionLoaded(false);
                      setResetMsg('Code reset to starter.');
                      setTimeout(() => setResetMsg(null), 2500);
                    }
                  }}
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
                <span className="run-hint">Ctrl+Enter</span>
                {resetMsg && (
                  <span
                    role="status"
                    aria-live="polite"
                    style={{
                      color: '#50fa7b',
                      fontSize: 13,
                      marginLeft: 8,
                      fontWeight: 500,
                    }}
                  >
                    ✓ {resetMsg}
                  </span>
                )}
                {solutionLoaded && (
                  <span
                    role="status"
                    aria-live="polite"
                    style={{
                      color: '#ffb86c',
                      fontSize: 13,
                      marginLeft: 8,
                      fontWeight: 500,
                    }}
                    title="Reset to clear and restore the starter."
                  >
                    👁 Viewing solution — autosave paused
                  </span>
                )}
              </>
            )}
            {runtimeError && (
              <span
                role="status"
                aria-live="polite"
                title={runtimeError}
                style={{
                  color: '#ff5555',
                  fontSize: 13,
                  marginLeft: 8,
                  fontWeight: 500,
                  maxWidth: 360,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {allRequirementsPassed
                  ? '✗ Run your code again — the last run had an error'
                  : '✗ Fix runtime error before submitting'}
              </span>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <SolutionPanel
                lessonId={lesson.id}
                onInsert={(code) => {
                  updateFile('script.js', code);
                  setSolutionLoaded(true);
                }}
              />
              <button className="btn-secondary btn-sm" onClick={() => setCommitOpen(true)}>
                Commit{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
              </button>
              <button className="btn-secondary btn-sm" onClick={() => setHistoryOpen(true)}>
                History
              </button>
              {isQ5Mode && (
                <button
                  className="btn-primary btn-sm"
                  onClick={handleSubmit}
                  disabled={submitted || !canSubmit}
                >
                  <Send size={14} />
                  Submit
                </button>
              )}
            </div>
          </div>
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
                <ShPlayPreview code={q5Code} runKey={runKey} />
              ) : (
                <LivePreview srcDoc={srcDoc} />
              )}
            </div>
            <div className="drag-overlay" id="dragOverlay" aria-hidden="true"></div>
          </div>
          {!isConsoleMode && (
            <details
              className="console"
              open={consoleOpen}
              onToggle={(e) => setConsoleOpen((e.currentTarget as HTMLDetailsElement).open)}
            >
              <summary>Console</summary>
              <div className="console-body">
                <Console resetKey={String(consoleResetKey)} />
              </div>
            </details>
          )}
        </div>
      </div>
      {submitted && gradeReport && (
        <GradeReportView
          report={gradeReport}
          commitCount={commits.length}
          onReopen={() => setSubmitted(false)}
          allowReopen={lesson.grading?.allowLateSubmit}
        />
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
      <KeyboardShortcutModal
        isOpen={shortcutModalOpen}
        onClose={() => setShortcutModalOpen(false)}
      />
    </>
  );
}
