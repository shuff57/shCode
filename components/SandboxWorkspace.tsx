'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, RotateCcw } from 'lucide-react';
import { useLessonStore } from '../lib/store';
import CodeEditor from './CodeEditor';
import MoshionPreview from './MoshionPreview';
import ReshapePreview from './ReshapePreview';
import ReshapeParamsPanel, { type ParamDef, type ParamValues } from './ReshapeParamsPanel';
import Console from './Console';
import TabbedRightDrawer, { type DrawerTab } from './TabbedRightDrawer';
import AiHelpPanel from './AiHelpPanel';
import TextureEditor from './TextureEditor';
import DocsDrawer from './DocsDrawer';
import ModelEditor from './model/ModelEditor';
// three.js, not @jscad/regl-renderer, and the reason is subtraction rather than
// speed. Measured 2026-09-02 on the same document and kernel, one variable:
// regl 76.70 ms to redraw, three 79.10 ms -- a tie inside the run-to-run noise.
// (The draw STAGE really did drop 19.6 -> 3.7 ms, but a 16 ms saving inside a
// 77 ms pipeline never reaches a hand.) So this is not a performance choice: the
// regl renderer IS a JSCAD package, JSCAD is being removed, and three is what
// replaces it. The tie is the good news -- the removal costs nothing.
//
// What it buys that regl structurally cannot: a Raycaster, so a student can
// click a face or edge -- the whole point of a B-rep is that they have names,
// and BrepViewportThree's onPick/pick below (wired to `pickedEdge` here and
// to ModelEditor's Round/Bevel) is that picking, now built -- and world-to-
// screen projection, which is what the sandboxed iframe still does on our
// behalf to place drag handles.
import BrepViewport, { type BrepViewportStats, type ViewportPick } from './model/BrepViewportThree';
import HandleOverlay, { type AnchorPoint, type SketchOutline } from './model/HandleOverlay';
import { outlineOf } from '../lib/sketch-arc';
import { handlesFor, planeAnchor } from '../lib/model-handles';
import { EMPTY_DOC, type Feature, type ModelDoc, newPolygonSketch, newRectangleSketch } from '../lib/model-types';
import type { TopoName } from '../lib/topo-name';
import {
  applyParam,
  paramValues as docParams,
  solveDoc,
  solveSketchDrag,
  toReshape,
} from '../lib/model-codegen';
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

const MODE_KEY = 'shCode:sandbox-mode';
const BUILD_KEY = 'shCode:sandbox-reshape-build';
// Build mode's timeline strip height, and the matching bottom reservation on
// .reshape-pane-view -- ONE constant for both, because they drifting apart is
// exactly how the render surface and the handle overlay stopped sharing a
// box for a while (see the long comment on .reshape-pane-view's own
// padding-bottom rule, and HandleOverlay's bottomInset prop, for the CSS
// reason absolute positioning does not just inherit a flex child's padding
// the way it looks like it should).
const TIMELINE_HEIGHT_PX = 58;

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

  // JSCAD dimensions, published by the runner on every load.
  const [paramDefs, setParamDefs] = useState<ParamDef[]>([]);
  const [paramValues, setParamValues] = useState<ParamValues>({});
  const [rebuildMs, setRebuildMs] = useState<number | null>(null);
  const [stale, setStale] = useState<'empty' | 'error' | null>(null);

  // Build mode: the model is a ModelDoc and the code is generated from it.
  // Toggling to Code shows that generated source, read-only -- editing it would
  // need the code parsed back into features, which is a permanent non-goal.
  const [build, setBuild] = useState(false);

  // WHICH GEOMETRY ENGINE DRAWS BUILD MODE.
  //
  // Opt-in through ?engine=brep rather than a stored preference or a default,
  // because this is a spike: the B-rep path does not yet project drag handles
  // (the iframe does that today, using its own camera -- see the anchors
  // effect below), so it is strictly less capable than the JSCAD path until
  // that lands. A query parameter also means the measurement harness can pin
  // an engine without clicking anything, which a toggle in the UI would not.
  //
  // Read in an effect rather than at first render: this app is a static export,
  // so the server-rendered HTML has no location and reading one during render
  // is a hydration mismatch.
  const [brepEngine, setBrepEngine] = useState(false);
  useEffect(() => {
    try {
      setBrepEngine(new URLSearchParams(window.location.search).get('engine') === 'brep');
    } catch {
      /* no window, or a URL we cannot parse: stay on the engine that works */
    }
  }, []);
  const [doc, setDoc] = useState<ModelDoc>(EMPTY_DOC);
  const [selected, setSelected] = useState<string[]>([]);
  // An edge picked in the B-rep viewport (BrepViewportThree's onPick), lifted
  // here for the same reason `selected` is: ModelEditor's Round/Bevel needs
  // it, and the viewport that produced it is a sibling, not a parent.
  const [pickedEdge, setPickedEdge] = useState<{ target: string; edge: TopoName | null } | null>(null);
  // Rollback bar: the boundary index (0..features.length) past which features
  // are suppressed from the rebuilt model. null means "show everything". This
  // is a view change, not a structural edit -- see the effect below.
  const [rollbackIndex, setRollbackIndex] = useState<number | null>(null);
  // Click-to-draw state: which tool is active (null = none), and the first
  // clicked plane point awaiting a second click to complete the shape.
  const [drawTool, setDrawTool] = useState<'rect' | 'polygon' | null>(null);
  const [drawFirst, setDrawFirst] = useState<[number, number] | null>(null);
  // What the student's teachers have set. A failed or missing fetch resolves to
  // 'both', so a gate that cannot be read never locks anyone out of their work.
  const [teacherModes, setTeacherModes] = useState<TeacherModes>(NO_TEACHER_MODES);
  // Undo covers structure and dimensions together, because to a student they
  // are the same act: "put it back how it was". Dimension drags land here once,
  // on release, so a drag is one undo rather than sixty.
  const past = useRef<ModelDoc[]>([]);
  const future = useRef<ModelDoc[]>([]);
  const [depth, setDepth] = useState({ back: 0, forward: 0 });

  // Full screen puts the preview edge to edge and floats the editor over it,
  // so a shape can be built and then looked at without the editor in the way.
  const shellRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const [editorHidden, setEditorHidden] = useState(false);
  const [consoleHidden, setConsoleHidden] = useState(false);
  // Build's shape tools collapsing to the rail. Lives in ModelEditor; mirrored
  // here so the shell can shrink the floating card to rail width.
  const [toolsHidden, setToolsHidden] = useState(false);
  // The feature list lives in the bottom timeline now, so the card only holds
  // the note and the sketch rules. When both are gone the card collapses to
  // the rail on its own -- an empty card over the canvas is a click-eater.
  const [cardHasContent, setCardHasContent] = useState(true);
  const [anchors, setAnchors] = useState<AnchorPoint[]>([]);
  // The frame reloads on every structural edit, so specs posted at the moment
  // runKey changes arrive before the runner has a listener and are simply lost.
  // Held in a ref and re-sent when the runner announces its parameters, which
  // is the first moment it is known to be listening.
  const specsRef = useRef<unknown[]>([]);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  // A gate arriving after the page has rendered must not leave a student on a
  // side they are no longer allowed on.
  useEffect(() => {
    if (mode.preview !== 'reshape') return;
    const g = resolveMode('sandbox', teacherModes);
    if (build && !canUseBuild(g)) setBuild(false);
    if (!build && !canUseCode(g)) setBuild(true);
  }, [teacherModes, build, mode.preview]);

  useEffect(() => {
    let live = true;
    fetch('/api/my-lesson-modes')
      .then((r) => (r.ok ? r.json() : NO_TEACHER_MODES))
      .then((m) => { if (live) setTeacherModes(m ?? NO_TEACHER_MODES); })
      .catch(() => { /* no gate readable, so no gate applied */ });
    return () => { live = false; };
  }, []);

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
    setEditorHidden(false);
    setConsoleHidden(false);
    setModeId(next);
  }

  // ---- JSCAD: dimensions in, rebuild timings out ----------------------------

  useEffect(() => {
    if (mode.preview !== 'reshape') return;
    const onMessage = (e: MessageEvent) => {
      // Filter by source, not origin: the runner frame is sandboxed without
      // allow-same-origin, so its origin is opaque ("null") by design.
      if (frameRef.current && e.source !== frameRef.current.contentWindow) return;
      const d = e.data as {
        source?: string; type?: string; defs?: ParamDef[]; values?: ParamValues;
        ms?: number; empty?: boolean; failed?: boolean; points?: AnchorPoint[];
      };
      if (d?.type === 'brep-kernel-please') {
        // THE BYTE HANDOFF. The frame is sandboxed without allow-same-origin,
        // so it is an opaque origin with its own HTTP cache partition -- the
        // parent's own fetch of this file does nothing for it. So the frame
        // asks for the wasm directly and the parent hands it over as a
        // transferred ArrayBuffer, which took the kernel's start-up from
        // 39,857ms to 434ms (measured 2026-09-02, see runner-brep.html).
        //
        // Fetched FRESH on every request rather than cached in a variable: a
        // transferred ArrayBuffer is detached at the sender, so a cached copy
        // would only serve the first ask and leave nothing for a second frame
        // (Stop, then Run again). A plain fetch of a same-origin, browser-
        // cached asset costs nothing close to a real network round trip, so
        // there is no reason to hold a 22.9MB copy in JS heap to avoid it.
        const from = e.source;
        fetch('/reshape/kernel/replicad_single.wasm')
          .then((r) => r.arrayBuffer())
          .then((bytes) => {
            (from as Window | null)?.postMessage({ type: 'brep-kernel-bytes', bytes }, '*', [bytes]);
          })
          .catch(() => { /* the runner falls back to its own network fetch */ });
        return;
      }
      if (d?.source === 'reshape-params') {
        frameRef.current?.contentWindow?.postMessage(
          { source: 'reshape-set-anchors', anchors: specsRef.current },
          '*'
        );
        frameRef.current?.contentWindow?.postMessage(
          { source: 'reshape-set-savebar', offset: build ? 48 : 0, bottom: build },
          '*'
        );
        setParamDefs(Array.isArray(d.defs) ? d.defs : []);
        setParamValues(d.values ?? {});
        setRebuildMs(null);
        setStale(null);
      } else if (d?.source === 'reshape-rebuilt' && typeof d.ms === 'number') {
        setStale(d.failed ? 'error' : d.empty ? 'empty' : null);
        if (!d.empty && !d.failed) setRebuildMs(d.ms);
      } else if (d?.source === 'reshape-anchors') {
        setAnchors(Array.isArray(d.points) ? d.points : []);
      } else if (d?.source === 'preview-error') {
        // A script that throws on load never reaches reshape-rebuilt, so without
        // this the failure is visible only inside the frame — and the panel
        // goes on showing numbers for a model that was never built.
        setStale('error');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [mode.preview, build]);

  // Read inside callbacks that must not rebuild on every doc change, and to
  // keep history bookkeeping out of a state updater -- React may call one twice.
  const docRef = useRef(doc);
  useEffect(() => { docRef.current = doc; }, [doc]);

  // The doc as the rollback bar sees it: everything up to (not including)
  // rollbackIndex. null means the full doc. Slicing here keeps the underlying
  // doc untouched, so toggling rollback never mutates the student's model.
  const effectiveDoc = useMemo(
    () => (rollbackIndex == null ? doc : { ...doc, features: doc.features.slice(0, rollbackIndex) }),
    [doc, rollbackIndex]
  );

  // Regenerate the live runner ONLY when the rollback toggle changes. Doc
  // edits already regenerate through loadDoc, so effectiveDoc is deliberately
  // left out of the dependency array -- this effect exists to react to the
  // rollback boundary itself, not to structural edits.
  useEffect(() => {
    if (!build) return;
    setCode(toReshape(effectiveDoc));
    setRunKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollbackIndex]);

  // Regenerate and reload. The slow path, and the only one structure takes.
  const loadDoc = useCallback((raw: ModelDoc) => {
    // Solve here, not at the call site. Every path into the doc goes through
    // this one, so the invariant holds no matter who is adopting it.
    const next = solveDoc(raw);
    setDoc(next);
    docRef.current = next;
    uncommitted.current = {};
    setParamDefs([]);
    // Updater form: React reads a bare object of unknowns as a possible
    // updater function, and picks the wrong overload.
    setParamValues(() => docParams(next));
    setRebuildMs(null);
    setStale(null);
    setRollbackIndex(null);
    setCode(toReshape(next));
    setRunKey((k) => k + 1);
    setIsRunning(true);
  }, []);

  const remember = useCallback((prev: ModelDoc) => {
    past.current = [...past.current.slice(-49), prev];
    future.current = [];
    setDepth({ back: past.current.length, forward: 0 });
  }, []);

  const applyDoc = useCallback((next: ModelDoc) => {
    remember(docRef.current);
    loadDoc(next);
  }, [remember, loadDoc]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current = [docRef.current, ...future.current];
    setDepth({ back: past.current.length, forward: future.current.length });
    loadDoc(prev);
  }, [loadDoc]);

  const redo = useCallback(() => {
    const [next, ...rest] = future.current;
    if (!next) return;
    past.current = [...past.current, docRef.current];
    future.current = rest;
    setDepth({ back: past.current.length, forward: rest.length });
    loadDoc(next);
  }, [loadDoc]);

  // Values changed since the doc was last folded up to date. During a drag the
  // doc is deliberately left alone: rewriting it per frame changes `specs`,
  // which re-posts the anchors, which comes back as another render. Measured at
  // 62 anchor round-trips for 24 pointer moves before this split.
  const uncommitted = useRef<ParamValues>({});

  const sendParams = useCallback((next: ParamValues) => {
    // A constrained corner drags its neighbours with it, so the solver decides
    // what actually moved -- the pointer only proposes.
    const numeric: Record<string, number> = {};
    for (const [k, v] of Object.entries(next)) {
      if (typeof v === 'number') numeric[k] = v;
    }
    const solved: ParamValues = Object.keys(numeric).length
      ? { ...next, ...solveSketchDrag(docRef.current, numeric) }
      : next;

    setParamValues((prev) => ({ ...prev, ...solved }));
    uncommitted.current = { ...uncommitted.current, ...solved };
    frameRef.current?.contentWindow?.postMessage(
      { source: 'reshape-set-params', params: solved },
      '*'
    );
  }, []);

  // Fold pending values into the doc, so the generated code describes the same
  // numbers the panel does. Cheap and rare -- once per drag, or per typed edit.
  const commitParams = useCallback(() => {
    const pending = uncommitted.current;
    uncommitted.current = {};
    if (!Object.keys(pending).length) return;
    let next = docRef.current;
    for (const [k, v] of Object.entries(pending)) {
      if (typeof v === 'number') next = applyParam(next, k, v);
    }
    // applyParam hands back the same object when nothing matched, so identity
    // is the test. Without it, editing the starter's dimensions in Code mode
    // filled the history with entries that undo to exactly the same model.
    if (next === docRef.current) return;
    // Through the same gate loadDoc() uses. This path used to call setDoc()
    // directly, so applyParam's output was the ONE way into the doc that was
    // never solved and never checked -- a doc adopted here could carry a rule
    // it did not obey and a design the outline builder would have refused.
    // Two adoption paths, one gate, is how a fix gets quietly bypassed.
    next = solveDoc(next);
    if (next === docRef.current) return;
    remember(docRef.current);
    setDoc(next);
    docRef.current = next;
  }, [remember]);

  // Leaving Build with something built is the one-way door. The generated file
  // is handed over to be edited by hand, and the shape tools stop driving it --
  // going back the other way would mean parsing JavaScript into features, which
  // is a permanent non-goal.
  // Only the selected shape gets handles: every shape at once is a screenful
  // of dots with no way to tell which belongs to what.
  const specs = useMemo(() => {
    if (!build) return [];
    if (drawTool) return [planeAnchor('xy', 0)];
    if (doc.features.length === 0) return [planeAnchor('xy', 0)];
    return doc.features.filter((f) => selected.includes(f.id)).flatMap(handlesFor);
  }, [build, doc, selected, drawTool]);
  const scales = useMemo(
    () => Object.fromEntries(specs.map((h) => [h.param, h.scale])),
    [specs]
  );

  // One entry per selected sketch: its corner parameters (so the overlay can
  // look up each corner's projected anchor) alongside the plane geometry
  // that decides what gets drawn between them -- straight, an arc, or the
  // full circle a two-point diameter tag means.
  const outlines = useMemo(
    () =>
      doc.features
        .filter((f): f is Feature & { kind: 'sketch' } => f.kind === 'sketch' && selected.includes(f.id))
        .map((f): SketchOutline => {
          // outlineOf() is the ONLY producer of an arc's endpoints -- see its
          // comment in lib/sketch-arc.ts. The overlay draws what it returns
          // and never writes any of it back; `corners` still names the design
          // params, because those are the only points that carry a handle.
          const o = outlineOf(f);
          return {
            corners: f.points.map((_, i) => `${f.id}_p${i}u`),
            design: f.points,
            points: o.points,
            basis: o.basis,
            shape: f.shape,
            bulges: o.bulges,
            constraints: f.constraints ?? [],
          };
        }),
    [doc, selected]
  );

  useEffect(() => {
    specsRef.current = specs;
    frameRef.current?.contentWindow?.postMessage(
      { source: 'reshape-set-anchors', anchors: specs },
      '*'
    );
    if (specs.length === 0) setAnchors([]);
  }, [specs]);

  // Escape cancels an in-progress draw. ModelEditor's own keydown listener
  // closes flyouts but lives in a different component and does not own this
  // state, so the draw tool needs its own.
  useEffect(() => {
    if (!drawTool) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setDrawTool(null); setDrawFirst(null); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawTool]);

  // A click on the plane while a draw tool is active. First click records the
  // start; a second click completes the shape and exits draw mode. A
  // degenerate second click (either side under 1 unit) is not an error -- it
  // just stays in draw mode so the student can click again.
  function handlePlace(u: number, v: number) {
    if (drawTool === 'rect') {
      if (!drawFirst) { setDrawFirst([u, v]); return; }
      const f = newRectangleSketch(doc, 'xy', drawFirst, [u, v]);
      if (!f) return;  // degenerate second click -- stay in draw mode, let them click again
      applyDoc({ ...doc, features: [...doc.features, f] });
      setSelected([f.id]);
      setDrawTool(null);
      setDrawFirst(null);
    } else if (drawTool === 'polygon') {
      if (!drawFirst) { setDrawFirst([u, v]); return; }
      const f = newPolygonSketch(doc, 'xy', drawFirst, [u, v]);
      if (!f) return;
      applyDoc({ ...doc, features: [...doc.features, f] });
      setSelected([f.id]);
      setDrawTool(null);
      setDrawFirst(null);
    }
  }

  function chooseBuild(on: boolean) {
    if (!on && doc.features.length > 0) {
      const ok = window.confirm(
        'Copy what you built into the code editor? You can edit the code freely '
        + 'after this, but the shape tools will no longer be driving it.'
      );
      if (!ok) return;
      updateFile('script.js', toReshape(doc));
      setDoc(EMPTY_DOC);
      setSelected([]);
      past.current = [];
      future.current = [];
      setDepth({ back: 0, forward: 0 });
    }
    try { window.localStorage.setItem(BUILD_KEY, on ? '1' : '0'); } catch { /* private mode */ }
    setBuild(on);
    // The tools stay exactly where the student left them: Build remembers its
    // own collapsed state, and it is not reset by coming back from Code.
  }

  // Adding, deleting or reordering changes the shape of the file, so this is
  // the slow path: regenerate and reload. Changing a number never comes here.

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
    // In Build the GENERATED program is the source of truth. fileContents
    // ['script.js'] is still the untouched JSCAD starter until the one-way
    // door out of Build writes the generated source into it, so reading it
    // here silently replaced the student's model with the starter box --
    // feature tree unchanged, Save STL sitting above the wrong solid, no
    // console output (sketch gauntlet round 3, live lens). Read the doc, not
    // the file. docRef, not doc, so this callback is not rebuilt on every
    // dimension change.
    const script = mode.preview === 'reshape' && build
      ? toReshape(docRef.current)
      : fileContents['script.js'] || '';
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
  }, [fileContents, mode.preview, build, runJs]);

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
        return;
      }
      // Only in Build. In Code the editor owns undo, and stealing it there
      // would rewind the model out from under someone editing text.
      if (!(mode.preview === 'reshape' && build) || !(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [run, undo, redo, mode.preview, build]);

  // Same shape as DiagramEditor's fullscreen: the browser owns the state, we
  // only mirror it, so Esc and the F11-style exits stay correct for free.
  useEffect(() => {
    const onFs = () => {
      const active = document.fullscreenElement === shellRef.current;
      setFull(active);
      // Leaving full screen should not leave the editor or the console hidden
      // in the windowed layout, where there is no way to bring them back.
      if (!active) {
        setEditorHidden(false);
        setConsoleHidden(false);
      }
      // Both panes just changed size by a lot; CodeMirror and the preview
      // iframe only relayout on a resize event.
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

  return (
    <>
      <TabbedRightDrawer storageKey="shCode:sandbox-drawer" tabs={drawerTabs} />
      <div
        className={
          'sandbox-shell'
          + (full ? ' is-full' : '')
          + (full && editorHidden && !(isReshape && build) ? ' is-editor-hidden' : '')
          + (full && consoleHidden ? ' is-console-hidden' : '')
          + (isReshape && build ? ' is-build' : '')
          + (isReshape && build && toolsHidden ? ' is-tools-hidden' : '')
          + (isReshape && build && !cardHasContent ? ' is-card-empty' : '')
        }
        ref={shellRef}
      >
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

          {isReshape && (
            <>
              <div className="sandbox-modes" role="group" aria-label="Editing mode">
                <button
                  type="button"
                  aria-pressed={!build}
                  disabled={!mayCode}
                  title={mayCode ? undefined : lockNote ?? undefined}
                  className={!build ? 'sandbox-mode is-active' : 'sandbox-mode'}
                  onClick={() => chooseBuild(false)}
                >
                  Code
                </button>
                <button
                  type="button"
                  aria-pressed={build}
                  disabled={!mayBuild}
                  title={mayBuild ? undefined : lockNote ?? undefined}
                  className={build ? 'sandbox-mode is-active' : 'sandbox-mode'}
                  onClick={() => chooseBuild(true)}
                >
                  Build
                </button>
              </div>
              {lockNote && <span className="sandbox-lock">{lockNote}</span>}
              {/* The shape tools move here in Build mode: ModelEditor renders
                  its bar and a layout effect relocates it into this host, so
                  the ribbon carries the modelling tools the way Onshape's
                  does. Empty in Code mode. */}
              <span id="reshapeRibbon" className="sandbox-ribbon" aria-hidden={!build} />
            </>
          )}
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

        <div className="editor-preview-container sandbox-split" id="split">
          <div className="pane" id="editorPane">
            {isReshape && build ? (
              <ModelEditor
                doc={doc}
                onChange={applyDoc}
                selected={selected}
                onSelect={setSelected}
                rollbackIndex={rollbackIndex}
                onRollback={setRollbackIndex}
                onStartDraw={setDrawTool}
                onUndo={undo}
                onRedo={redo}
                canUndo={depth.back > 0}
                canRedo={depth.forward > 0}
                collapsible
                onCollapsed={setToolsHidden}
                onContentChange={setCardHasContent}
                pickedEdge={pickedEdge}
                onClearPickedEdge={() => setPickedEdge(null)}
              />
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
            ) : isReshape ? (
              <div className="reshape-pane">
                <div className="reshape-pane-view">
                  {brepEngine && build ? (
                    // NO IFRAME ON THIS PATH, and that is the whole point of it.
                    // ReshapePreview builds a URL out of the generated source and
                    // remounts the frame on every change, so each edit costs a
                    // full page navigation plus a rebuild from zero. The sandbox
                    // exists to contain STUDENT CODE; Build mode runs none -- the
                    // shapes come from the toolbar, and the app builds them
                    // itself. So the frame is pure latency here and is dropped.
                    <BrepViewport
                      doc={effectiveDoc}
                      onStats={(st: BrepViewportStats) => {
                        // The params panel reads one number, so hand it the one a
                        // hand can feel: everything between the edit and the pixels.
                        setRebuildMs(Math.round(st.buildMs + st.meshMs + st.drawMs));
                        setStale(st.triangles > 0 ? null : 'empty');
                      }}
                      onPick={(p: ViewportPick | null) => {
                        // Picking a face or an edge also selects its owning
                        // shape, the same as clicking its row in the feature
                        // list -- Round/Bevel's existing `chosen.length === 1`
                        // gate then just works, with no separate edge-aware
                        // gate to keep in sync. Clicking empty space clears
                        // both, matching Onshape's own click-away-to-deselect.
                        if (!p) {
                          setSelected([]);
                          setPickedEdge(null);
                          return;
                        }
                        setSelected([p.target]);
                        setPickedEdge(p.kind === 'edge' ? { target: p.target, edge: p.name } : null);
                      }}
                      pick={pickedEdge?.edge ? { target: pickedEdge.target, name: pickedEdge.edge } : null}
                      selectedCount={selected.length}
                      // The B-rep engine's own producer for the SAME `anchors`
                      // state the JSCAD path fills from the iframe's
                      // 'reshape-anchors' postMessage (see the `onMessage`
                      // handler above) -- one piece of state, two producers,
                      // so HandleOverlay below needs no engine-specific
                      // branch at all. `specs` is the exact HandleSpec[] the
                      // iframe path already posts as 'reshape-set-anchors'.
                      anchors={specs}
                      onAnchors={setAnchors}
                    />
                  ) : (
                    <ReshapePreview
                      ref={frameRef}
                      code={code}
                      runKey={runKey}
                      // Only reached here when NOT (brepEngine && build) --
                      // see the ternary above -- so brepEngine true means
                      // Code mode, the one place this runner is meant for.
                      engine={brepEngine ? 'brep' : 'jscad'}
                    />
                  )}
                  {build && (
                    <HandleOverlay
                      points={anchors}
                      values={paramValues}
                      scales={scales}
                      onDrag={(param, value) => sendParams({ [param]: value })}
                      onCommit={commitParams}
                      outlines={outlines}
                      drawing={drawTool != null}
                      onPlace={handlePlace}
                      // This JSX only renders while build is true, which is
                      // exactly when .sandbox-shell carries is-build and the
                      // padding-bottom rule above is active -- so this is
                      // never conditional on anything this prop's own value
                      // needs to check.
                      bottomInset={TIMELINE_HEIGHT_PX}
                    />
                  )}
                </div>
                {runKey > 0 && (
                  <aside className="reshape-pane-params">
                    <ReshapeParamsPanel
                      defs={paramDefs}
                      values={paramValues}
                      onChange={sendParams}
                      onCommit={commitParams}
                      lastMs={rebuildMs}
                      stale={stale}
                    />
                  </aside>
                )}
              </div>
            ) : (
              <MoshionPreview code={code} runKey={runKey} />
            )}
          </div>
          {full && !(isReshape && build) && (
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
          {/* The parametric timeline: ModelEditor portals its feature list
              here, so the history reads as a horizontal strip across the
              bottom of the canvas, Fusion 360 style. */}
          <div id="reshapeTimeline" className="sandbox-timeline" aria-hidden={!build} />
          <div className="drag-overlay" id="dragOverlay" aria-hidden="true"></div>
        </div>

        {!isConsole && !(isReshape && build) && (
          <div className="sandbox-console-wrap">
            <div className="output-header">Console</div>
            <div className="sandbox-console-body">
              <Console resetKey={String(consoleResetKey)} />
            </div>
          </div>
        )}
        {full && !isConsole && !(isReshape && build) && (
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
        .reshape-pane { display: flex; height: 100%; min-height: 0; }
        .reshape-pane-view { flex: 1 1 auto; min-width: 0; display: flex; position: relative; }
        .reshape-pane-view .reshape-frame, .reshape-pane-view .reshape-empty { flex: 1; }
        .reshape-pane-params {
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

        /* ---- Build mode ----
           The whole window belongs to the rendered shapes: the toolbar and the
           preview are ONE space, the editor and console are gone, and the
           shape tools ride the left edge as a hideable sidebar. */
        .sandbox-shell.is-build .sandbox-header { display: none; }
        .sandbox-shell.is-build .sandbox-toolbar {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          /* Above the editor card (40): the flyout menus are fixed-position
             children of this bar, and a stacking context lower than the card
             would bury them under the feature list. */
          z-index: 50;
          margin-bottom: 0;
          padding: 4px 10px;
          /* Transparent: the bar floats over the split, so the runner's
             canvas shows through behind the buttons and the tools sit
             directly on the 3D viewport -- the Onshape ribbon, not a header
             above a box. */
          background: transparent;
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }
        /* The ribbon host takes the rest of the row; the shape tools bar
           (moved here by ModelEditor) fills it. */
        .sandbox-shell.is-build .sandbox-ribbon {
          flex: 1 1 auto;
          min-width: 0;
          display: flex;
          align-items: center;
        }
        .sandbox-shell.is-build .sandbox-ribbon .model-tools {
          flex: 1 1 auto;
          height: 34px;
          border-bottom: 0;
          background: transparent;
        }
        /* The parametric timeline: the feature history as a horizontal strip
           across the bottom of the canvas, Fusion 360 style. ModelEditor
           portals its list here. It spans the canvas between the floating
           card (left) and the Dimensions panel (right) -- chips under either
           would be hidden and unclickable. */
        .sandbox-timeline { display: none; }
        .sandbox-shell.is-build .sandbox-timeline {
          position: absolute;
          left: calc(min(420px, 45%) + 24px);
          right: 220px;
          bottom: 0;
          height: ${TIMELINE_HEIGHT_PX}px;
          z-index: 25;
          display: flex;
          align-items: stretch;
          background: rgba(40, 42, 54, 0.88);
          border-top: 1px solid #44475a;
        }
        .sandbox-shell.is-build.is-card-empty .sandbox-timeline { left: 66px; }
        /* The timeline floats at bottom:0 over the whole pane, and the runner
           puts its own Save STL/3MF/OBJ/SVG buttons at the bottom of ITS
           viewport -- so in Build the strip lay directly on top of them and
           every export was unclickable. Measured, not guessed: the STL button
           sits at y 835-863, the strip at y 814-871, and
           document.elementFromPoint() at the button centre returned the
           timeline <ol>.

           Fixed by ending the VIEW above the strip rather than by moving the
           runner's bar. The runner is shared with the docs pages and the
           lessons, where there is no timeline to dodge, so its layout is not
           this host's to bend.

           THIS COMMENT USED TO CLAIM padding-bottom ALSO kept the handle
           overlay in step, on the theory that .handle-layer's inset:0 on
           this same box would shrink along with the render surface. Measured
           directly and it does not: inset:0 on an absolutely positioned
           element resolves against the containing block's PADDING edge, not
           its content edge, so the padding that correctly shrinks the
           FLEX-SIZED render surface (a real content-box citizen) leaves
           .handle-layer standing the full, unshrunk padding-box height --
           TIMELINE_HEIGHT_PX taller than the thing it is meant to overlay
           exactly. Confirmed on BOTH the JSCAD iframe and the B-rep canvas,
           same gap, same cause -- not an engine-specific bug. HandleOverlay's
           own bottomInset prop is the actual fix; this rule now only owns
           the render surface's own reservation. */
        .sandbox-shell.is-build .reshape-pane-view { padding-bottom: ${TIMELINE_HEIGHT_PX}px; }
        .sandbox-shell.is-build .sandbox-timeline .model-timeline {
          flex: 1 1 auto;
          min-width: 0;
        }
        /* In Build the model is live -- every structural change reloads the
           frame and every dimension change rebuilds it by message -- so Run
           and Stop have nothing to do, and a green Run button is the one
           thing that reads "web app" instead of "CAD ribbon". */
        .sandbox-shell.is-build .btn-run,
        .sandbox-shell.is-build .run-hint { display: none; }
        /* Stop is the same story: in Build isRunning is true from the first
           structural change on, so the red button would sit there forever
           with nothing to stop. */
        .sandbox-shell.is-build .sandbox-toolbar .btn-secondary { display: none; }
        /* The program-type tabs (JavaScript / moSHion / reSHape) are the
           strongest "tab bar" cue there is; Onshape has no mode tabs. In
           Build they hide -- the Code/Build toggle stays, and switching
           program type happens from Code mode. */
        .sandbox-shell.is-build .sandbox-toolbar > .sandbox-modes:first-child { display: none; }
        /* The mode pills drop their chrome to read as flat ribbon buttons. */
        .sandbox-shell.is-build .sandbox-modes { border: 0; background: transparent; }
        .sandbox-shell.is-build .sandbox-mode { border-right: 0; color: #d3d5e3; }
        .sandbox-shell.is-build .sandbox-mode.is-active { background: #44475a; color: #f8f8f2; }
        .sandbox-shell.is-build .sandbox-mode:hover { color: #f8f8f2; }
        .sandbox-shell.is-build .sandbox-lock { margin-right: 10px; }
        /* Reset and Full screen lose their chip borders, Onshape-ribbon style. */
        .sandbox-shell.is-build .sandbox-toolbar button[style] {
          border: 0 !important;
          color: #d3d5e3;
        }
        .sandbox-shell.is-build .sandbox-split { height: auto; flex: 1 1 auto; min-height: 0; }
        .sandbox-shell.is-build #editorPane {
          position: absolute;
          left: 12px;
          top: 48px;
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
        /* The rail is all that is left: shrink the card to it so the canvas
           owns the rest of the screen. */
        .sandbox-shell.is-build.is-tools-hidden #editorPane {
          width: 46px;
          box-shadow: none;
          background: rgba(40, 42, 54, 0.72);
        }
        /* The feature list lives in the bottom timeline, so a card with no
           note and no sketch rules is empty -- collapse it to the rail on
           its own rather than leaving a click-eater over the canvas. */
        .sandbox-shell.is-build.is-card-empty #editorPane {
          width: 46px;
          box-shadow: none;
          background: rgba(40, 42, 54, 0.72);
        }
        /* The empty preview frame never shows in Build; the header, the
           divider and the empty-screen copy all sit on top of it anyway. */
        .sandbox-shell.is-build #previewPane { flex: 1 1 100% !important; }
        .sandbox-shell.is-build .divider { display: none; }
        .sandbox-shell.is-build .reshape-pane-params {
          flex: 0 0 208px;
          /* The toolbar floats at top:0 (48px), over the canvas. The panel
             must clear that same band -- the identical offset #editorPane
             uses. align-items: stretch shrinks the panel from the top. */
          margin-top: 48px;
        }
        /* The toolbar floats over the preview, so the preview owns the whole
           window and the two read as one space. */
        .sandbox-shell.is-build .sandbox-split { border: 0; box-shadow: none; }
        /* Onshape's panels sit on the same surface as the canvas; the card
           and the Dimensions panel wear the canvas colour too, so the whole
           window is one surface with floating panels on it. */
        .sandbox-shell.is-build #editorPane {
          background: #36333a;
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }
        .sandbox-shell.is-build .reshape-pane-params {
          background: #36333a;
          border-left: 1px solid #44475a;
        }
        /* The tools bar is portaled into the ribbon, so the card is just the
           feature list now. */
        .sandbox-shell.is-build #editorPane .model-tools { display: none; }
        .sandbox-shell.is-build.is-tools-hidden .sandbox-ribbon .model-tools { display: none; }
        /* Full screen's own #editorPane rule (top:12px) would otherwise win
           on equal specificity and slide the card under the floating bar. */
        .sandbox-shell.is-full.is-build #editorPane { top: 48px; }

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
