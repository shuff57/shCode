'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import dynamic from 'next/dynamic';
import type { Lesson } from '../lib/types';
import { useLessonStore, flattenFiles } from '../lib/store';
import { buildPreviewHtml } from '../lib/preview-builder';
import { saveProgress, normalizeEol } from '../lib/version-control';
import { seedPlan } from '../lib/plan-seed';
import { recordSubmission } from '../lib/written-grader-store';
import { recordLessonCompleted } from '../lib/progress';
import { navigateToNextLesson } from '../lib/lesson-neighbors';
import { grade } from '../lib/grader';
import type { GradeReport as GradeReportType, GradeContext } from '../lib/grader';
import { NO_TEACHER_MODES, resolveMode, type TeacherModes } from '../lib/lesson-mode';
import type { ModelDoc } from '../lib/model-types';

import { RUNNER_SOURCE, RUN_MAX_LOGS, RUN_TIMEOUT_MS } from '../lib/js-runner-source';
import FileExplorer from './FileExplorer';
import CodeEditor from './CodeEditor';
import LivePreview from './LivePreview';
import MoshionPreview from './MoshionPreview';
import RequirementsSection from './RequirementsSection';
import PlanChartPanel from './PlanChartPanel';
import LessonSteps from './LessonSteps';
import Console from './Console';
import CommitDialog from './CommitDialog';
import HistoryPanel from './HistoryPanel';
import AssignmentHeader from './AssignmentHeader';
import SubmitDialog from './SubmitDialog';
import GradeReportView from './GradeReport';
import TeacherPushBanner from './TeacherPushBanner';
import CrossDeviceSyncBanner from './CrossDeviceSyncBanner';
import DocsDrawer from './DocsDrawer';
import TextureEditor from './TextureEditor';
import AiHelpPanel from './AiHelpPanel';
import TabbedRightDrawer, { type DrawerTab } from './TabbedRightDrawer';
import SolutionPanel from './SolutionPanel';
import KeyboardShortcutModal from './KeyboardShortcutModal';
import { RotateCcw, Send } from 'lucide-react';

// The B-rep kernel + three.js viewport are heavy; the ~270-odd non-reshape
// lesson pages should never pay for them. Same pattern DiagramAssignmentView
// uses for DiagramEditor.
const ReshapeStudio = dynamic(() => import('./reshape/ReshapeStudio'), { ssr: false });

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
  // Live console-lesson runner, so a re-run or an unmount can terminate it.
  const workerRef = useRef<Worker | null>(null);
  useEffect(() => () => { workerRef.current?.terminate(); }, []);

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
  // reSHape's own latest built ModelDoc, for a 'model' requirement (see
  // lib/grader.ts's TODO(A2) call site below) -- ReshapeStudio reports it
  // through onDocChange, null until its first successful build.
  const [latestModelDoc, setLatestModelDoc] = useState<ModelDoc | null>(null);
  // Bumped on Reset to force ReshapeStudio to remount: it only hydrates its
  // model from script.js once, at mount (see its own file header), so
  // restoring the starter text while it stays mounted would leave the OLD
  // model on screen next to the NEW starter.
  const [reshapeResetKey, setReshapeResetKey] = useState(0);
  // Which side(s) of reSHape this lesson gets -- the teacher's class-wide
  // gate, a per-assignment override, or the lesson's own declared `mode`,
  // resolved the same way SandboxWorkspace resolves its own gate. Defaults
  // to 'both' (unreadable gate => never lock anyone out).
  const [teacherModes, setTeacherModes] = useState<TeacherModes>(NO_TEACHER_MODES);
  useEffect(() => {
    let live = true;
    fetch('/api/my-lesson-modes')
      .then((r) => (r.ok ? r.json() : NO_TEACHER_MODES))
      .then((m) => { if (live) setTeacherModes(m ?? NO_TEACHER_MODES); })
      .catch(() => { /* no gate readable, so no gate applied */ });
    return () => { live = false; };
  }, []);
  const reshapeMode = resolveMode(lesson.id, teacherModes, lesson.mode ?? null).mode;
  const reshapeSides: ('build' | 'code')[] =
    reshapeMode === 'visual' ? ['build'] : reshapeMode === 'code' ? ['code'] : ['build', 'code'];
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

  // Part two of a split assignment: drop the student's own chart into the
  // starter as pseudocode comments.
  //
  // Two steps, deliberately. The panel's draft fetch resolves on its own
  // schedule and can land BEFORE the store has populated fileContents, so
  // seeding straight from the callback saw `undefined` and silently did
  // nothing. The lines are parked in state instead, and the effect below
  // applies them once the files are actually there.
  const [planLines, setPlanLines] = useState<string[] | null>(null);
  const [planStale, setPlanStale] = useState(false);
  const planSeeded = useRef(false);

  useEffect(() => {
    if (!planLines || planSeeded.current) return;
    const current = files['script.js'];
    if (current === undefined) return;      // store not ready yet; try next render
    planSeeded.current = true;              // decided once, either way
    if (planLines.length === 0) return;

    const marker = '// --- your chart from ' + (lesson.planFromLabel ?? lesson.planFrom) + ' ---';
    const block = [marker, ...planLines].join('\n');

    // Only while script.js is still byte-for-byte the starter. Seeding over a
    // student who has begun would destroy their work to hand them a scaffold
    // they no longer need, and this fires on load, when they are not watching
    // for it.
    const starter = flattenFiles(lesson.files).find((f) => f.path === 'script.js');
    if (!starter || current !== normalizeEol(starter.content || '')) {
      // Not seeding. If a PREVIOUS visit seeded, and the chart has since been
      // redrawn, the comments below the chart now describe an older plan than
      // the chart above them -- and the lesson's own last step tells the
      // student to read the two side by side. Their code is theirs to keep, so
      // say the plan is stale rather than rewriting it under them.
      if (current.includes(marker) && !current.includes(block)) setPlanStale(true);
      return;
    }

    // Under the lesson's STEP 1 comment block, which is where every planFrom
    // lesson asks for the pseudocode. See lib/plan-seed.ts for why this is a
    // block match and not the single sentence it used to be.
    updateFile('script.js', seedPlan(current, block));
  }, [planLines, files, lesson, updateFile]);
  const isReshapeMode = lesson.preview === 'reshape';
  const isMoshionMode = lesson.preview === 'moshion';

  // reSHape lessons: ReshapeStudio hydrates its own model from script.js on
  // mount and reports every built doc back through onDocChange. Grading has
  // to follow that doc, not a Run button (a Build-only lesson has none), so
  // every model change re-grades after a short settle. Without this the
  // requirement card stayed red under a correct box and Submit never
  // enabled -- found by the moderate lens on 8.1.2, 2026-09-04.
  useEffect(() => {
    if (!isReshapeMode) return;
    const to = setTimeout(() => runTests(), 250);
    return () => clearTimeout(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReshapeMode, latestModelDoc, files]);

  // For HTML lessons: auto-build preview on every change (debounced)
  useEffect(() => {
    if (isConsoleMode || isReshapeMode || isMoshionMode) return;
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
  }, [files, isConsoleMode, isReshapeMode]);

  // For console lessons: run JS in a Worker and capture output.
  // This is intentional — students write code in the editor and we execute it,
  // similar to CodeHS, Replit, or any browser-based coding education tool.
  //
  // It runs in a Worker rather than on the main thread for one reason: a
  // Worker can be terminated, and synchronous JS cannot be interrupted any
  // other way. Module 2.4 teaches infinite loops deliberately, so students
  // now write `while (true)` on purpose — on the main thread that locked the
  // tab and cost them everything they had typed.
  function runCode() {
    setRuntimeError(null);
    const scriptContent = files['script.js'] || '';
    const time = () => new Date().toLocaleTimeString();
    const logs: Array<{type: string; message: string; timestamp: string}> = [];

    const finish = () => {
      setConsoleOutput(logs);
      setRunKey((k) => k + 1);
      setConsoleResetKey((k) => k + 1);
      setConsoleOpen(true);
      setTimeout(() => runTests(), 200);
    };

    // A previous run may still be spinning; never leave two alive at once.
    workerRef.current?.terminate();
    workerRef.current = null;

    if (typeof Worker === 'undefined') {
      // No Worker (very old browser): fall back to the direct call. This is
      // the path that can hang, so it is the fallback and not the default.
      const orig = { log: console.log, warn: console.warn, error: console.error };
      const capture = (type: string) => (...args: unknown[]) => {
        logs.push({ type, message: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '), timestamp: time() });
      };
      console.log = capture('log'); console.warn = capture('warn'); console.error = capture('error');
      try {
        new Function(scriptContent)(); // student code execution (educational tool)
      } catch (e: unknown) {
        const name = e instanceof Error ? e.name : 'Error';
        const msg = e instanceof Error ? e.message : String(e);
        logs.push({ type: 'error', message: msg, timestamp: time() });
        setRuntimeError(`${name}: ${msg}`);
      }
      console.log = orig.log; console.warn = orig.warn; console.error = orig.error;
      finish();
      return;
    }

    const url = URL.createObjectURL(new Blob([RUNNER_SOURCE], { type: 'text/javascript' }));
    const worker = new Worker(url);
    workerRef.current = worker;

    const cleanup = () => {
      worker.terminate();
      URL.revokeObjectURL(url);
      if (workerRef.current === worker) workerRef.current = null;
    };

    const killer = setTimeout(() => {
      logs.push({
        type: 'error',
        message: `Your code was still running after ${RUN_TIMEOUT_MS / 1000} seconds, so it was stopped. That usually means a loop never reaches its stopping point — check that the value in the condition actually changes inside the loop.`,
        timestamp: time(),
      });
      setRuntimeError('Stopped: your code ran too long (likely an infinite loop)');
      cleanup();
      finish();
    }, RUN_TIMEOUT_MS);

    worker.onmessage = (e: MessageEvent) => {
      const d = e.data as { kind: string; type?: string; message?: string; name?: string };
      if (d.kind === 'log') {
        logs.push({ type: d.type || 'log', message: d.message || '', timestamp: time() });
        return;
      }
      if (d.kind === 'error') {
        logs.push({ type: 'error', message: d.message || '', timestamp: time() });
        setRuntimeError(`${d.name || 'Error'}: ${d.message || ''}`);
      }
      clearTimeout(killer);
      cleanup();
      finish();
    };

    worker.onerror = (e: ErrorEvent) => {
      clearTimeout(killer);
      logs.push({ type: 'error', message: e.message || 'Error', timestamp: time() });
      setRuntimeError(e.message || 'Error');
      cleanup();
      finish();
    };

    worker.postMessage(scriptContent);
  }

  // For moSHion lessons: snapshot the current code and bump runKey to reload the iframe.
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

  // The shortcut effect below registers once ([] deps), so it would call the
  // runTests closure from the first render forever -- grading a reSHape
  // lesson against the null doc it held at mount (moderate lens, 2026-09-04).
  const runTestsRef = useRef(runTests);
  useEffect(() => { runTestsRef.current = runTests; });

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (isConsoleMode) {
          runCode();
        } else if (isReshapeMode) {
          // ReshapeStudio owns its own Ctrl+Enter handling, scoped to its
          // Code side -- see that component's own keydown effect.
        } else if (isMoshionMode) {
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
        runTestsRef.current();
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        // CodeMirror is a contenteditable <div>, not a <textarea>: without these
        // two extra tests the guard passes and preventDefault() eats a question
        // mark the student was trying to type into their own code.
        const el = e.target as HTMLElement | null;
        const typing =
          !!el &&
          (el.tagName === 'INPUT' ||
            el.tagName === 'TEXTAREA' ||
            el.isContentEditable ||
            !!el.closest?.('.cm-editor'));
        if (!typing) {
          e.preventDefault();
          setShortcutModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // A 'model' requirement (lib/model-check.ts, via lib/grader.ts's checkModel)
  // grades reSHape's live ModelDoc, not script.js's text -- so no "flush the
  // pending Build -> script write first" is needed for it specifically: it
  // reads `latestModelDoc`, which ReshapeStudio keeps current independent of
  // the (debounced, <=300ms) script.js text sync.
  function runTests() {
    const context: GradeContext = { modelDoc: latestModelDoc };
    const report = grade(
      lesson.requirements,
      files,
      lesson.grading?.passingScore || 0,
      context
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
    const context: GradeContext = { modelDoc: latestModelDoc };
    const report = grade(
      lesson.requirements,
      files,
      lesson.grading?.passingScore || 0,
      context
    );
    setGradeReport(report);
    return report;
  }, [lesson, files, latestModelDoc]);

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
  // A part of a sat test (Grading.summative) drops BOTH gates. The
  // requirements gate, because a student who cannot fix Part 3's syntax
  // error would otherwise sit behind a locked Part 4 and Part 5 and lose the
  // marks they had. And the runtimeError gate for the same reason and more
  // sharply: on a find-and-fix, code that still crashes is the normal state
  // of a partial attempt, so blocking on it locks in exactly the student the
  // test most needs to hear from. Submitting broken code on a test is
  // allowed; it is what the marker is for.
  const isSummative = !!lesson.grading?.summative;
  const canSubmit =
    isSummative ||
    (!runtimeError &&
      (isMoshionMode || isNoPoints
        ? allRequirementsPassed
        : totalScore >= (lesson.grading?.passingScore ?? 0)));
  // Any lesson with graded criteria keeps the score header, not just the
  // assignment routes — ch2's labs are `type: "lesson"` but still scored.
  const showAssignmentHeader = isAssignment || isMoshionMode || totalCriteria > 0;
  // q5 grading is binary/completion-based — show criteria counts, not points.
  const headerScore = isMoshionMode ? passedCriteria : totalScore;
  const headerTotal = isMoshionMode ? totalCriteria : totalPossible;
  const headerUnitLabel = isMoshionMode ? '' : 'pts';

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
          // The Docs drawer is on every lesson. It defaults to the set the
          // lesson teaches — moSHion for moSHion lessons, the plain-JavaScript
          // reference for console lessons, JavaScript for everything else
          // (readings, slides, examples, quizzes) — and all three sets
          // (JavaScript, moSHion, reSHape) are one click away, because a
          // student reading about `for` loops in a moSHion lesson may want
          // the plain-JS page on the same construct.
          {
            key: 'docs',
            label: 'Docs',
            color: '#bd93f9',
            content: (
              <DocsDrawer
                defaultSetId={isMoshionMode ? 'moshion' : 'js'}
                storageKey="shCode:lesson-docs"
              />
            ),
            headerExtra: isMoshionMode ? (
              <a
                href="/docs/moshion"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary btn-sm"
              >
                Docs ↗
              </a>
            ) : undefined,
          },
          // Only moSHion lessons have sprites, so only they can use a texture.
          // Without this tab the student has to leave their code, draw on
          // /textures, and navigate back; the editor writes to the same
          // localStorage the preview bridge hydrates, so the name is ready as
          // soon as they hit Run. `#8be9fd` is already the File tab's colour.
          ...(isMoshionMode
            ? ([
                {
                  key: 'textures',
                  label: 'Textures',
                  color: '#ff79c6',
                  content: <TextureEditor />,
                  headerExtra: (
                    <a
                      href="/textures"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary btn-sm"
                    >
                      Full page ↗
                    </a>
                  ),
                },
              ] as DrawerTab[])
            : []),
          // The teaching for a console lesson lives in lesson.json's `steps` —
          // what console.log does, why numbers take no quotes, what a boolean
          // is. Nothing mounted LessonSteps, so all of it was invisible and the
          // student got requirement titles and a comment-only starter file.
          // Only offered when the lesson actually has steps.
          ...((lesson.steps?.length ?? 0) > 0
            ? ([
                {
                  key: 'steps',
                  label: 'Steps',
                  color: '#f1fa8c',
                  content: <LessonSteps lesson={lesson} />,
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
          showStatus={!isMoshionMode}
          showSubmit={!isMoshionMode}
          scoreAlign={isMoshionMode ? 'right' : 'center'}
        />
      ) : (
        <div id="titleRow">
          <h1>{lesson.title}</h1>
        </div>
      )}
      {lesson.planFrom && (
        <PlanChartPanel
          planFrom={lesson.planFrom}
          planFromLabel={lesson.planFromLabel}
          onScaffold={setPlanLines}
          stale={planStale}
        />
      )}
      <div className="editor-card">
        <div className="editor-body">
          <div className="run-toolbar">
            {(isConsoleMode || isReshapeMode || isMoshionMode) && (
              <>
                {/* reSHape's own Run/Stop lives inside ReshapeStudio's Code
                    side (hidden entirely on its Build side) -- see that
                    component's own toolbar. */}
                {!isReshapeMode && (
                  isRunning && isMoshionMode ? (
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
                      onClick={isMoshionMode ? runQ5 : runCode}
                    >
                      ▶ Run
                    </button>
                  )
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
                      if (isReshapeMode) setReshapeResetKey((k) => k + 1);
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
                onInsert={(solutionFiles) => {
                  // Every file, not just script.js. A1.3.1 grades README.md
                  // too, so a script-only insert scored 8/10 and left Submit
                  // disabled with no way to demonstrate a passing answer.
                  for (const [path, text] of Object.entries(solutionFiles)) {
                    updateFile(path, text);
                  }
                  setSolutionLoaded(true);
                }}
              />
              <button className="btn-secondary btn-sm" onClick={() => setCommitOpen(true)}>
                Commit{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
              </button>
              <button className="btn-secondary btn-sm" onClick={() => setHistoryOpen(true)}>
                History
              </button>
              {isMoshionMode && (
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
            {isReshapeMode ? (
              // ReshapeStudio is self-contained (its own toolbar, its own
              // CodeEditor for the Code side, its own model tools for the
              // Build side) -- it replaces this whole split rather than
              // sharing it with a second, redundant CodeEditor in
              // #editorPane. Same pattern SandboxWorkspace uses for its own
              // reshape tab. The outer pane-resize effect above no-ops
              // gracefully (early return) with #editorPane/#previewPane
              // absent from the DOM.
              <ReshapeStudio
                key={`${lesson.id}-${reshapeResetKey}`}
                value={files['script.js'] ?? ''}
                onChange={(t) => updateFile('script.js', t)}
                sides={reshapeSides}
                onDocChange={setLatestModelDoc}
                lessonId={lesson.id}
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
                  ) : isMoshionMode ? (
                    <MoshionPreview code={q5Code} runKey={runKey} />
                  ) : (
                    <LivePreview srcDoc={srcDoc} />
                  )}
                </div>
                <div className="drag-overlay" id="dragOverlay" aria-hidden="true"></div>
              </>
            )}
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
        summative={isSummative}
      />
      <KeyboardShortcutModal
        isOpen={shortcutModalOpen}
        onClose={() => setShortcutModalOpen(false)}
      />
    </>
  );
}
