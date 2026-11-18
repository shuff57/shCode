'use client';
// SolidCraft CAD with the design as code, in reSHape Script: SolidCraft on the right, the
// project's files on the left. Run joins the files into one script and builds it through the
// guarded host page (vendor/solidcraft-preview: reSHape's interpreter in an opaque frame, the
// translator and its guards), so a step the engine cannot build correctly is refused in a
// sentence beside what did build. "SolidCraft tools" shows or hides SolidCraft's own menus
// and panels; the view stays either way. Faces and the three planes are labelled in the view
// ("Labels"); a click on a face, an edge or a plane label writes its name into the code, into
// the brackets of sketch(), fillet() and the like when the cursor is there.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { EditorView } from '@codemirror/view';
import CodeMirrorPane from './CodeMirrorPane';
import CadFiles from './CadFiles';
import styles from './solidcraft-sandbox.module.css';
import { CAD_ENTRY, bundleProject, codeFiles, describeAt, locate, readEdgeNameProbe, readVariableProbe, stepLines, withEdgeNameProbe, withVariableProbe, type CadError, type SourceSection } from '../lib/solidcraft-code';
import { cadLineMarks } from '../lib/cad-line-marks';
import CadSketchOverlay from './CadSketchOverlay';
import { installRuntimeCache } from '../lib/solidcraft-runtime-cache';

// The engine and kernel kept by this page, so the credentialless host frame does not download 175 MB on every visit (?cache=parent).
if (typeof window !== 'undefined') installRuntimeCache(window);
import { edgeLabels, labelFaces, type ScEdge, type ScFace } from '../lib/solidcraft-labels';
import { setCadModel, type CadModelBody, type CadTarget } from '../lib/cad-completions';
import { insertion, fillingCall, pickText, sketchPlaneOf, topLevelNames, topLevelVariables, type Pick, type PickCode } from '../lib/solidcraft-picks';
import { featuresCode, type TimelineFeature } from '../lib/solidcraft-ui-to-code';
import { cadToolbarCrop } from '../lib/solidcraft-viewport';
import { checkSolidCraftAvailability } from '../lib/solidcraft-availability';

type Api = { request(method: string, params?: object): Promise<any>; execute(command: string, params?: object): Promise<any> };
type Label = { key: string; text: string; pick: PickCode; x: number; y: number; plane?: boolean };
type Feature = { id: string; kind: string; status: string; refusal: string | null; note?: string | null };
type Summary = { error?: string; cancelled?: boolean; features?: Feature[]; warnings?: string[]; interpreterWarnings?: string[]; engineUse?: { runs: number; fromMemory: number; fromEarlierRuns?: number } | null };
type Host = {
  confirmReplace: (() => boolean) | null;
  evaluate(source: string): Promise<{ errors: { message: string; line?: number | null }[]; doc?: { features?: { id?: unknown }[] } | null }>;
  setScript(code: string, locations?: SourceSection[]): void;
  runUnconfirmed(): Promise<Summary | null>;
  checkNames?(names: { name: unknown; want: 'edge' | 'face'; target: string }[]): Promise<{ known: boolean; ok?: boolean }[]>;
};
type ScWindow = Window & { solidcraft?: Api };
type HostWindow = Window & { __host?: Host };
type Vars = { bodies: Map<string, string>; sketches: Map<string, string> };
/** A refused step's sentence, and the file and line that made it once that is known. */
type Refusal = { id: string; text: string; at?: { file: string; line: number } };
const pause = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const frames = () => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const messageOf = (e: unknown, fallback: string) => e instanceof Error ? e.message : e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : fallback;
const noVars = (): Vars => ({ bodies: new Map(), sketches: new Map() });
const bodyNames = (doc: { bodies?: ({ name?: string } | string)[] }): string[] => (doc.bodies ?? []).map(b => typeof b === 'string' ? b : b.name).filter((n): n is string => !!n);
/** The host's sentence without its log prefix (REFUSED BEFORE BUILD:, ERROR:). */
const plain = (s: string) => s.replace(/^(?:REFUSED BEFORE BUILD|ERROR|SCRIPT ERROR(?: \([^)]*\))?):\s*/, '');
// The host page's own panel is hidden; the page shows its results instead (public/solidcraft-preview.css).
// keep=on: the host remembers the engine's replies from one Run to the next, so a Run after a change asks the engine only for what changed;
// inc=on: and runs those steps on top of what SolidCraft already holds, when it holds exactly the steps before them (vendor pane.js memoForRun);
// embed=code: this page asks before replacing hand-made changes and shows the results, so the host skips the inspections only its own panel needs;
// probeinc=on: the time-budget probe keeps its engine between probes and runs only new commands (needs the session kernel; without it, as before).
// cache=parent: the engine (101 MB) and the kernel (74 MB) come from this page's Cache Storage after the first visit (lib/solidcraft-runtime-cache.ts).
const HOST_PAGE = '/solidcraft-preview/host.html?storage=off&keep=on&inc=on&embed=code&probeinc=on&cache=parent';

interface Props {
  lessonId: string;
  files: Record<string, string>;
  toolsAllowed: boolean;
  policyLoaded: boolean;
  policyReason: string;
  onFileChange(path: string, text: string): void;
  onFileRemove(path: string): void;
  onFileRename(from: string, to: string): void;
  onSelectSource(path: string): void;
  onBeforeBuild(label?: string): boolean;
}

export default function SolidCraftCodeStudio(props: Props) {
  const latest = useRef(props); latest.current = props;
  const frame = useRef<HTMLIFrameElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const host = useRef<Host | null>(null);
  const scWindow = useRef<Window | null>(null);
  const builtRevision = useRef<string | null>(null);
  const builtCode = useRef<string | null>(null);
  /** The files as the last Run saw them, built or not: "Code changed" means changed since then. */
  const ranCode = useRef<string | null>(null);
  const running = useRef(false);
  const vars = useRef<Vars>(noVars());
  const [available, setAvailable] = useState<boolean | null>(null);
  const [isolated, setIsolated] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  /** bumps when SolidCraft's frame loaded again (a new API) */
  const [scGen, setScGen] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Loading SolidCraft…');
  const [error, setError] = useState<CadError | null>(null);
  const [refusals, setRefusals] = useState<Refusal[]>([]);
  const runSeq = useRef(0);
  /** The joined script of the last Run that built, for asking reSHape about the edges on screen. */
  const builtSource = useRef<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [toolsOn, setToolsOn] = useState(true);
  const [crop, setCrop] = useState(0);
  const [width, setWidth] = useState(38);
  const [active, setActive] = useState(CAD_ENTRY);
  const [labelsOn, setLabelsOn] = useState(true);
  // Points: the [x, y] under the pointer on the sketch at the cursor. Live sketch: the cursor in a sketch's lines turns the view to its
  // plane, with a snap grid and sketch tools (components/CadSketchOverlay.tsx).
  const [pointsOn, setPointsOn] = useState(false);
  const [liveOn, setLiveOn] = useState(true);
  const [sketchMode, setSketchMode] = useState<string | null>(null);
  const [sketchBarHost, setSketchBarHost] = useState<HTMLSpanElement | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [picked, setPicked] = useState<PickCode | null>(null);
  const [filled, setFilled] = useState('');
  const editor = useRef<EditorView | null>(null);
  const facesCache = useRef(new Map<string, Promise<{ faces: ScFace[]; edges: ScEdge[] }>>());
  const cacheRevision = useRef('');
  const files = codeFiles(props.files);
  const current = files.includes(active) ? active : CAD_ENTRY;
  const code = JSON.stringify(files.map(f => [f, props.files[f]]));

  useEffect(() => { setIsolated('credentialless' in HTMLIFrameElement.prototype); }, []);
  useEffect(() => { props.onSelectSource(current); }, [props.lessonId, current]);
  useEffect(() => {
    const a = new AbortController();
    checkSolidCraftAvailability(a.signal).then(() => { if (!a.signal.aborted) setAvailable(true); })
      .catch(e => { if (!a.signal.aborted) { setStatus(messageOf(e, 'The SolidCraft files could not be loaded.')); setAvailable(false); } });
    return () => a.abort();
  }, []);

  // The host page starts in the frame: its pane (hidden) runs and guards the builds, and SolidCraft sits in its #sc frame.
  useEffect(() => {
    if (!available || !isolated || !frame.current) return;
    let live = true; const started = Date.now();
    void (async () => {
      try {
        let h: Host | undefined; let inner: ScWindow | null = null;
        for (;;) {
          const doc = frame.current?.contentDocument;
          if (doc?.head && !doc.getElementById('shcode-preview-style')) {
            doc.documentElement.classList.add('shcode-code-studio');
            const link = doc.createElement('link'); link.id = 'shcode-preview-style'; link.rel = 'stylesheet'; link.href = '/solidcraft-preview.css'; doc.head.append(link);
          }
          h = (frame.current?.contentWindow as HostWindow | null)?.__host;
          inner = (doc?.getElementById('sc') as HTMLIFrameElement | null)?.contentWindow as ScWindow | null;
          if (h && inner?.solidcraft && doc?.getElementById('status')?.textContent === 'ready') break;
          if (!live) return;
          if (Date.now() - started > 150000) throw new Error('SolidCraft did not finish loading. Reload this page to try again.');
          await pause(200);
        }
        // The page asks before replacing hand-made changes (run below); the pane does not ask again.
        h.confirmReplace = () => true;
        host.current = h; api.current = inner!.solidcraft!; scWindow.current = inner;
        await api.current.request('ui.home', { open: false });
        // A teacher who turns tools off also turns off SolidCraft's keyboard shortcuts and menus.
        const block = (e: Event) => { if (!latest.current.toolsAllowed) { e.preventDefault(); e.stopImmediatePropagation(); } };
        for (const t of ['keydown', 'keyup', 'keypress', 'contextmenu']) inner!.addEventListener(t, block, true);
        // SolidCraft's frame can load again: the host's crash guard reloads it after the engine stops. Its API is then a new one, and the
        // design it holds is not the one this page remembers, so the page takes the new API, forgets what it built, and builds the code again
        // (unless a Run is going on, which remembers it when it ends).
        const scEl = frame.current?.contentDocument?.getElementById('sc') as HTMLIFrameElement | null;
        scEl?.addEventListener('load', () => void (async () => {
          const t0 = Date.now();
          for (;;) {
            const w = scEl.contentWindow as ScWindow | null;
            // ready when it answers: a request made while its engine is still starting is never answered
            // (the frame's window object stays the same across a reload; its solidcraft API is a new one)
            const answers = w?.solidcraft && w.solidcraft !== api.current
              ? await Promise.race([w.solidcraft.request('document.revision', {}).then(() => true, () => false), pause(1000).then(() => false)]) : false;
            if (answers && w?.solidcraft) {
              api.current = w.solidcraft; scWindow.current = w;
              for (const t of ['keydown', 'keyup', 'keypress', 'contextmenu']) w.addEventListener(t, block, true);
              baseline.current = null; builtRevision.current = null; facesCache.current.clear();
              try { await w.solidcraft.request('ui.home', { open: false }); } catch { /* the view is still starting */ }
              setScGen(g => g + 1);
              if (!running.current) void runRef.current?.(true);
              return;
            }
            if (!live || Date.now() - t0 > 150000) return;
            await pause(200);
          }
        })());
        if (live) { setReady(true); setStatus('Ready'); }
      } catch (e) { if (live) setStatus(messageOf(e, 'SolidCraft did not finish loading.')); }
    })();
    return () => { live = false; api.current = null; host.current = null; setReady(false); };
  }, [available, isolated]);

  // Tools on: SolidCraft as on the web. Off: its menus, ribbon and panels are hidden and only the view is left.
  const applyTools = useCallback(async () => {
    const sc = api.current; if (!sc) return;
    const on = toolsOn && latest.current.toolsAllowed;
    await sc.request('ui.set', on ? { layout: 'floating', showBrowser: true, showTimeline: true, showNavigationBar: true } : { layout: 'compact', showBrowser: false, showTimeline: false, showNavigationBar: false });
    if (on) { setCrop(0); return; }
    setCrop(0); await frames();
    const reply = await sc.request('ui.inspect', {});
    const f = frame.current; if (!f) return;
    setCrop(cadToolbarCrop(reply.viewport, f.clientWidth, f.clientHeight));
  }, [toolsOn]);
  useEffect(() => { if (ready) void applyTools().catch(e => setStatus(messageOf(e, 'SolidCraft’s tools could not be switched.'))); }, [ready, applyTools, props.toolsAllowed, scGen]);

  const fit = useCallback(async () => { try { await api.current?.request('ui.camera', { fit: true }); } catch { /* the view keeps its camera */ } }, []);

  // ---- what SolidCraft's own tools make, written into script.js -------------------------------------------
  // After every build the design as the code made it is remembered: its timeline, revision and the
  // faces and edges of each body. A feature made later with SolidCraft's tools is written as code
  // (solidcraft-ui-to-code.ts), added to the end of script.js, and the part is rebuilt from the
  // code through the guarded path and compared with what the tools made.
  const baseline = useRef<{ ids: Set<number>; revision: string; geometry: Map<string, { faces: ScFace[]; edges: ScEdge[] }>; boxes: Map<string, { min: number[]; max: number[] }> } | null>(null);
  // A sketch made with the tools is written as code but kept on screen as SolidCraft made it (the guarded path draws a sketch only
  // once a step uses it), so the next tool can use it: its timeline id → the variable written for it. A Run starts afresh.
  const toolSketches = useRef(new Map<number, { name: string; flip: boolean }>());
  const [toolNote, setToolNote] = useState<{ text: string; undo?: number; warn?: boolean } | null>(null);
  async function rememberBaseline(sc: Api, revision: string) {
    if (baseline.current?.revision === revision) return; // the design is the one already remembered
    const doc = await sc.request('document.inspect', { measure: true });
    const names = bodyNames(doc);
    const read = await Promise.all(names.map(name => geometry(name))); // the same reads the labels and the lists use (one cache, keyed by revision)
    // Each body's measured box: a turn written as code pivots on its centre, and a hole's at: is measured from it.
    const boxes = new Map<string, { min: number[]; max: number[] }>();
    for (const b of (doc.bodies ?? []) as { name?: string; bbox?: { min: number[]; max: number[] } }[]) if (b?.name && b.bbox) boxes.set(b.name, b.bbox);
    baseline.current = { ids: new Set((doc.timeline ?? []).map((f: { id: number }) => f.id)), revision, geometry: new Map(names.map((n, i) => [n, read[i]])), boxes };
  }
  const run = useCallback(async (automatic = false, override?: Record<string, string>): Promise<boolean> => {
    const sc = api.current; const h = host.current;
    if (!sc || !h || running.current) return false;
    running.current = true; setBusy(true); setError(null);
    const snapshot = override ?? latest.current.files; const source = JSON.stringify(codeFiles(snapshot).map(f => [f, snapshot[f]]));
    ranCode.current = source; toolSketches.current.clear(); const seq = ++runSeq.current; builtSource.current = null;
    const mark = (name: string, from: number) => { try { performance.measure(`cad:${name}`, { start: from, end: performance.now() }); } catch { /* no timing */ } };
    const tRun = performance.now();
    try {
      const bundle = bundleProject(snapshot);
      if (bundle.errors.length) { setError(bundle.errors[0]); setStatus('Your files do not fit together yet. Fix the line shown, then Run.'); return false; }
      setStatus('Running your code…');
      // One run in the opaque runner, nothing built: the script with one line added at its end that stops it with which variable holds which
      // part. A script that stops before that line stops with its own error, at its own line.
      const ran = await h.evaluate(withVariableProbe(bundle.source, topLevelVariables(snapshot[CAD_ENTRY] ?? '')));
      const found = readVariableProbe(ran.errors); mark('evaluate', tRun);
      if (!found) {
        const e = ran.errors[0] ?? { message: 'Your code did not run to its end.', line: null }; const at = locate(e.line, bundle.locations);
        setError({ file: at?.file, line: at?.line, message: e.message }); setStatus('Your code stopped before building. Fix the line shown, then Run.'); return false;
      }
      const revision = JSON.stringify(await sc.request('document.revision', {}));
      if (!automatic && builtRevision.current !== null && revision !== builtRevision.current
        && !window.confirm('Run rebuilds the model from your code. Changes made with SolidCraft’s tools since the last Run are not in your code, so they will be replaced. Continue?')) { setStatus('Run cancelled. The model on screen is kept.'); return false; }
      setStatus('Building in SolidCraft…');
      h.setScript(bundle.source, bundle.locations);
      // The host's own progress line ("building step 4 of 9: hole1 ...", the owner's words) is shown here while it builds; its panel is hidden.
      const line = frame.current?.contentDocument?.getElementById('status');
      const follow = line ? new MutationObserver(() => { const t = line.textContent ?? ''; if (/^(building|checking) step /.test(t)) setStatus(t); }) : null;
      follow?.observe(line!, { childList: true, characterData: true, subtree: true });
      const t0 = performance.now();
      const summary = await h.runUnconfirmed().finally(() => follow?.disconnect());
      const took = `${((performance.now() - t0) / 1000).toFixed(1)} s`; mark('host build', t0); const tAfter = performance.now();
      vars.current = found; setLabelsKey(k => k + 1);
      // the host's crash guard may have loaded SolidCraft again during the build: the API from now on is the current one
      const scNow = api.current ?? sc;
      builtRevision.current = JSON.stringify(await scNow.request('document.revision', {}));
      builtCode.current = source;
      await rememberBaseline(scNow, builtRevision.current); mark('after build', tAfter);
      if (!summary || summary.cancelled) { setRefusals([]); setNotes([]); setStatus('The build did not finish. Run again.'); return false; }
      if (summary.error) { setRefusals([]); setNotes([]); setError({ message: plain(summary.error) }); setStatus('Nothing was built.'); return false; }
      builtSource.current = bundle.source;
      const steps = (summary.features ?? []).filter(f => f.status === 'built' || f.status === 'refused');
      const refused = steps.filter(f => f.status === 'refused');
      setRefusals(refused.map(f => ({ id: f.id, text: f.refusal || `${f.id} was not built.` })));
      // Which line made each refused step: found by evaluating the script cut short (nothing is built), after the status is shown.
      if (refused.length) void stepLines(bundle.source, bundle.locations, refused.map(f => f.id), src => h.evaluate(src)).then(lines => {
        if (seq === runSeq.current && lines.size) setRefusals(rs => rs.map(r => lines.has(r.id) ? { ...r, at: lines.get(r.id) } : r));
      }).catch(() => { /* the lines stay unknown; the sentences are shown */ });
      setNotes([...new Set([...(summary.warnings ?? []), ...(summary.interpreterWarnings ?? []), ...steps.map(f => f.note).filter((n): n is string => !!n)])]);
      // How much of the build was new: steps whose engine work was remembered from an earlier Run were not built again. (fromMemory alone also
      // counts a list asked twice in this Run, so the first Run after opening the page would say it; fromEarlierRuns counts only an earlier Run's.)
      const use = summary.engineUse; const earlier = use ? use.fromEarlierRuns ?? use.fromMemory : 0;
      const reused = use && earlier > 0 ? use.runs === 0 ? ', nothing new to build' : ', only the changed steps rebuilt' : '';
      setStatus(`${refused.length ? `Built ${steps.length - refused.length} of ${steps.length} steps` : `Built ${steps.length} step${steps.length === 1 ? '' : 's'}`} in ${took}${reused}.`);
      if (automatic && !override) await fit();
      return !refused.length;
    } catch (e) { setStatus(messageOf(e, 'The run did not finish.')); return false; }
    finally { running.current = false; setBusy(false); }
  }, [fit]);
  useEffect(() => { if (ready && builtCode.current === null) void run(true); }, [ready, run]);
  const runRef = useRef(run); runRef.current = run;

  function resize(clientX: number) { const r = workspace.current?.getBoundingClientRect(); if (r) setWidth(Math.max(25, Math.min(65, 100 * (clientX - r.left) / r.width))); }
  // ---- labels and picks ---------------------------------------------------------------------------
  const [labelsKey, setLabelsKey] = useState(0);
  // Faces and edges of a body, kept until the design changes (a Run, or SolidCraft's own tools).
  const geometry = useCallback(async (body: string) => {
    const sc = api.current!;
    const rev = JSON.stringify(await sc.request('document.revision', {}));
    if (cacheRevision.current !== rev) { facesCache.current.clear(); cacheRevision.current = rev; }
    const hit = facesCache.current.get(body); if (hit) return hit;
    // The promise is kept, so reads asked for at the same time (the labels, the lists, the baseline) share one reading.
    const g = Promise.all([sc.execute('model.faces', { body }), sc.execute('model.edges', { body })]).then(([f, e]) => ({ faces: f.faces ?? [], edges: e.edges ?? [] }));
    facesCache.current.set(body, g); g.catch(() => { if (facesCache.current.get(body) === g) facesCache.current.delete(body); });
    return g;
  }, []);
  /** Put a face, edge or plane into the code: into sketch()'s (fillet()'s…) brackets when the cursor is there, else at the cursor. */
  const insert = useCallback((pick: PickCode) => {
    const view = editor.current; if (!view) return;
    const edit = insertion(view.state.doc.toString(), view.state.selection.main.head, pick);
    if (!edit) { setFilled(pick.code || pick.sketch ? `${pick.name} does not go in these brackets.` : `${pick.name} has no name in reSHape Script.`); return; }
    view.dispatch({ changes: { from: edit.from, to: edit.to, insert: edit.insert }, selection: { anchor: edit.from + edit.insert.length } });
    view.focus(); setFilled(edit.filled ? `Filled in: ${edit.insert}` : `Inserted: ${edit.insert}`);
  }, []);
  // Labels: each body's labelled faces and the three planes, placed with SolidCraft's own projection
  // (ui.worldToScreen) and shown only where that face is what the view shows there (ui.pick).
  useEffect(() => {
    if (!ready || busy || !labelsOn || sketchMode) { setLabels([]); return; }
    let live = true; let camera = ''; let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      const sc = api.current; if (!sc || running.current) return;
      const cam = JSON.stringify(await sc.request('ui.camera', {})) + crop + JSON.stringify(await sc.request('document.revision', {})); if (cam === camera) return; camera = cam;
      const doc = await sc.request('document.inspect', { measure: true });
      const bodies = bodyNames(doc); const many = bodies.length > 1; const out: Label[] = [];
      // Each labelled face is tried at its centre, then at a point SolidCraft says is on it (a centre can fall in a hole).
      const spots: { label: Label; points: number[][]; body: string; face: number }[] = [];
      for (const body of bodies) {
        const { faces }: { faces: ScFace[] } = await geometry(body); const owner = vars.current.bodies.get(body);
        for (const [index, label] of labelFaces(faces)) {
          const f = faces.find((x: ScFace) => x.index === index)!;
          const pick: PickCode = { code: owner ? `${owner}.face('${label}')` : null, name: `${owner ?? 'this part'} · ${label} face`, sketch: sketchPlaneOf(f) ?? undefined };
          spots.push({ label: { key: `${body}:${index}`, text: many ? `${owner ?? body} · ${label}` : label, pick, x: 0, y: 0 }, points: [f.centroid, f.point], body, face: index });
        }
      }
      const tries = spots.flatMap(s => s.points);
      if (tries.length) {
        const screen: (number[] | null)[] = await sc.request('ui.worldToScreen', { points: tries });
        const dpr = scWindow.current?.devicePixelRatio || 1;
        const pick = await sc.request('ui.pick', { pixels: screen.map(p => Array.isArray(p) ? [p[0] * dpr, p[1] * dpr] : [-1, -1]), edges: false });
        let i = 0;
        for (const s of spots) {
          for (let k = 0; k < s.points.length; k++, i++) {
            const hit = pick.hits?.[i]; const p = screen[i];
            if (p && hit && hit.body === s.body && hit.face === s.face && !out.some(o => o.key === s.label.key)) out.push({ ...s.label, x: p[0], y: p[1] - crop });
          }
        }
      }
      // The planes: each label along its own plane's diagonal, a third of the model's size from the origin.
      const boxes: { min?: number[]; max?: number[] }[] = (doc.bodies ?? []).map((b: { bbox?: { min: number[]; max: number[] } }) => b?.bbox ?? {}).filter((b: { min?: number[] }) => Array.isArray(b.min));
      const size = boxes.length ? Math.max(...boxes.flatMap(b => b.max!.map((v, k) => Math.abs(v - b.min![k])))) : 30;
      const d = Math.max(10, size / 3);
      const planePoints: [string, string, number[]][] = [['top', 'XY', [d, d, 0]], ['front', 'XZ', [d, 0, d]], ['side', 'YZ', [0, d, d]]];
      const at: (number[] | null)[] = await sc.request('ui.worldToScreen', { points: planePoints.map(p => p[2]) });
      planePoints.forEach(([word, xy], k) => { const p = at[k]; if (Array.isArray(p)) out.push({ key: word, text: `${word} plane`, pick: { code: `'${word}'`, sketch: `'${word}'`, name: `the ${word} plane (${xy})` }, x: p[0], y: p[1] - crop, plane: true }); });
      if (live) setLabels(out);
    };
    const loop = async () => { try { await refresh(); } catch { /* the view is busy; try again */ } if (live) timer = setTimeout(loop, 400); };
    void loop();
    return () => { live = false; clearTimeout(timer); };
  }, [ready, busy, labelsOn, labelsKey, crop, geometry, sketchMode]);
  // The model as built, for the editor's list in the brackets of sketch(), part.edge(), fillet()…
  // (lib/cad-completions.ts). The element highlighted in the list is selected in the view.
  const previewing = useRef(0);
  useEffect(() => {
    if (!ready || busy) return;
    let live = true;
    void (async () => {
      try {
        const sc = api.current; if (!sc) return;
        const bodies: CadModelBody[] = [];
        for (const body of bodyNames(await sc.request('document.inspect', {}))) {
          const g = await geometry(body); const labels = labelFaces(g.faces);
          const edges = new Map<string, CadModelBody['edges'][number]>();
          for (const e of g.edges as ScEdge[]) {
            const ls = edgeLabels(g.faces, e); const key = ls ? ls.join('|') : `#${e.index}`;
            const had = edges.get(key); if (had) had.points.push(e.mid); else edges.set(key, { labels: ls, points: [e.mid] });
          }
          bodies.push({ body, owner: vars.current.bodies.get(body) ?? null, faces: g.faces.map((f: ScFace) => ({ label: labels.get(f.index) ?? null, point: f.point, sketch: sketchPlaneOf(f) })), edges: [...edges.values()] });
        }
        if (!live) return;
        const onHighlight = (target: CadTarget | null) => {
          const sc2 = api.current; if (!sc2 || running.current) return;
          const items = target?.body ? target.points.map(point => ({ type: target.type, body: target.body, point })) : [];
          previewing.current = items.length ? Date.now() + 1e9 : Date.now() + 900;
          void sc2.execute('select.set', { items }).catch(() => { /* the view is busy */ });
        };
        setCadModel({ bodies, onHighlight });
        // Then leave out of the lists the edges reSHape would refuse: reSHape's name for each labelled edge (one evaluation, nothing built), checked by
        // the host page's own resolver against the design the last Run built (pane.js checkNames: nothing is run). An edge it cannot answer for stays.
        const h = host.current; const source = builtSource.current;
        if (!h?.checkNames || !source || builtRevision.current !== JSON.stringify(await sc.request('document.revision', {}))) return;
        const cands = bodies.flatMap(b => b.owner ? b.edges.filter(e => e.labels).map(e => ({ owner: b.owner!, a: e.labels![0], b: e.labels![1], edge: e })) : []);
        if (!cands.length) return;
        const names = readEdgeNameProbe((await h.evaluate(withEdgeNameProbe(source, cands))).errors, cands.length);
        if (!names || !live) return;
        const asked = cands.map((c, i) => ({ c, n: names[i] })).filter(x => x.n);
        const answers = await h.checkNames(asked.map(x => ({ name: x.n!.name, want: 'edge' as const, target: x.n!.target })));
        if (!live || answers.length !== asked.length) return;
        let hidden = 0;
        for (const c of cands) if (!names[cands.indexOf(c)]) { c.edge.refused = true; hidden++; } // reSHape itself does not take these words for this part
        asked.forEach((x, i) => { if (answers[i].known && !answers[i].ok) { x.c.edge.refused = true; hidden++; } });
        if (hidden) setCadModel({ bodies, onHighlight });
      } catch { /* the model could not be read; the list offers the words only */ }
    })();
    return () => { live = false; };
  }, [ready, busy, labelsKey, geometry]);
  useEffect(() => () => setCadModel(null), []);
  // Picks: what is selected in the view, named in reSHape's words.
  useEffect(() => {
    if (!ready || busy) return;
    let live = true; let last = ''; let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      try {
        const sc = api.current; const sel = sc && !running.current ? (await sc.request('ui.selection', {})).selection : null;
        const first: Pick | undefined = Array.isArray(sel) ? sel.find((x: Pick) => x?.type === 'face' || x?.type === 'edge') : undefined;
        const key = first ? `${first.type}:${first.body}:${first.index}` : '';
        // A selection made by the editor's list (above) only shows the element; it does not fill the code. The list clears
        // it when it closes, so a pick made after that is still new to this loop.
        if (Date.now() < previewing.current) { if (live) timer = setTimeout(loop, 300); return; }
        if (key !== last) {
          last = key;
          if (!first) setPicked(null);
          else {
            const g = await geometry(first.body); const p = pickText(first, g.faces, g.edges, vars.current.bodies);
            if (live) { setPicked(p); const v = editor.current; if (v && fillingCall(v.state.doc.toString(), v.state.selection.main.head)) insert(p); }
          }
        }
      } catch { /* selection not readable while SolidCraft works */ }
      if (live) timer = setTimeout(loop, 300);
    };
    void loop();
    return () => { live = false; clearTimeout(timer); };
  }, [ready, busy, geometry, insert]);

  // Watch for features made with SolidCraft's tools; write them into script.js once SolidCraft is idle.
  useEffect(() => {
    if (!ready) return;
    let live = true; let seen = ''; let timer: ReturnType<typeof setTimeout>;
    const measureOf = async (sc: Api) => ((await sc.execute('inspect.measure', {})).bodies ?? []) as { volume_mm3?: number; bbox?: { min: number[]; max: number[] } }[];
    // Every flat face of every part by area and centre, and the curved faces' total area: a hole in the wrong place or a part turned the wrong way has
    // the volume and the box of the right one, but not its flat faces. Curved faces are compared by area only, because two builds of the same bore may
    // split its wall at a different seam (measured: the halves' centres 1e-3 apart). One body or several does not matter (SolidCraft's pattern makes
    // copies, reSHape one part of them).
    const facesOf = async (sc: Api) => {
      const flat: number[][] = []; let curved = 0;
      for (const name of bodyNames(await sc.request('document.inspect', {}))) for (const f of ((await sc.execute('model.faces', { body: name })).faces ?? []) as ScFace[]) {
        if (Array.isArray(f.plane_normal)) flat.push([f.area ?? NaN, ...f.centroid]); else curved += f.area ?? NaN;
      }
      return { flat: flat.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3]), curved };
    };
    const sameFaces = (a: { flat: number[][]; curved: number }, b: { flat: number[][]; curved: number }) =>
      Math.abs(a.curved - b.curved) <= 1e-6 * Math.max(1, a.curved)
      && a.flat.length === b.flat.length && a.flat.every((x, i) => x.every((v, k) => Math.abs(v - b.flat[i][k]) <= (k === 0 ? 1e-6 * Math.max(1, Math.abs(v)) : 1e-4)));
    const adopt = async (sc: Api, rev: string) => {
      const base = baseline.current!; const doc = await sc.request('document.inspect', {});
      const timeline: { id: number; name: string; type: string }[] = doc.timeline ?? [];
      const fresh = timeline.filter(f => !base.ids.has(f.id)); const gone = [...base.ids].filter(id => !timeline.some(f => f.id === id));
      base.revision = rev;
      if (!fresh.length || gone.length) { setToolNote({ text: gone.length ? 'A step was removed with SolidCraft’s tools. Your code still makes it: Run puts it back, or delete its line from your code.' : 'A step was changed with SolidCraft’s tools. Change it in your code instead: Run puts back what your code makes.', warn: true }); return; }
      const features: TimelineFeature[] = [];
      for (const f of fresh) {
        const sk = f.type === 'Sketch' ? await sc.execute('sketch.inspect', { sketch: f.id }) : null;
        const plane = sk?.plane;
        features.push({ id: f.id, name: f.name, type: f.type, definition: (await sc.execute('timeline.inspect', { feature: f.id })).definition ?? {}, curves: sk?.curves, frame: plane ? { origin: plane.origin, u: plane.x_dir, v: plane.y_dir } : undefined });
      }
      const files = latest.current.files; const entry = files[CAD_ENTRY] ?? '';
      // The guarded build names a sketch sk_<step>_<n> and a part b_<step>; the variable probe says which variable holds each step.
      const sketchVars = new Map<number, string>();
      for (const t of timeline) { const m = /^sk_(sk\d+)_\d+$/.exec(t.name); const v = m && vars.current.sketches.get(m[1]); if (v) sketchVars.set(t.id, v); }
      const flipped = new Map<string, boolean>();
      for (const [id, t] of toolSketches.current) { sketchVars.set(id, t.name); flipped.set(t.name, t.flip); }
      const ctx = { sketchVars, bodyVars: new Map(vars.current.bodies), taken: topLevelNames(entry), geometry: base.geometry, flipped, boxes: base.boxes };
      const written = featuresCode(features, ctx);
      if ('error' in written) { setToolNote({ text: `${written.error} It stays on screen until the next Run replaces it with what your code makes.`, undo: fresh.length, warn: true }); return; }
      const made = await measureOf(sc); const madeFaces = await facesOf(sc);
      if (!latest.current.onBeforeBuild('Before adding steps made with SolidCraft’s tools')) { setToolNote({ text: 'This computer could not keep a copy in History, so the steps were not added to your code.', warn: true }); return; }
      const next = `${entry.trimEnd()}\n\n// Made with SolidCraft’s tools: ${fresh.map(f => f.name).join(', ')}\n${written.lines.join('\n')}\n`;
      latest.current.onFileChange(CAD_ENTRY, next);
      if (fresh.every(f => f.type === 'Sketch')) {
        // Only sketches: nothing to build yet. The sketch stays as drawn, so the next tool can use it.
        for (const f of fresh) { const v = ctx.sketchVars.get(f.id); if (v) toolSketches.current.set(f.id, { name: v, flip: ctx.flipped.get(v) ?? false }); }
        for (const f of fresh) base.ids.add(f.id);
        const files2: Record<string, string> = { ...files, [CAD_ENTRY]: next }; ranCode.current = JSON.stringify(codeFiles(files2).map(f => [f, files2[f]]));
        setToolNote({ text: `Added to script.js: ${written.lines.length} line${written.lines.length === 1 ? '' : 's'} for ${fresh.map(f => f.name).join(', ')}. The part is rebuilt from the code when a step uses the sketch.` });
        return;
      }
      const ok = await run(true, { ...files, [CAD_ENTRY]: next });
      if (!ok) { setToolNote({ text: `The code written for ${fresh.map(f => f.name).join(', ')} did not build as it is. Check the new lines at the end of script.js and the message above; History has your code from before.`, warn: true }); return; }
      const rebuilt = await measureOf(sc);
      const vol = (m: typeof made) => m.reduce((n, b) => n + (b.volume_mm3 ?? 0), 0);
      const boxOf = (m: typeof made) => m.filter(b => b.bbox).map(b => b.bbox!).reduce<{ min: number[]; max: number[] } | null>((a, b) => a ? { min: a.min.map((v, i) => Math.min(v, b.min[i])), max: a.max.map((v, i) => Math.max(v, b.max[i])) } : b, null);
      const A = boxOf(made), B = boxOf(rebuilt);
      const same = Math.abs(vol(rebuilt) - vol(made)) <= 1e-6 * Math.max(1, vol(made)) && (!A || !B || (['min', 'max'] as const).every(k => A[k].every((v, j) => Math.abs(v - B[k][j]) < 1e-3)))
        && sameFaces(madeFaces, await facesOf(sc));
      setToolNote(same ? { text: `Added to script.js: ${written.lines.length} line${written.lines.length === 1 ? '' : 's'} for ${fresh.map(f => f.name).join(', ')}. The part built from the code is the one you made.` }
        : { text: `Added to script.js for ${fresh.map(f => f.name).join(', ')}, but the part built from the code is not quite the one you made (volume ${vol(rebuilt).toFixed(2)} against ${vol(made).toFixed(2)} mm³). Check the new lines; History has your code from before.`, warn: true });
    };
    const loop = async () => {
      try {
        const sc = api.current; const base = baseline.current;
        if (sc && base && !running.current) {
          const rev = JSON.stringify(await sc.request('document.revision', {}));
          if (rev !== base.revision && rev !== seen) {
            const ui = await sc.request('ui.inspect', {}); const doc = await sc.request('document.inspect', {});
            if (!ui.dialog && !ui.tool && doc.active_sketch == null && !running.current) { seen = rev; await adopt(sc, rev); }
          }
        }
      } catch { /* SolidCraft is busy; look again */ }
      if (live) timer = setTimeout(loop, 700);
    };
    void loop();
    return () => { live = false; clearTimeout(timer); };
  }, [ready, run]);
  const undoTools = async (n: number) => { const sc = api.current; if (!sc) return; for (let i = 0; i < n; i++) await sc.execute('edit.undo', {}); if (baseline.current) baseline.current.revision = JSON.stringify(await sc.request('document.revision', {})); setToolNote(null); };

  // A refusal's or an error's line: open its file, put the cursor on the line and show it.
  const pendingLine = useRef<{ file: string; line: number } | null>(null);
  const showLine = useCallback((view: EditorView, line: number) => {
    const l = view.state.doc.line(Math.max(1, Math.min(line, view.state.doc.lines)));
    view.dispatch({ selection: { anchor: l.from }, effects: EditorView.scrollIntoView(l.from, { y: 'center' }) }); view.focus();
  }, []);
  const goTo = (at: { file?: string; line?: number } | null | undefined) => {
    if (!at?.file) return;
    if (at.file === current && editor.current && at.line) { showLine(editor.current, at.line); return; }
    pendingLine.current = at.line ? { file: at.file, line: at.line } : null; setActive(at.file);
  };
  // The lines marked in the open file: each refused step's line and the error's, with the sentence as the tooltip.
  const marks = useMemo(() => cadLineMarks([
    ...refusals.filter(r => r.at?.file === current).map(r => ({ line: r.at!.line, text: r.text })),
    ...(error?.file === current && error.line ? [{ line: error.line, text: error.message }] : []),
  ]), [refusals, error, current]);

  const changed = ready && !busy && ranCode.current !== null && ranCode.current !== code;
  const where = describeAt(error);
  return <div className={styles.codeStudio}>
    <div className={styles.studioToolbar}>
      <span>{props.policyReason}</span>
      <div className={styles.actions}>
        {props.toolsAllowed && <label className={styles.toolsSwitch}><input type="checkbox" checked={toolsOn} disabled={!ready} onChange={e => setToolsOn(e.target.checked)} /> SolidCraft tools</label>}
        <label className={styles.toolsSwitch}><input type="checkbox" checked={labelsOn} disabled={!ready} onChange={e => setLabelsOn(e.target.checked)} /> Labels</label>
        <label className={styles.toolsSwitch} title="Show the [x, y] under the pointer on the plane of the sketch your cursor is in. Click to put the point in your code."><input type="checkbox" checked={pointsOn} disabled={!ready} onChange={e => setPointsOn(e.target.checked)} /> Points</label>
        <label className={styles.toolsSwitch} title="With your cursor in a sketch's lines, the view turns to its plane, with a grid and sketch tools."><input type="checkbox" checked={liveOn} disabled={!ready} onChange={e => setLiveOn(e.target.checked)} /> Live sketch</label>
        <button disabled={!ready || busy} onClick={() => void fit()}>Fit</button>
        <button className={styles.run} disabled={!ready || busy || !props.policyLoaded} onClick={() => void run()} title="Run (Ctrl+Enter)">{busy ? 'Building…' : 'Run'}</button>
      </div>
    </div>
    {error && <p role="alert" className={styles.codeError}>{where && <button className={styles.errorAt} onClick={() => goTo(error)}>{where}</button>}{error.message}</p>}
    {refusals.length > 0 && <div role="alert" className={styles.codeError} aria-label="Steps not built">{refusals.map((r, i) => <p key={i} className={styles.refusal}>{r.at && <button className={styles.errorAt} onClick={() => goTo(r.at)} title="Show this line">{describeAt(r.at)}</button>}{r.text}</p>)}</div>}
    <div className={styles.pickBar} aria-live="polite">
      <span ref={setSketchBarHost} className={styles.sketchBarHost} />
      {sketchMode ? null : picked ? <><span>Selected: <b>{picked.name}</b> {picked.code && <code>{picked.code}</code>}</span>{picked.code && <button onClick={() => insert(picked)}>Insert</button>}</>
        : pointsOn ? <span>Points: the pointer shows <code>[x, y]</code> on the sketch your cursor is in. Click to put the point at your cursor.</span>
        : <span>In <code>sketch()</code>, <code>fillet()</code> or <code>part.edge()</code>, choose from the list, or click a face, edge or plane label in the view.</span>}
      {filled && <span className={styles.pickNote}>{filled}</span>}
    </div>
    {toolNote && <p role={toolNote.warn ? 'alert' : 'status'} className={toolNote.warn ? styles.codeError : styles.toolNote}>{toolNote.text}{toolNote.undo ? <button className={styles.errorAt} onClick={() => void undoTools(toolNote.undo!)}>Undo in SolidCraft</button> : null}<button className={styles.errorAt} onClick={() => setToolNote(null)}>Close</button></p>}
    <div ref={workspace} className={styles.workspace} style={{ '--editor-width': `${width}%` } as CSSProperties}>
      <section className={styles.editor} aria-label="Code" onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); void run(); } }}>
        <CadFiles files={files} active={current} entry={CAD_ENTRY} disabled={busy}
          onOpen={setActive}
          onCreate={(path, text) => { latest.current.onFileChange(path, text); setActive(path); }}
          onRename={(from, to) => { latest.current.onFileRename(from, to); setActive(to); }}
          onRemove={path => { if (!latest.current.onBeforeBuild(`Before deleting ${path}`)) return 'This computer could not keep a copy in History, so the file was not deleted.'; latest.current.onFileRemove(path); setActive(CAD_ENTRY); return null; }} />
        <div className={styles.code}><CodeMirrorPane value={props.files[current] ?? ''} onChange={text => props.onFileChange(current, text)} fileKey={`${props.lessonId}:${current}`} collab={marks /* the slot for extensions switched without a remount */}
          onView={v => { editor.current = v; const p = pendingLine.current; if (v && p && p.file === current) { pendingLine.current = null; requestAnimationFrame(() => showLine(v, p.line)); } }} /></div>
        {notes.length > 0 && <pre className={styles.codeConsole} aria-label="Notes">{notes.join('\n')}</pre>}
      </section>
      <div className={styles.divider} role="separator" tabIndex={0} aria-label="Resize code editor" aria-orientation="vertical" aria-valuemin={25} aria-valuemax={65} aria-valuenow={Math.round(width)}
        onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setWidth(w => Math.max(25, Math.min(65, w + (e.key === 'ArrowLeft' ? -2 : 2)))); } }}
        onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) resize(e.clientX); }} onPointerUp={e => e.currentTarget.releasePointerCapture(e.pointerId)} />
      <section className={styles.preview} aria-label="SolidCraft">
        <div className={styles.panelTitle}><b>SolidCraft</b><span role="status">{changed ? 'Code changed · Run to rebuild' : status}</span></div>
        <div className={styles.scBox}>
          {available === false ? <p className={styles.missing}>{status}</p>
            : isolated === false ? <p className={styles.missing}>This CAD workspace needs isolated iframe storage, available in current Chrome or Edge. Your files are kept.</p>
            : available && isolated ? <iframe {...{ credentialless: '' }} ref={frame} src={HOST_PAGE} title="SolidCraft" style={{ top: -crop, height: `calc(100% + ${crop}px)` }} />
            : <p className={styles.missing}>Checking the CAD build…</p>}
          <CadSketchOverlay active={ready && !busy} sc={ready ? api.current : null} inner={ready ? scWindow.current : null} editor={editor}
            evaluate={ready && host.current ? host.current.evaluate : null} files={props.files} buildKey={labelsKey} crop={crop} geometry={geometry}
            pointsOn={pointsOn} liveOn={liveOn} toolbarHost={sketchBarHost} onInserted={setFilled} onMode={setSketchMode}
            entryOpen={current === CAD_ENTRY} bodyVars={() => vars.current.bodies} onRun={() => void run()}
            suppressPick={() => { previewing.current = Date.now() + 800; void api.current?.execute('select.set', { items: [] }).catch(() => { /* the view is busy */ }); }} />
          {labels.length > 0 && <div className={styles.scLabels}>{labels.map(l => <button key={l.key} className={l.plane ? styles.planeLabel : styles.faceLabel} style={{ left: l.x, top: l.y }} onClick={() => insert(l.pick)} title={l.pick.code ? `Put ${l.pick.code} in your code` : l.pick.name}>{l.text}</button>)}</div>}
          {available && isolated && (!ready || busy) && <div className={styles.scCover}>{ready ? 'Building your code…' : status}</div>}
        </div>
      </section>
    </div>
  </div>;
}
