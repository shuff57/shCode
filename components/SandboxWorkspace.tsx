'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronUp, CloudUpload, History, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, RotateCcw, Users } from 'lucide-react';
import type { Extension } from '@codemirror/state';
import { useLessonStore } from '../lib/store';
import { saveProgress } from '../lib/version-control';
import { useCloudWorkspace } from '../lib/lesson-sync';
import { TOGETHER_COPY, addLocalSnapshot } from '../lib/local-history';
import { useLessonState } from '../lib/progress';
import CodeEditor from './CodeEditor';
import HistoryPanel from './HistoryPanel';
import MoshionPreview from './MoshionPreview';
import Console from './Console';
import TabbedRightDrawer, { type DrawerTab } from './TabbedRightDrawer';
import AiHelpPanel from './AiHelpPanel';
import TextureEditor from './TextureEditor';
import FontMaker from './FontMaker';
import SoundMixer from './SoundMixer';
import ClassLibraryPanel from './ClassLibraryPanel';
import DocsDrawer from './DocsDrawer';
import PublishGameButton from './PublishGameButton';
import ProposeChangeButton from './ProposeChangeButton';
import CodeTogetherBar, { useCodeTogetherAvailable } from './CodeTogetherBar';
import SandboxProjectPicker from './SandboxProjectPicker';
import { useSandboxProjects } from '../lib/sandbox-projects';
import { projectLessonId } from '../lib/sandbox-projects-core';
import { RUN_TIMEOUT_MS, errorWithLocation, runStudentCode, timerLimitMessage } from '../lib/js-runner-source';
import {
  NO_TEACHER_MODES,
  canUseBuild,
  canUseCode,
  resolveMode,
  whyLocked,
  type TeacherModes,
} from '../lib/lesson-mode';
import EditorPlaceholder from './diagram/EditorPlaceholder';
import { emptyDiagram, type DiagramDoc } from '../lib/diagram-types';
import { getMode, sandboxLesson } from '../lib/sandbox-modes';

// The B-rep kernel + three.js viewport are heavy; a plain JS or moSHion
// sandbox session should never pay for them. Same dynamic-import pattern
// DiagramAssignmentView uses for DiagramEditor.
const ReshapeStudio = dynamic(() => import('./reshape/ReshapeStudio'), { ssr: false });
// Same lazy chunk the lesson diagrams use; React Flow stays out of the other modes.
const DiagramEditor = dynamic(() => import('./diagram/DiagramEditor'), {
  ssr: false,
  loading: () => <EditorPlaceholder height={420} />,
});

// The palette row above the canvas and the hint line below it, so the canvas height is
// the frame's height minus this.
const FLOW_PALETTE_H = 130;

// The saved chart is JSON text in the draft. A draft that does not parse, or
// has no node list, opens as an empty canvas rather than breaking the page.
function parseChart(text: string | undefined): DiagramDoc {
  if (!text) return emptyDiagram();
  try {
    const d = JSON.parse(text);
    if (d && Array.isArray(d.nodes) && Array.isArray(d.edges)) return d as DiagramDoc;
  } catch { /* fall through to the empty canvas */ }
  return emptyDiagram();
}

// Which side (Build/Code) reSHape opens on. Read once at page load and
// handed to ReshapeStudio as `startSide` -- the studio owns the toggle
// itself from then on (see its own file header), so this is a
// load-time default, not a live mirror of whatever side the student is
// currently on.
const BUILD_KEY = 'shCode:sandbox-reshape-build';

// The plain outlined chip the Reset and Full screen buttons both wear. Snug
// enough that the whole toolbar, Stop included, is one row at 1366 wide.
const chipStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 4,
  background: 'var(--x-343746)',
  color: 'var(--c-fg)',
  border: '1px solid var(--c-line)',
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
  const resetLesson = useLessonStore((s) => s.resetLesson);
  const lessonProgress = useLessonState();

  // The open project (lib/sandbox-projects.ts). Each project is its own lesson
  // id, so its draft, cloud save and History are its own; switching projects is
  // switching lessons. `project` is null only once the student has deleted
  // every project, and the page then offers to make one.
  const projectsState = useSandboxProjects();
  const project = projectsState.current;
  const noProjects = projectsState.loaded && !project;
  const modeId = project?.mode ?? 'moshion';
  const mode = useMemo(() => getMode(modeId), [modeId]);
  const lessonId = project ? projectLessonId(project) : 'sandbox-moshion';
  const lesson = useMemo(() => sandboxLesson(mode, lessonId), [mode, lessonId]);

  // The same cloud-save surface a lesson has on cs-3d: one deliberate Save
  // writes the live workspace to lesson_sync, arrival merges a save from
  // another device, and History lists both this device's snapshots and the
  // cloud saves, all for the open project.
  const cloud = useCloudWorkspace(lesson, lessonProgress.authed);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Code together (REALTIME-SPEC.md Part 2): the JavaScript and moSHion modes
  // only, for a student signed in and in a class. The toolbar button opens its
  // popup (start, join, open sessions; in a session, the code to share again);
  // a session itself is one slim line above the editor. While a session is on,
  // the editor carries the shared-editing extension (lib/live-doc.ts) and Reset
  // and the mode tabs are locked, so one click cannot wipe or swap everyone's program.
  const togetherLang = modeId === 'js' || modeId === 'moshion' ? modeId : null;
  const mayTogether = useCodeTogetherAvailable(togetherLang, lessonProgress.authed);
  const [togetherOpen, setTogetherOpen] = useState(false);
  const [together, setTogether] = useState(false);
  const [togetherHere, setTogetherHere] = useState(0);
  const [togetherBadge, setTogetherBadge] = useState<HTMLSpanElement | null>(null);
  const [collabExt, setCollabExt] = useState<Extension | null>(null);
  const cloudRef = useRef(cloud);
  cloudRef.current = cloud;
  const togetherSnapshot = useCallback((label: string) => {
    addLocalSnapshot(lesson.id, useLessonStore.getState().fileContents, label);
  }, [lesson.id]);
  // Leaving (or the host ending it) keeps the shared program as this student's
  // own draft, through the same path as Save, so it reaches Cloud history too.
  const keepTogetherCopy = useCallback(() => {
    addLocalSnapshot(lesson.id, useLessonStore.getState().fileContents, TOGETHER_COPY);
    void cloudRef.current.save();
  }, [lesson.id]);

  const isFlow = mode.preview === 'diagram';
  const chart = useMemo(() => (isFlow ? parseChart(fileContents[mode.file]) : null), [isFlow, fileContents, mode.file]);
  const onChartChange = useCallback((doc: DiagramDoc) => updateFile(mode.file, JSON.stringify(doc)), [updateFile, mode.file]);
  // The canvas wants a pixel height; the split is the flexible box, so measure it.
  const flowFrameRef = useRef<HTMLDivElement>(null);
  const [flowH, setFlowH] = useState(480);
  useEffect(() => {
    const el = flowFrameRef.current;
    if (!el || !isFlow) return;
    const measure = () => setFlowH(Math.max(240, el.clientHeight - FLOW_PALETTE_H));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isFlow]);

  const [code, setCode] = useState('');
  const [runKey, setRunKey] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleResetKey, setConsoleResetKey] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>([]);
  // The output follows the newest line, unless the student has scrolled up to read.
  const outputRef = useRef<HTMLPreElement | null>(null);
  const outputPinned = useRef(true);
  useEffect(() => {
    const el = outputRef.current;
    if (!el) return;
    const onScroll = () => { outputPinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24; };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  });
  useEffect(() => {
    const el = outputRef.current;
    if (el && outputPinned.current) el.scrollTop = el.scrollHeight;
  }, [logs]);

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
  const runRef = useRef<{ kill: () => void } | null>(null);

  useEffect(() => () => { runRef.current?.kill(); }, []);

  // Read in an effect rather than useState's initialiser so the server and
  // client markup stay identical, which a static export needs.
  useEffect(() => {
    try {
      const b = window.localStorage.getItem(BUILD_KEY);
      if (b === '0') setBuild(false);
    } catch { /* private mode */ }
  }, []);

  // Each project is its own lesson id, so the store keeps independent drafts
  // and switching back finds your code where you left it. A switch stops the
  // run and brings back a pane hidden in full screen.
  useEffect(() => {
    runRef.current?.kill();
    runRef.current = null;
    setLesson(lesson);
    setCode('');
    setRunKey(0);
    setIsRunning(false);
    setLogs([]);
    setTogetherOpen(false);
    setEditorHidden(false);
    setConsoleHidden(false);
  }, [lesson, setLesson]);

  // Keep the draft. Nothing else in the sandbox writes it, so without this a
  // reload dropped the student's code or chart back to the starter. Debounced
  // like the lesson workspace, and flushed when the tab is hidden so the last
  // second of work is not lost.
  useEffect(() => {
    const save = () => {
      try {
        const st = useLessonStore.getState();
        if (!st.lesson || st.lesson.id !== lesson.id) return;
        saveProgress(st.lesson.id, {
          fileContents: st.fileContents,
          commits: st.commits,
          lastCommittedFileContents: st.lastCommittedFileContents,
          completedSteps: [],
        });
      } catch { /* private mode or quota: the draft stays in memory */ }
    };
    const timer = setTimeout(save, 800);
    const onHide = () => { if (document.visibilityState === 'hidden') save(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [fileContents, lesson.id]);

  // ---- Running ----------------------------------------------------------

  const runJs = useCallback((script: string) => {
    runRef.current?.kill();
    outputPinned.current = true;
    const collected: LogLine[] = [];
    setLogs([]);
    setIsRunning(true);

    // The run is over (finished, failed, or stopped for running too long): Stop goes away.
    // Only this run's own end counts, never one a newer Run already replaced.
    const ended = () => {
      if (runRef.current !== run) return;
      runRef.current = null;
      setIsRunning(false);
    };
    const run = runStudentCode(
      script,
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
        ended();
      },
      (info) => {
        collected.push({
          type: 'error',
          // A program kept alive by its timers is not a stuck loop: say what it is.
          message: info.phase === 'timers'
            ? timerLimitMessage()
            : `Your code was still running after ${RUN_TIMEOUT_MS / 1000} seconds, so it was stopped. That usually means a loop never reaches its stopping point — check that the value in the condition actually changes inside the loop.`,
        });
        setLogs([...collected]);
        ended();
      },
      () => {
        collected.length = 0;
      },
      // The sandbox alone waits for setTimeout/setInterval: a lesson's run ends
      // after its synchronous pass, so its grading never waits on a timer.
      { timers: true },
    );
    runRef.current = run;
  }, []);

  // What Publish game sends: the editor's text now, not the last run.
  const getScript = useCallback(() => useLessonStore.getState().fileContents['script.js'] || '', []);
  // Code together asks before swapping the editor's text, unless nothing would be lost.
  const isUntouched = useCallback(() => {
    const norm = (t: string) => t.replace(/\r\n/g, '\n').trim();
    const now = norm(getScript());
    return now === '' || now === norm(mode.starter);
  }, [getScript, mode.starter]);

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
    runRef.current?.kill();
    runRef.current = null;
    setCode('');
    setRunKey(0);
    setConsoleResetKey((k) => k + 1);
    setIsRunning(false);
  }

  function reset() {
    if (window.confirm(isFlow ? 'Clear the chart and start over? This cannot be undone.' : 'Reset code to the starter? Unsaved work will be lost.')) {
      // resetLesson also wipes the saved draft; setLesson would load it back.
      resetLesson(lesson);
      stopRun();
      setLogs([]);
      // ReshapeStudio's own "Clear model" button (inside its Build toolbar)
      // wipes just the model, independent of this -- this resets the SAVED
      // TEXT to the starter, so the studio needs a fresh mount to pick it up.
      if (mode.preview === 'reshape') setReshapeResetKey((k) => k + 1);
    }
  }

  // LessonWorkspace's Save handler in miniature: keep a copy on this device
  // even if the cloud write fails, then let lesson-sync merge and save.
  function saveToCloud() {
    addLocalSnapshot(lesson.id, useLessonStore.getState().fileContents, 'Saved on this device');
    void cloud.save();
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        // reSHape has its own Ctrl+Enter handling scoped to its Code side --
        // see ReshapeStudio's own keydown effect.
        if (mode.preview !== 'reshape' && mode.preview !== 'diagram') run();
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

  const drawerTabs: DrawerTab[] = isFlow ? [
    {
      key: 'flow-help',
      label: 'Help',
      color: 'var(--c-orange)',
      content: (
        <div style={{ padding: 12, fontSize: 13, lineHeight: 1.6, color: 'var(--x-e0e2ee)' }}>
          <p style={{ marginTop: 0 }}>Draw any flowchart you like. Nothing here is checked or graded.</p>
          <ul style={{ paddingLeft: 18 }}>
            <li><strong>Oval</strong>: where the chart starts or ends.</li>
            <li><strong>Rectangle</strong>: one step.</li>
            <li><strong>Diamond</strong>: a yes or no question. Give each arrow out of it a label.</li>
            <li><strong>Slanted box</strong>: input or output.</li>
          </ul>
          <p>Click a shape in the row above the canvas to add it, then drag from one shape&apos;s edge to another to join them. Double-click a shape to type in it.</p>
          <p style={{ marginBottom: 0 }}>Your chart saves on its own and is waiting for you next time.</p>
        </div>
      ),
    },
  ] : [
    // moSHion only. reSHape has no sprites and the JS console has no canvas,
    // so a texture editor there is a tab that can never be acted on.
    ...(mode.preview === 'moshion'
      ? [{
          key: 'textures',
          label: 'Textures',
          color: 'var(--c-cyan)',
          content: <TextureEditor />,
          headerExtra: (
            <a href="/textures" target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
              Full page ↗
            </a>
          ),
        } as DrawerTab,
        {
          key: 'sounds',
          label: 'Sounds',
          color: 'var(--c-green)',
          content: <SoundMixer />,
          headerExtra: (
            <a href="/sound" target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
              Full page ↗
            </a>
          ),
        } as DrawerTab,
        // Fonts for textFont('name'): add one from a file, try them all, copy the line.
        {
          key: 'fonts',
          label: 'Fonts',
          color: 'var(--c-pink)',
          content: <FontMaker compact />,
          headerExtra: (
            <a href="/fonts" target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
              Full page ↗
            </a>
          ),
        } as DrawerTab,
        // The Library: your own saved art with Share, and what classmates shared (#81).
        {
          key: 'class',
          label: 'Library',
          color: 'var(--c-yellow)',
          content: <ClassLibraryPanel />,
          headerExtra: (
            <a href="/library" target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
              Full page ↗
            </a>
          ),
        } as DrawerTab]
      : []),
    {
      key: 'help',
      label: 'CODY',
      color: 'var(--c-orange)',
      content: <AiHelpPanel lesson={lesson} />,
    },
    {
      key: 'docs',
      label: 'Docs',
      color: 'var(--c-purple)',
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
  // History and Save ride in both toolbars: reSHape folds the sandbox's chrome
  // into ReshapeStudio's own row, while every other mode has the normal one.
  const renderCloudChips = () => (
    <>
      <button
        style={chipStyle}
        onClick={() => setHistoryOpen(true)}
        title="Restore a version saved on this device or in the cloud"
      >
        <History size={12} />
        History
      </button>
      {lessonProgress.authed && (
        // The note hangs below Save for a few seconds instead of sitting in the row and pushing every button along.
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            style={chipStyle}
            onClick={saveToCloud}
            disabled={cloud.saving}
            title="Save this sandbox to the cloud so you can open it on another device."
          >
            <CloudUpload size={12} />
            {cloud.saving ? 'Saving…' : 'Save'}
          </button>
          <span role="status" aria-live="polite" className="sandbox-save-note" data-kind={cloud.note?.kind ?? ''} hidden={!cloud.note}>
            {cloud.note ? `${cloud.note.kind === 'error' ? '✗' : '✓'} ${cloud.note.text}` : null}
          </span>
        </span>
      )}
    </>
  );

  const reshapeToolbarExtra = isReshape ? (
    <>
      {!reshapeIsBuild && <SandboxProjectPicker state={projectsState} />}
      {lockNote && <span className="sandbox-lock">{lockNote}</span>}
      {renderCloudChips()}
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
            {/* Up here rather than at the end of the toolbar, where it took a row of its own at 1366 wide. */}
            {!isReshape && !isFlow && <span className="run-hint sandbox-run-hint">Ctrl+Enter to run</span>}
          </div>
        )}

        {!isReshape && (
          <div className="run-toolbar sandbox-toolbar">
            <SandboxProjectPicker
              state={projectsState}
              locked={together}
              lockedTitle="Leave Code together to switch projects"
              startOpen={noProjects}
            />
            {!isFlow && !noProjects && <button className="btn-run" onClick={run} title="Run (Ctrl+Enter)" aria-keyshortcuts="Control+Enter">▶ Run</button>}
            {isRunning && !isFlow && (
              <button
                className="btn-secondary btn-sm"
                style={{ color: 'var(--c-red)', borderColor: 'var(--c-red)' }}
                onClick={stopRun}
              >
                ■ Stop
              </button>
            )}
            {/* Grouped and pushed right: this program (History, Save, Reset), with classmates (Code together,
                Publish game), then the view. Thin lines between the groups (.sandbox-tb-end). */}
            {!noProjects && <div className="sandbox-tb-end">
              <div className="sandbox-tb-group" role="group" aria-label="This program">
                {renderCloudChips()}
                <button
                  style={together ? { ...chipStyle, opacity: 0.45, cursor: 'not-allowed' } : chipStyle}
                  onClick={reset}
                  disabled={together}
                  title={together ? 'Leave Code together to reset' : undefined}
                >
                  <RotateCcw size={12} />
                  Reset
                </button>
              </div>
              {((togetherLang && (mayTogether || together)) || (mode.preview === 'moshion' && lessonProgress.authed)) && (
                <div className="sandbox-tb-group" role="group" aria-label="With classmates">
                  {togetherLang && (mayTogether || together) && (
                    <button
                      type="button"
                      style={together ? { ...chipStyle, color: 'var(--c-fg)', border: '1px solid var(--c-purple)' } : chipStyle}
                      aria-haspopup="dialog"
                      aria-expanded={togetherOpen}
                      onClick={() => setTogetherOpen(true)}
                      title={together ? `Coding together, ${togetherHere} here: the session code, who is here, and Leave` : 'Write one program with classmates at the same time'}
                      data-testid="code-together-button"
                    >
                      <Users size={12} aria-hidden="true" />
                      {/* In a session CodeTogetherBar puts the code's pictures and a dot per person in here (badgeHost). */}
                      {together ? <span ref={setTogetherBadge} style={{ display: 'inline-flex' }} /> : 'Code together'}
                    </button>
                  )}
                  {/* The Games library: publish this sketch so classmates can play and remix it. */}
                  {mode.preview === 'moshion' && lessonProgress.authed && (
                    <>
                      <PublishGameButton key={`publish-${lesson.id}`} getCode={getScript} />
                      {/* Shown only while the code is a remix of a classmate's game: send the change back (lib/game-flow-core.ts). */}
                      <ProposeChangeButton key={`propose-${lesson.id}`} getCode={getScript} />
                    </>
                  )}
                </div>
              )}
              {!isFlow && (
                <div className="sandbox-tb-group">
                  <button
                    style={chipStyle}
                    onClick={toggleFull}
                    title={full ? 'Leave full screen (Esc)' : 'Fill the screen with the preview'}
                  >
                    {full ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    {full ? 'Exit full screen' : 'Full screen'}
                  </button>
                </div>
              )}
            </div>}
          </div>
        )}

        {noProjects && (
          <div className="sandbox-empty" role="status">
            <p style={{ margin: 0, fontSize: 16, color: 'var(--c-fg)' }}>You have no projects.</p>
            <p style={{ margin: 0 }}>Press the Projects button above, then New project, to start one.</p>
          </div>
        )}

        {!noProjects && <div className="editor-preview-container sandbox-split" id="split">
          {isReshape ? (
            <ReshapeStudio
              key={`${lesson.id}-${reshapeResetKey}`}
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
          ) : isFlow && chart ? (
            <div className="sandbox-flow" ref={flowFrameRef}>
              <DiagramEditor key={lesson.id} value={chart} onChange={onChartChange} height={flowH} />
            </div>
          ) : (
            <>
              <div className="pane" id="editorPane">
                {togetherLang && (mayTogether || together) && (
                  <CodeTogetherBar
                    key={togetherLang}
                    lang={togetherLang}
                    getText={getScript}
                    snapshot={togetherSnapshot}
                    onCollab={setCollabExt}
                    onActive={setTogether}
                    onHere={setTogetherHere}
                    keepCopy={keepTogetherCopy}
                    isUntouched={isUntouched}
                    open={togetherOpen}
                    onOpenChange={setTogetherOpen}
                    dialogHost={shellRef.current}
                    badgeHost={togetherBadge}
                  />
                )}
                <div style={{ flex: '1 1 auto', minHeight: 0 }}>
                  <CodeEditor collab={collabExt} />
                </div>
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
                    <pre
                        ref={outputRef}
                        className="console-output run-output"
                        role="log"
                        aria-live="polite"
                        aria-atomic="false"
                        aria-relevant="additions text"
                        aria-label="Program output"
                      >
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
                  <MoshionPreview code={code} runKey={runKey} gameKey="sandbox" />
                )}
              </div>
              <div className="drag-overlay" id="dragOverlay" aria-hidden="true"></div>
            </>
          )}
        </div>}
        {full && !isReshape && !isFlow && (
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

        {!isConsole && !reshapeIsBuild && !isFlow && !noProjects && (
          <div className="sandbox-console-wrap">
            <div className="output-header">Console</div>
            <div className="sandbox-console-body">
              <Console resetKey={String(consoleResetKey)} />
            </div>
          </div>
        )}
        {full && !isConsole && !reshapeIsBuild && !isFlow && (
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
        .sandbox-run-hint { margin-left: auto; white-space: nowrap; }
        .sandbox-title { margin: 0; font-size: 28px; color: var(--text); }
        .sandbox-subtitle { color: var(--c-meta); font-size: 0.85rem; }
        .sandbox-toolbar { margin-bottom: 0; flex-shrink: 0; gap: 8px; }
        .sandbox-empty {
          flex: 1 1 auto; display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; color: var(--c-meta); font-size: 14px; border: 1px dashed var(--c-line); border-radius: 8px; padding: 24px;
        }
        .sandbox-lock { color: var(--c-orange); font-size: 12px; margin-right: 10px; }
        /* Above the editor so the save note (and Publish game's panel) can hang over it. */
        /* The global .run-toolbar scrolls sideways on desktop, which clipped the note and squeezed the buttons;
           the sandbox's row wraps whole groups instead. */
        .run-toolbar.sandbox-toolbar { position: relative; z-index: 5; overflow: visible; flex-wrap: wrap; row-gap: 8px; }
        .run-toolbar.sandbox-toolbar > * { flex-shrink: 0; }
        /* One block: on a narrow window it moves to its own line whole, right-aligned, instead of breaking mid-group. */
        .sandbox-tb-end { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: nowrap; }
        .sandbox-tb-end > * + * { border-left: 1px solid var(--c-line); padding-left: 10px; }
        .sandbox-tb-group { display: flex; align-items: center; gap: 6px; }
        .sandbox-save-note {
          position: absolute; top: calc(100% + 6px); left: 0; z-index: 30; white-space: nowrap;
          font-size: 12px; padding: 4px 8px; border-radius: 4px; background: var(--c-bg);
          border: 1px solid currentColor; color: var(--c-green); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .sandbox-save-note[data-kind='error'] { color: var(--c-red); }
        .sandbox-save-note[hidden] { display: none; }
        @media (max-width: 720px) {
          .sandbox-tb-end { margin-left: 0; flex-basis: 100%; flex-wrap: wrap; row-gap: 6px; min-width: 0; }
          .sandbox-tb-end > * + * { border-left: 0; padding-left: 0; }
          .sandbox-tb-group { flex-wrap: wrap; }
          .sandbox-header { flex-wrap: wrap; row-gap: 2px; }
          .sandbox-run-hint { display: none; }
        }
        .sandbox-split.editor-preview-container {
          height: auto;
          flex: 1 1 auto;
          min-height: 280px;
        }
        .sandbox-flow { flex: 1 1 auto; min-width: 0; min-height: 0; }
        .sandbox-console-wrap {
          display: flex;
          flex-direction: column;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 4px;
          overflow: hidden;
          flex: 0 0 auto;
          height: 120px;
          min-height: 120px;
          max-height: 60vh;
          resize: vertical;
        }
        /* A lobby bar above the canvas takes height from the row that holds it,
           so the console (empty most of the time, and still resizable) gives some back. */
        .sandbox-shell:has([data-testid='moshion-lobby']) .sandbox-console-wrap {
          height: 112px;
          min-height: 72px;
        }
        .sandbox-shell:has([data-testid='moshion-lobby']) .sandbox-console-wrap .console-empty {
          padding: 4px;
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
          border: 1px solid var(--x-565a70);
          border-radius: 6px;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
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
          color: var(--x-d3d5e3);
          background: color-mix(in srgb, var(--c-bg) 92.0%, transparent);
          border: 1px solid var(--x-565a70);
          border-radius: 4px;
          cursor: pointer;
        }
        .sandbox-editor-toggle:hover { background: var(--c-line); }
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
          color: var(--x-d3d5e3);
          background: color-mix(in srgb, var(--c-bg) 92.0%, transparent);
          border: 1px solid var(--x-565a70);
          border-radius: 4px;
          cursor: pointer;
        }
        .sandbox-console-toggle:hover { background: var(--c-line); }
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
          border: 1px solid var(--x-565a70);
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.45);
        }
        .sandbox-shell.is-console-hidden .sandbox-console-wrap { display: none; }
        .sandbox-shell.is-console-hidden .sandbox-console-toggle { bottom: 12px; top: auto; }
      `}</style>

      <HistoryPanel
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        lessonId={lesson.id}
        saveToAccount={lessonProgress.authed}
        // ReshapeStudio only reads `value` at mount, so a restored version
        // needs a fresh instance to put the old model back on screen. Code
        // and chart modes resync from `fileContents` on their own.
        onRestore={() => {
          if (mode.preview === 'reshape') setReshapeResetKey((k) => k + 1);
        }}
      />
    </>
  );
}
