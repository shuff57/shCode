'use client';
// Live sketching over SolidCraft's view, for the code-first CAD studio (SolidCraftCodeStudio).
//
// When the editor cursor is in a sketch's block (const lid = sketch(…) and the lid.…(…) lines right after it) and "Live sketch" is on, the studio
// is in sketch mode for that sketch, as SolidCraft is when a sketch is started on a face:
//   - the view turns to face the sketch's plane (its u to the right, its v up), and turns back when the cursor leaves;
//   - a snap grid is drawn on the face the sketch sits on (on the plane around the part when it sits on no face), its step following
//     the zoom, with the face's outline drawn over it;
//   - the sketch's own lines, circles and arcs are drawn as the code is typed (reSHape's document, re-evaluated in the opaque
//     runner; nothing is built);
//   - sketch tools (Line, Rectangle, Circle, Arc, Slot, Polyline) draw with snapped clicks and write the reSHape line at the end of the
//     sketch's block; a drawn point written as plain numbers can be dragged, and its numbers in the code change;
//   - Delete: a click on a drawn curve removes the line of the sketch's block that drew it (all of a rectangle's four sides go with it).
//     Which line drew which curve is found by evaluating the script cut short after each line of the block and counting the sketch's
//     curves (nothing is built), so a line written with variables is found too;
//   - after a tool's first click, a size can be typed (a line's length, a rectangle's width and height, a circle's radius, an arc's angle) and
//     Enter puts the point down at it, in the pointer's direction;
//   - Round: a click on a corner where two lines meet, then the radius (from the pointer, or typed): the two lines are shortened to where the
//     round meets them and an arc is written after them (a rectangle or polyline the corner belongs to is written out as its lines first);
//   - each line shows its length and each circle or arc its radius; clicking a size written as plain numbers lets a new one be typed, and the
//     code changes (a rectangle's width or height, a circle's radius, a line's end along it, with any corner it shares);
//   - Extrude and Pocket finish the sketch: they write the step after the sketch's block and Run.
// "New sketch" starts one on a flat face clicked in the view (or on the top, front or side plane): it writes const sk = sketch(…)
// at the end of script.js and goes into sketch mode on it.
// With "Points" on and no sketch mode, the pointer shows [x, y] on the top plane (or the sketch at the cursor) and a click writes it.
//
// SolidCraft has worldToScreen and no screen-to-world: four points of the plane projected by SolidCraft give the projective map
// between the plane and the screen (lib/sketch-plane-points.ts), both ways.
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { EditorView } from '@codemirror/view';
import styles from './solidcraft-sandbox.module.css';
import { bundleProject, CAD_ENTRY, readVariableProbe, withVariableProbe } from '../lib/solidcraft-code';
import { topLevelNames, topLevelVariables } from '../lib/solidcraft-picks';
import type { ScEdge, ScFace } from '../lib/solidcraft-labels';
import {
  activeSketch, applyProjective, arcCode, cornerAt, largestRound, lineCorners, roundEdits, roundGeom, curveOwners, dimensionOf, resizeEdits, distToSegment, sketchGeoms, slotGeoms, typedPoint, typedWords, distToPolyline, faceSketchArgs, sketchStatementLines, finishDirections, fmt, freshName, fromPlane, geomPath, geomSnaps, gridStep,
  movePointEdits, planeFrameOf, planeOutlines, planeWords, pointCode, pointInsertion, projective, sketchAtCursor, sketchBlockEnd, sweepOf,
  toPlane, toolCode, viewAngles, type PlaneFrame, type SketchGeom, type SketchPlaceInput, type V2, type V3,
} from '../lib/sketch-plane-points';

type Api = { request(method: string, params?: object): Promise<any>; execute(command: string, params?: object): Promise<any> };
type Evaluate = (source: string) => Promise<{ errors: { message: string; line?: number | null }[]; doc?: { features?: unknown[] } | null }>;
type Tool = 'line' | 'rectangle' | 'circle' | 'arc' | 'slot' | 'polyline' | 'round' | 'delete';
type Box = { min: number[]; max: number[] };
interface Sketch { id: string; place: SketchPlaceInput; frame: PlaneFrame; geoms: SketchGeom[] }
type DrawLine = { from: number; to: number; text: string };
interface Snap { s: V2; q: V2; kind: string; own: boolean }
interface Props {
  active: boolean;
  sc: Api | null;
  inner: Window | null;
  editor: RefObject<EditorView | null>;
  evaluate: Evaluate | null;
  files: Record<string, string>;
  /** the file the editor shows is script.js (a new sketch is written there) */
  entryOpen: boolean;
  /** body name (b_pull1) -> the script.js variable that holds it, as of the last Run */
  bodyVars(): Map<string, string>;
  /** bumps after every Run */
  buildKey: number;
  crop: number;
  geometry(body: string): Promise<{ faces: ScFace[]; edges: ScEdge[] }>;
  pointsOn: boolean;
  liveOn: boolean;
  toolbarHost: HTMLElement | null;
  onInserted(text: string): void;
  /** a click on the view also selects in SolidCraft; that is not a pick to fill in */
  suppressPick(): void;
  /** the sketch in sketch mode, '(new sketch)' while a face is being chosen, or null */
  onMode(name: string | null): void;
  onRun(): void;
}
const TOOLS: [Tool, string][] = [['line', 'Line'], ['rectangle', 'Rectangle'], ['circle', 'Circle'], ['arc', 'Arc'], ['slot', 'Slot'], ['polyline', 'Polyline'], ['round', 'Round'], ['delete', 'Delete']];
const TOP: SketchPlaceInput = { plane: 'xy', offset: 0 };
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const centreOf = (b: Box) => b.min.map((v, i) => (v + b.max[i]) / 2);
const pathOf = (loops: V2[][]) => loops.map(l => `M${l.map(q => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L')}Z`).join('');
/** reSHape's document of the code, as typed: the sketches by variable. Mid-edit code that does not run keeps the last that did. */
async function readSketches(ev: Evaluate, files: Record<string, string>): Promise<Map<string, Sketch> | null> {
  const b = bundleProject(files); if (b.errors.length) return null;
  const probe = readVariableProbe((await ev(withVariableProbe(b.source, topLevelVariables(files[CAD_ENTRY] ?? '')))).errors);
  const r = await ev(b.source); if (!probe || !r.doc) return null;
  const next = new Map<string, Sketch>();
  for (const f of (r.doc.features ?? []) as (SketchPlaceInput & { id?: unknown; kind?: unknown; geoms?: SketchGeom[]; points?: unknown; shape?: unknown })[]) {
    const v = f.kind === 'sketch' && typeof f.id === 'string' ? probe.sketches.get(f.id) : undefined;
    if (v) { const place = { plane: f.plane, offset: f.offset, frame: f.frame }; next.set(v, { id: f.id as string, place, frame: planeFrameOf(place), geoms: sketchGeoms(f) }); }
  }
  return next;
}

export default function CadSketchOverlay(p: Props) {
  const props = useRef(p); props.current = p;
  const clipId = `sketchclip${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const sketches = useRef(new Map<string, Sketch>());
  const [version, setVersion] = useState(0); // the sketches were read again
  const [mode, setMode] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [tool, setTool] = useState<Tool | null>(null);
  const [depth, setDepth] = useState('10');
  const [note, setNote] = useState('');
  const toolPts = useRef<V2[]>([]);
  /** a size typed after a tool's first click (Enter puts the point down at it) */
  const typed = useRef('');
  const [drawing, setDrawing] = useState<{ grid: [V2, V2, boolean][]; axes: [V2, V2][]; outline: string; clip: boolean; curves: V2[][]; step: number; dims: { i: number; at: V2; text: string; value: number }[] } | null>(null);
  /** a size being typed in place of a curve's dimension */
  const [editing, setEditing] = useState<{ i: number; value: string } | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; text: string; dot: V2 | null; preview: V2[] | null; del?: number[] } | null>(null);
  /** Delete: which line of the block drew each of the sketch's curves, for the doc as it was when worked out */
  const owners = useRef<{ doc: string; name: string; lines: DrawLine[]; owner: number[] | null } | null>(null);
  /** the sketch's curves on screen, as last drawn */
  const curvesOnScreen = useRef<V2[][]>([]);
  const view = useRef<{ F: number[]; H: number[]; frame: PlaneFrame; step: number; snaps: Snap[]; label: string } | null>(null);
  const savedCamera = useRef<Record<string, unknown> | null>(null);
  const modeRef = useRef<string | null>(null);

  // ---- the sketches, read again from reSHape's document when the code changes (debounced) and after a Run --------------------
  const filesKey = JSON.stringify(p.files);
  useEffect(() => {
    const ev = p.evaluate; if (!p.active || !ev) return;
    let live = true;
    const t = setTimeout(async () => {
      try { const next = await readSketches(ev, props.current.files); if (live && next) { sketches.current = next; setVersion(x => x + 1); } }
      catch { /* the runner is busy; the next change reads again */ }
    }, 450);
    return () => { live = false; clearTimeout(t); };
  }, [p.active, p.evaluate, filesKey, p.buildKey]);

  // ---- Delete: which line drew which curve, worked out again when the code or the sketch changes while the tool is on --------------
  useEffect(() => {
    const ev = p.evaluate; if (!p.active || !ev || !mode || !p.entryOpen) { owners.current = null; setOwnersKey(k => k + 1); return; }
    let live = true;
    const t = setTimeout(async () => {
      const ed = props.current.editor.current; const sk = sketches.current.get(mode); if (!ed || !sk) return;
      const doc = ed.state.doc.toString(); const lines = sketchStatementLines(doc, mode); const counts: number[] = [];
      try {
        for (const l of lines) {
          const b = bundleProject({ ...props.current.files, [CAD_ENTRY]: doc.slice(0, l.to) }); if (b.errors.length) { counts.push(NaN); continue; }
          const r = await ev(b.source); if (!live) return;
          const f = (r.doc?.features ?? []).find((x: any) => x && x.kind === 'sketch' && x.id === sk.id) as Parameters<typeof sketchGeoms>[0] | undefined;
          counts.push(f ? sketchGeoms(f).length : NaN);
        }
      } catch { counts.push(NaN); }
      if (live) { owners.current = { doc, name: mode, lines, owner: curveOwners(counts, sk.geoms.length) }; setOwnersKey(k => k + 1); refreshHover.current?.(); }
    }, 300);
    return () => { live = false; clearTimeout(t); };
  }, [p.active, p.evaluate, p.entryOpen, mode, version, filesKey]);
  const [ownersKey, setOwnersKey] = useState(0); // which line drew which curve was worked out again
  /** The edits that give curve i the size value, for the code as it is now; null when its size is not written as plain numbers. */
  const resizeOf = (i: number, value: number) => {
    const o = owners.current; const ed = p.editor.current; const sk = mode ? sketches.current.get(mode) : null;
    if (!o || !o.owner || !ed || !sk || o.name !== mode || o.doc !== ed.state.doc.toString()) return null;
    const line = o.lines[o.owner[i]]; const g = sk.geoms[i]; return line && g ? resizeEdits(o.doc, mode!, line, g, value) : null;
  };
  const applySize = () => {
    const e = editing; setEditing(null); if (!e) return;
    const v = Number(e.value); const edits = v > 0 ? resizeOf(e.i, v) : null; const ed = p.editor.current;
    if (!edits || !ed) return;
    ed.dispatch({ changes: edits }); p.onInserted(`Size changed to ${fmt(v)}`);
  };

  // ---- sketch mode follows the editor cursor -----------------------------------------------------------------------------------
  useEffect(() => {
    if (!p.active) return;
    const timer = setInterval(() => {
      const v = props.current.editor.current; if (!v) return;
      const name = props.current.liveOn ? sketchAtCursor(v.state.doc.toString(), v.state.selection.main.head, new Set(sketches.current.keys())) : null;
      if (name !== modeRef.current) { modeRef.current = name; setMode(name); if (name) setPicking(false); }
    }, 250);
    return () => clearInterval(timer);
  }, [p.active]);
  useEffect(() => { p.onMode(!p.active ? null : mode ?? (picking ? '(new sketch)' : null)); if (!mode) { setTool(null); toolPts.current = []; } }, [mode, picking, p.active]);
  useEffect(() => { setNote(''); }, [mode]);

  // The view turns to face the sketch when sketch mode starts, and back to where it was when it ends.
  useEffect(() => {
    const sc = p.sc; if (!sc || !p.active) return;
    let live = true;
    void (async () => {
      try {
        if (!mode) {
          const back = savedCamera.current; savedCamera.current = null;
          if (back) await sc.request('ui.camera', back);
          return;
        }
        const s = sketches.current.get(mode); if (!s) return;
        const cam = await sc.request('ui.camera', {});
        if (!savedCamera.current) savedCamera.current = { target: cam.target, yaw: cam.yaw, pitch: cam.pitch, roll: cam.roll, distance: cam.distance };
        const { yaw, pitch } = viewAngles(s.frame);
        // the camera looks at the point of the plane nearest where it looked before
        const t2 = toPlane(s.frame, cam.target); const target = fromPlane(s.frame, t2);
        await sc.request('ui.camera', { target, yaw, pitch, roll: 0 });
        const [o, u] = await sc.request('ui.worldToScreen', { points: [target, fromPlane(s.frame, [t2[0] + 10, t2[1]])] });
        if (live && Array.isArray(o) && Array.isArray(u)) await sc.request('ui.camera', { roll: -Math.atan2(u[1] - o[1], u[0] - o[0]) });
      } catch { /* the view keeps its camera */ }
    })();
    return () => { live = false; };
  }, [mode, p.active, p.sc]);

  // ---- the part: corners and centres to snap to, edges, faces and boxes; read after each Run, not on every keystroke -----------
  const shown = p.active && (!!mode || p.pointsOn || picking);
  const part = useRef<{ corners: { p: V3; kind: string }[]; edges: { a: V3; b: V3; mid: V3 }[]; faces: { body: string; face: ScFace }[]; boxes: Map<string, Box>; box: Box | null; n: number }>({ corners: [], edges: [], faces: [], boxes: new Map(), box: null, n: 0 });
  /** The readout again at the last pointer position, when the drawing changes under a still pointer. */
  const refreshHover = useRef<(() => void) | null>(null);
  useEffect(() => {
    const sc = p.sc; if (!shown || !sc) return;
    let live = true;
    void (async () => {
      try {
        let box: Box | null = null; const boxes = new Map<string, Box>();
        const doc = await sc.request('document.inspect', { measure: true });
        const corners: { p: V3; kind: string }[] = []; const edges: { a: V3; b: V3; mid: V3 }[] = []; const faces: { body: string; face: ScFace }[] = [];
        for (const b of (doc.bodies ?? []) as { name?: string; bbox?: Box }[]) {
          if (!b.name) continue;
          if (b.bbox) { boxes.set(b.name, b.bbox); box = box ? { min: box.min.map((v, i) => Math.min(v, b.bbox!.min[i])), max: box.max.map((v, i) => Math.max(v, b.bbox!.max[i])) } : b.bbox; }
          const g = await props.current.geometry(b.name);
          for (const e of g.edges) {
            if (!e.start || !e.end) continue;
            edges.push({ a: e.start as V3, b: e.end as V3, mid: e.mid as V3 });
            corners.push({ p: e.start as V3, kind: 'corner' }, { p: e.end as V3, kind: 'corner' });
            if (Math.hypot(e.end[0] - e.start[0], e.end[1] - e.start[1], e.end[2] - e.start[2]) > 1e-9) corners.push({ p: e.mid as V3, kind: 'middle of an edge' }); // not a whole circle's
          }
          for (const f of g.faces) { faces.push({ body: b.name, face: f }); if (Array.isArray(f.plane_normal)) corners.push({ p: f.centroid as V3, kind: 'centre of a face' }); }
        }
        if (live) part.current = { corners, edges, faces, boxes, box, n: part.current.n + 1 };
      } catch { /* no part to snap to */ }
    })();
    return () => { live = false; };
  }, [shown, p.sc, p.buildKey]);
  /** The part a sketch sits on: a body with a flat face on its plane, else the only body. */
  const bodyUnder = (f: PlaneFrame): { body: string | null; onFace: boolean } => {
    const s = sweepOf(f);
    for (const { body, face } of part.current.faces) {
      const n = face.plane_normal; if (!Array.isArray(n)) continue;
      const parallel = Math.abs(n[0] * s[0] + n[1] * s[1] + n[2] * s[2]) > 1 - 1e-6;
      const c = face.centroid; const off = (c[0] - f.origin[0]) * s[0] + (c[1] - f.origin[1]) * s[1] + (c[2] - f.origin[2]) * s[2];
      if (parallel && Math.abs(off) < 1e-5) return { body, onFace: true };
    }
    return { body: part.current.boxes.size === 1 ? [...part.current.boxes.keys()][0] : null, onFace: false };
  };

  // ---- the drawing: the grid on the face, the face's outline, the sketch's curves; kept up with the camera ----------------------
  useEffect(() => {
    const sc = p.sc; if (!shown || !sc) { setDrawing(null); view.current = null; return; }
    let live = true; let camKey = ''; let timer: ReturnType<typeof setTimeout>;
    const draw = async () => {
      const { corners, edges, box } = part.current;
      const name = modeRef.current; const s = name ? sketches.current.get(name) : null;
      const editorView = props.current.editor.current;
      const at = s ? null : editorView ? activeSketch(editorView.state.doc.toString(), editorView.state.selection.main.head, new Set(sketches.current.keys())) : null;
      const sk = s ?? (at ? sketches.current.get(at) ?? null : null);
      const f = sk ? sk.frame : planeFrameOf(TOP);
      const label = sk ? `${name ?? at} (${planeWords(sk.place)})` : 'top plane, no sketch at the cursor';
      const cam = JSON.stringify(await sc.request('ui.camera', {})) + label + version + part.current.n + props.current.crop;
      if (cam === camKey || !live) return; camKey = cam;
      // the region: the part's box dropped onto the plane, the sketch's own rows and the origin, with a margin
      const pts: V2[] = [[0, 0]];
      if (box) for (const x of [box.min[0], box.max[0]]) for (const y of [box.min[1], box.max[1]]) for (const z of [box.min[2], box.max[2]]) pts.push(toPlane(f, [x, y, z]));
      for (const g of sk?.geoms ?? []) pts.push(...geomPath(g, 8));
      const lo = [Math.min(...pts.map(q => q[0])), Math.min(...pts.map(q => q[1]))], hi = [Math.max(...pts.map(q => q[0])), Math.max(...pts.map(q => q[1]))];
      const pad = Math.max(10, 0.15 * Math.max(hi[0] - lo[0], hi[1] - lo[1]));
      const quad: V2[] = [[lo[0] - pad, lo[1] - pad], [hi[0] + pad, lo[1] - pad], [hi[0] + pad, hi[1] + pad], [lo[0] - pad, hi[1] + pad]];
      const screen: (number[] | null)[] = await sc.request('ui.worldToScreen', { points: [...quad.map(q => fromPlane(f, q)), ...corners.map(c => c.p)] });
      if (!live) return;
      const sq = screen.slice(0, 4);
      const F = sq.every(Array.isArray) ? projective(quad, sq.map(q => [q![0], q![1]] as V2)) : null;
      const H = sq.every(Array.isArray) ? projective(sq.map(q => [q![0], q![1]] as V2), quad) : null;
      if (!F || !H) { view.current = null; setDrawing(null); return; }
      const toScreen = (q: V2): V2 => { const r = applyProjective(F, q) ?? [NaN, NaN]; return [r[0], r[1] - props.current.crop]; };
      const o = applyProjective(F, [0, 0])!, one = applyProjective(F, [1, 0])!, oneV = applyProjective(F, [0, 1])!;
      let step = s ? gridStep(Math.min(dist(o, one), dist(o, oneV))) : 0.5;
      const snaps: Snap[] = [];
      corners.forEach((c, i) => { const p2 = screen[4 + i]; if (Array.isArray(p2)) snaps.push({ s: [p2[0], p2[1]], q: toPlane(f, c.p), kind: c.kind, own: false }); });
      for (const g of sk?.geoms ?? []) for (const n of geomSnaps(g)) { const sp = applyProjective(F, n.q); if (sp) snaps.push({ s: sp, q: n.q, kind: n.kind, own: !n.kind.startsWith('middle') }); }
      view.current = { F, H, frame: f, step, snaps, label }; refreshHover.current?.();
      if (!s) { curvesOnScreen.current = []; setDrawing({ grid: [], axes: [], outline: '', clip: false, curves: [], step, dims: [] }); return; }
      const [x0, y0, x1, y1] = [quad[0][0], quad[0][1], quad[2][0], quad[2][1]];
      while ((x1 - x0) / step > 120 || (y1 - y0) / step > 120) step *= 2;
      view.current.step = step; refreshHover.current?.();
      // the grid, every fifth line stronger, kept inside the face the sketch sits on when there is one
      const grid: [V2, V2, boolean][] = [];
      for (let k = Math.ceil(x0 / step); k * step <= x1; k++) grid.push([toScreen([k * step, y0]), toScreen([k * step, y1]), k % 5 === 0]);
      for (let k = Math.ceil(y0 / step); k * step <= y1; k++) grid.push([toScreen([x0, k * step]), toScreen([x1, k * step]), k % 5 === 0]);
      const axes: [V2, V2][] = [[toScreen([x0, 0]), toScreen([x1, 0])], [toScreen([0, y0]), toScreen([0, y1])]];
      const sw = sweepOf(f); const on = (q: number[]) => Math.abs((q[0] - f.origin[0]) * sw[0] + (q[1] - f.origin[1]) * sw[1] + (q[2] - f.origin[2]) * sw[2]) < 1e-5;
      const loops = planeOutlines(edges.filter(e => on(e.a) && on(e.b) && on(e.mid)).map(e => ({ a: toPlane(f, e.a), b: toPlane(f, e.b), mid: toPlane(f, e.mid) })));
      const outline = pathOf(loops.map(l => l.map(toScreen)));
      const curves = s.geoms.map(g => geomPath(g).map(toScreen)); curvesOnScreen.current = curves;
      const dims = s.geoms.flatMap((g, i) => { const d = dimensionOf(g); return d ? [{ i, at: toScreen(d.at), text: d.text, value: d.value }] : []; });
      setDrawing({ grid, axes, outline, clip: loops.length > 0, curves, step, dims });
    };
    const loop = async () => { try { await draw(); } catch { /* the view is busy */ } if (live) timer = setTimeout(loop, 150); };
    void loop();
    return () => { live = false; clearTimeout(timer); };
  }, [shown, p.sc, version, mode]);

  // ---- the pointer: the point under it, snapped; clicks draw with a tool, start a sketch on a face, or write the point; drags move a point
  useEffect(() => {
    const inner = p.inner; const sc = p.sc; if (!shown || !inner || !sc) { setHover(null); return; }
    let down: V2 | null = null; let last: { q: V2; x: number; y: number } | null = null; let at: V2 | null = null;
    let drag: { from: V2; to: V2 } | null = null; let swallowClick = false; typed.current = '';
    const pointAt = (x: number, y: number, skip?: V2) => {
      const v = view.current; if (!v) return null;
      let best: (Snap & { d: number }) | null = null;
      for (const c of v.snaps) { if (skip && dist(c.q, skip) < 1e-9) continue; const d = dist(c.s, [x, y]); if (d <= 10 && (!best || d < best.d)) best = { ...c, d }; }
      const free = applyProjective(v.H, [x, y]); if (!best && !free) return null;
      const q: V2 = best ? best.q : [Math.round(free![0] / v.step) * v.step, Math.round(free![1] / v.step) * v.step];
      const sp = best ? best.s : applyProjective(v.F, q);
      return { q, kind: best?.kind ?? (modeRef.current ? `grid ${fmt(v.step)} mm` : ''), own: !!best?.own, dot: sp ? [sp[0], sp[1] - props.current.crop] as V2 : null };
    };
    const onScreen = (r: V2) => { const v = view.current!; const s2 = applyProjective(v.F, r)!; return [s2[0], s2[1] - props.current.crop] as V2; };
    const preview = (q: V2): V2[] | null => {
      const v = view.current; const pts = toolPts.current; if (!v || !tool || !pts.length) return null;
      if (tool === 'line' || tool === 'polyline') return [...pts, q].map(onScreen);
      if (tool === 'rectangle') { const a = pts[0]; return ([[a[0], a[1]], [q[0], a[1]], [q[0], q[1]], [a[0], q[1]], [a[0], a[1]]] as V2[]).map(onScreen); }
      if (tool === 'slot') {
        if (pts.length === 1) return [pts[0], q].map(onScreen);
        const r = typed.current ? Number(typedNumbers0(typed.current)) : slotRadius(pts[0], pts[1], q);
        return slotGeoms(pts[0], pts[1], r).flatMap(g => geomPath(g, 32)).map(onScreen);
      }
      if (tool === 'arc') {
        if (pts.length === 1) return [pts[0], q].map(onScreen);
        const [c, a] = pts; const r = dist(a, c); const d = dist(q, c); if (d < 1e-9) return null;
        return geomPath({ k: 'arc', c, r, a, b: [c[0] + (q[0] - c[0]) * r / d, c[1] + (q[1] - c[1]) * r / d], sense: 'ccw' }).map(onScreen);
      }
      return geomPath({ k: 'circle', c: pts[0], r: dist(pts[0], q) }).map(onScreen);
    };
    const show = (x: number, y: number) => {
      if (picking) { last = null; setHover({ x, y: y - props.current.crop, text: 'Click a flat face for the new sketch', dot: null, preview: null }); return; }
      if (tool === 'delete') { last = null; const d = deleteAt(x, y); setHover(d ? { x, y: y - props.current.crop, text: d.text, dot: null, preview: null, del: d.curves } : null); return; }
      const hit = pointAt(x, y, drag?.from); if (!hit) { last = null; setHover(null); return; }
      last = { q: hit.q, x, y };
      const v = view.current!;
      if (drag) { drag.to = hit.q; setHover({ x, y: y - props.current.crop, text: `Move ${pointCode(drag.from)} to ${pointCode(hit.q)}${hit.kind ? ` · ${hit.kind}` : ''}`, dot: hit.dot, preview: null }); return; }
      if (tool === 'round') {
        const sy = y - props.current.crop; const geoms = sketchNow()?.geoms ?? [];
        if (!toolPts.current.length) {
          const q = cornerUnder(x, sy);
          if (!q) { setHover({ x, y: sy, text: 'Click a corner where two lines meet', dot: null, preview: null }); return; }
          const c = cornerAt(geoms, q);
          setHover({ x, y: sy, text: typeof c === 'string' ? c : `corner ${pointCode(q)} · click to round it`, dot: onScreen(q), preview: null }); return;
        }
        const q0 = toolPts.current[0]; const r = roundRadius(q0, hit.q); const g = r === null ? 'Only a corner where two lines meet can be rounded.' : roundGeom(geoms, q0, r);
        if (typeof g === 'string') { setHover({ x, y: sy, text: g, dot: onScreen(q0), preview: null }); return; }
        // the preview: from one line's far end, along it to the round, round it, and along the other line to its far end
        const far = g.lines.map(i => { const l = geoms[i] as { a: V2; b: V2 }; return dist(l.a, q0) < 1e-6 ? l.b : l.a; });
        const arc = geomPath(g.arc, 32); if (dist(g.arc.a, g.ends[0]) > 1e-6) arc.reverse();
        const path = [far[0], ...arc, far[1]];
        setHover({ x, y: sy, text: `radius ${typed.current || fmt(r!)} · ${typed.current ? 'Enter' : 'click'} to round the corner`, dot: onScreen(q0), preview: path.map(onScreen) }); return;
      }
      if (tool && typed.current && toolPts.current.length) {
        const tq = typedPoint(tool, toolPts.current, hit.q, typed.current);
        const words = typedWords(tool, toolPts.current, typed.current);
        setHover({ x, y: y - props.current.crop, text: tq ? `${words} · Enter to put it at ${pointCode(tq)}` : words, dot: tq ? onScreen(tq) : null, preview: preview(tq ?? hit.q) }); return;
      }
      const canDrag = !tool && hit.own && modeRef.current && editDrag(hit.q, hit.q).length;
      setHover({ x, y: y - props.current.crop, text: `${v.label}: ${pointCode(hit.q)}${hit.kind ? ` · ${hit.kind}` : ''}${canDrag ? ' · drag to move it' : ''}`, dot: hit.dot, preview: preview(hit.q) });
    };
    /** Delete: the curve under the pointer (within 8 px), the line that drew it and all the curves that line drew */
    const deleteAt = (x: number, y: number): { line: DrawLine | null; curves: number[]; text: string } | null => {
      const cs = curvesOnScreen.current; const sy = y - props.current.crop; let best = -1; let bd = 8;
      cs.forEach((c, i) => { const d = distToPolyline([x, sy], c); if (d <= bd) { bd = d; best = i; } });
      if (best < 0) return null;
      const o = owners.current; const ed = props.current.editor.current;
      const known = o && ed && o.owner && o.name === modeRef.current && o.doc === ed.state.doc.toString() ? o : null;
      if (!known) return { line: null, curves: [best], text: 'finding the line that drew it…' };
      const k = known.owner![best]; const line = known.lines[k];
      return { line, curves: known.owner!.flatMap((w, i) => w === k ? [i] : []), text: `${line.text} · click to remove it` };
    };
    // ---- Round: the corner under the pointer, the radius, and the code written
    const sketchNow = () => { const n = modeRef.current; return n ? sketches.current.get(n) ?? null : null; };
    /** the end of the sketch's lines within 10 px of the pointer, nearest first */
    const cornerUnder = (x: number, sy: number): V2 | null => {
      if (!view.current) return null; let best: V2 | null = null; let bd = 10;
      for (const q of lineCorners(sketchNow()?.geoms ?? [])) { const d = dist(onScreen(q), [x, sy]); if (d <= bd) { bd = d; best = q; } }
      return best;
    };
    /** the radius: typed, else from how far the pointer is from the corner (so at a right angle it is that distance), on the grid's step */
    const roundRadius = (q0: V2, pointer: V2): number | null => {
      if (typed.current) return Number(typed.current);
      const geoms = sketchNow()?.geoms ?? []; const c = cornerAt(geoms, q0); if (typeof c === 'string') return null;
      const step = view.current?.step ?? 0.5; const r = Math.max(step, Math.round(dist(pointer, q0) * Math.tan(c.half) / step) * step);
      const most = largestRound(geoms, q0); return most !== null && most > 0 && r > most ? most : r;
    };
    const doRound = (q0: V2, r: number) => {
      const ed = props.current.editor.current; const name = modeRef.current; const sk = sketchNow(); const o = owners.current;
      if (!ed || !name || !sk) return;
      const doc = ed.state.doc.toString();
      if (!o || !o.owner || o.name !== name || o.doc !== doc) { setNote('Still finding the lines that drew that corner; try again in a moment.'); return; }
      const res = roundEdits(doc, name, o.lines, o.owner, sk.geoms, q0, r);
      if (typeof res === 'string') { setNote(res); return; }
      ed.dispatch({ changes: res.edits }); owners.current = null; toolPts.current = []; typed.current = ''; setNote('');
      props.current.onInserted(`Rounded the corner at ${pointCode(q0)}: ${res.arcCode}`);
    };
    const editDrag = (from: V2, to: V2) => { const ed = props.current.editor.current; const name = modeRef.current; return ed && name ? movePointEdits(ed.state.doc.toString(), name, from, to) : []; };
    const write = (code: string) => {
      const ed = props.current.editor.current; const name = modeRef.current; if (!ed || !name) return;
      const doc = ed.state.doc.toString(); const end = sketchBlockEnd(doc, name);
      const pos = end ?? ed.state.selection.main.head; const text = `\n${code}`;
      ed.dispatch({ changes: { from: pos, insert: text }, selection: { anchor: pos + text.length }, scrollIntoView: true });
      props.current.onInserted(`Added: ${code}`);
    };
    const finishPolyline = (closed: boolean) => {
      const pts = toolPts.current; const name = modeRef.current;
      if (name && pts.length >= (closed ? 3 : 2)) write(toolCode.lines(name, pts, closed));
      toolPts.current = [];
    };
    const startOnFace = async (x: number, y: number) => {
      const dpr = inner.devicePixelRatio || 1;
      const r = await sc.request('ui.pick', { pixels: [[x * dpr, y * dpr]], edges: false });
      const h = r?.hits?.[0]; const f = h ? part.current.faces.find(q => q.body === h.body && q.face.index === h.face) : undefined;
      const args = f ? faceSketchArgs(f.face) : null;
      if (!args) { setNote(f ? 'That face is curved; a sketch needs a flat face.' : 'No face there. Click a flat face, or choose a plane.'); return; }
      newSketch(args);
    };
    const onMove = (e: PointerEvent) => { at = [e.clientX, e.clientY]; if (drag) { e.stopImmediatePropagation(); e.preventDefault(); } show(e.clientX, e.clientY); };
    const onLeave = () => { at = null; last = null; setHover(null); };
    refreshHover.current = () => { if (at) show(at[0], at[1]); };
    const onDown = (e: PointerEvent | MouseEvent) => {
      down = [e.clientX, e.clientY];
      // a drawn point written as plain numbers: dragging it moves it (the view does not turn)
      if (e.type !== 'pointerdown' && e.type !== 'mousedown') return;
      if (!tool && !picking && modeRef.current && last && e.button === 0) {
        const hit = pointAt(e.clientX, e.clientY);
        if (hit?.own && editDrag(hit.q, hit.q).length) { if (e.type === 'pointerdown') drag = { from: hit.q, to: hit.q }; e.stopImmediatePropagation(); e.preventDefault(); }
      }
    };
    const onUp = (e: PointerEvent | MouseEvent) => {
      if (!drag) return;
      e.stopImmediatePropagation(); e.preventDefault();
      if (e.type !== 'pointerup') return;
      const { from, to } = drag; drag = null; swallowClick = true;
      const edits = dist(from, to) > 1e-9 ? editDrag(from, to) : [];
      const ed = props.current.editor.current;
      if (ed && edits.length) { ed.dispatch({ changes: edits }); props.current.onInserted(`Moved ${pointCode(from)} to ${pointCode(to)}`); }
      show(e.clientX, e.clientY);
    };
    const onClick = (e: MouseEvent) => {
      if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (down && dist(down, [e.clientX, e.clientY]) > 4) return; // a drag turns the view; it draws nothing
      if (picking) { e.preventDefault(); e.stopImmediatePropagation(); props.current.suppressPick(); void startOnFace(e.clientX, e.clientY); return; }
      if (tool === 'delete') {
        const d = deleteAt(e.clientX, e.clientY); if (!d) return;
        e.preventDefault(); e.stopImmediatePropagation(); props.current.suppressPick();
        const ed = props.current.editor.current; if (!ed || !d.line) return;
        ed.dispatch({ changes: { from: d.line.from, to: d.line.to } }); owners.current = null; curvesOnScreen.current = [];
        props.current.onInserted(`Removed: ${d.line.text}`); setHover(null); return;
      }
      if (tool === 'round') {
        const sy = e.clientY - props.current.crop;
        if (!toolPts.current.length) {
          const q = cornerUnder(e.clientX, sy); if (!q) return;
          e.preventDefault(); e.stopImmediatePropagation(); props.current.suppressPick();
          if (typeof cornerAt(sketchNow()?.geoms ?? [], q) !== 'string') { toolPts.current = [q]; typed.current = ''; }
        } else {
          e.preventDefault(); e.stopImmediatePropagation(); props.current.suppressPick();
          const q0 = toolPts.current[0]; const r = roundRadius(q0, last?.q ?? q0); if (r !== null) doRound(q0, r);
        }
        show(e.clientX, e.clientY); return;
      }
      if (!last) return;
      e.preventDefault(); e.stopImmediatePropagation(); props.current.suppressPick();
      const q = last.q; const name = modeRef.current;
      if (!tool || !name) {
        const ed = props.current.editor.current; if (!ed) return;
        const head = ed.state.selection.main.head; const text = pointInsertion(ed.state.doc.toString(), head, q);
        ed.dispatch({ changes: { from: head, insert: text }, selection: { anchor: head + text.length } });
        props.current.onInserted(`Inserted: ${text.replace(/^, /, '')}`); return;
      }
      place(q);
      show(last.x, last.y);
    };
    /** A tool's next point: clicked, or put down by a typed size. */
    const place = (q: V2) => {
      const name = modeRef.current; if (!tool || !name) return;
      typed.current = '';
      const pts = toolPts.current;
      if (tool === 'polyline') {
        if (pts.length >= 3 && dist(q, pts[0]) < 1e-9) finishPolyline(true);
        else if (pts.length && dist(q, pts[pts.length - 1]) < 1e-9) finishPolyline(false); // the same point twice ends an open one
        else pts.push(q);
      } else if (tool === 'slot') {
        if (pts.length < 2) { if (!pts.length || dist(q, pts[pts.length - 1]) > 1e-9) pts.push(q); }
        else { const [a, b] = pts; toolPts.current = []; const r = typedRadius ?? slotRadius(a, b, q); if (r > 0) write(toolCode.slot(name, a, b, r)); }
      } else if (tool === 'arc') {
        if (pts.length < 2) { if (!pts.length || dist(q, pts[0]) > 1e-9) pts.push(q); }
        else { const code = arcCode(name, pts[0], pts[1], q); toolPts.current = []; if (code) write(code); }
      } else if (!pts.length) pts.push(q);
      else {
        const a = pts[0]; toolPts.current = [];
        if (tool === 'line' && dist(a, q) > 0) write(toolCode.line(name, a, q));
        if (tool === 'rectangle' && a[0] !== q[0] && a[1] !== q[1]) write(toolCode.rectangle(name, a, q));
        if (tool === 'circle') { const step = view.current?.step ?? 0.5; const d = dist(a, q); const r = typedRadius ?? Math.max(step, Math.round(d / step) * step); write(toolCode.circle(name, a, r)); }
      }
      typedRadius = null;
    };
    let typedRadius: number | null = null; // a typed radius is kept as typed, not put on the grid
    /** a slot's radius from the pointer: its distance from the line between the two ends, on the grid's step */
    const slotRadius = (a: V2, b: V2, q: V2) => { const step = view.current?.step ?? 0.5; return Math.max(step, Math.round(distToSegment(q, a, b) / step) * step); };
    const typedNumbers0 = (t: string) => t.split(/[,x ]/)[0];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && picking) { setPicking(false); e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (!tool) return;
      // a size, typed after the first click
      const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); if (last) show(last.x, last.y); };
      if (toolPts.current.length && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (/^[0-9.,x -]$/.test(e.key) && (typed.current || e.key !== ' ')) { typed.current += e.key; return stop(); }
        if (e.key === 'Backspace' && typed.current) { typed.current = typed.current.slice(0, -1); return stop(); }
        if (e.key === 'Escape' && typed.current) { typed.current = ''; return stop(); }
        if (e.key === 'Enter' && typed.current && tool === 'round') { doRound(toolPts.current[0], Number(typed.current)); return stop(); }
        if (e.key === 'Enter' && typed.current) {
          const tq = typedPoint(tool, toolPts.current, last?.q ?? toolPts.current[toolPts.current.length - 1], typed.current);
          if (tq) { if (tool === 'circle' || tool === 'slot') typedRadius = Number(typed.current); place(tq); }
          return stop();
        }
      }
      if (e.key === 'Escape') { toolPts.current = []; e.preventDefault(); e.stopImmediatePropagation(); if (last) show(last.x, last.y); }
      if (e.key === 'Enter' && tool === 'polyline') { finishPolyline(false); e.preventDefault(); e.stopImmediatePropagation(); }
    };
    const on: [string, EventListener][] = [['pointermove', onMove as EventListener], ['mousemove', ((e: MouseEvent) => { if (drag) { e.stopImmediatePropagation(); e.preventDefault(); } }) as EventListener],
      ['pointerdown', onDown as EventListener], ['mousedown', onDown as EventListener], ['pointerup', onUp as EventListener], ['mouseup', onUp as EventListener],
      ['click', onClick as EventListener], ['keydown', onKey as EventListener]];
    for (const [t, f] of on) inner.addEventListener(t, f, true);
    inner.document.addEventListener('pointerleave', onLeave);
    return () => {
      refreshHover.current = null;
      for (const [t, f] of on) inner.removeEventListener(t, f, true);
      inner.document.removeEventListener('pointerleave', onLeave);
    };
  }, [shown, p.inner, p.sc, tool, picking]);

  /** Write const sk = sketch(args) at the end of script.js and put the cursor on it, so sketch mode starts on it. */
  const newSketch = (args: string) => {
    const ed = p.editor.current; setPicking(false); if (!ed) return;
    const doc = ed.state.doc.toString(); const name = freshName('sk', topLevelNames(doc));
    const code = `const ${name} = sketch(${args});`; const text = `${doc.endsWith('\n') || !doc ? '' : '\n'}\n${code}`;
    ed.dispatch({ changes: { from: doc.length, insert: text }, selection: { anchor: doc.length + text.length }, scrollIntoView: true });
    ed.focus(); p.onInserted(`Added: ${code}`);
  };
  /** Extrude or Pocket: the step after the sketch's block, then Run. */
  const finish = (kind: 'extrude' | 'pocket') => {
    const ed = p.editor.current; const name = modeRef.current; const s = name ? sketches.current.get(name) : null;
    const d = Number(depth); if (!ed || !name || !s) return;
    if (!(d > 0)) { setNote('Give a depth above 0.'); return; }
    const { body, onFace } = bodyUnder(s.frame); const owner = body ? p.bodyVars().get(body) ?? null : null;
    const dir = finishDirections(s.frame, body && part.current.boxes.get(body) ? centreOf(part.current.boxes.get(body)!) : null);
    const doc = ed.state.doc.toString(); let code: string;
    if (kind === 'pocket') {
      if (!owner) { setNote('Pocket needs the part the sketch is on, kept in a variable of script.js (Run first).'); return; }
      code = `pocket(${name}, ${owner}, ${fmt(d)}${dir.pocketReversed ? ', { reversed: true }' : ''});`;
    } else {
      const pull = `extrude(${name}, ${fmt(d)}${dir.extrudeReversed ? ', { reversed: true }' : ''})`;
      code = onFace && owner ? `union(${owner}, ${pull});` : `const ${freshName('part', topLevelNames(doc))} = ${pull};`;
    }
    const end = sketchBlockEnd(doc, name) ?? doc.length; const text = `\n${code}`;
    ed.dispatch({ changes: { from: end, insert: text }, selection: { anchor: end + text.length }, scrollIntoView: true });
    p.onInserted(`Added: ${code}`); setTool(null); toolPts.current = [];
    setTimeout(() => props.current.onRun(), 300); // once the new line has reached the files
  };
  const done = () => {
    // Done: the cursor goes to the line after the sketch's block, so sketch mode ends and the view turns back.
    const ed = p.editor.current; const name = modeRef.current; setTool(null); toolPts.current = [];
    if (!ed || !name) return;
    const end = sketchBlockEnd(ed.state.doc.toString(), name); if (end === null) return;
    const doc = ed.state.doc; const line = doc.lineAt(end);
    if (line.number < doc.lines) ed.dispatch({ selection: { anchor: doc.line(line.number + 1).from } });
    else ed.dispatch({ changes: { from: doc.length, insert: '\n' }, selection: { anchor: doc.length + 1 } });
    ed.focus();
  };

  const s = mode ? sketches.current.get(mode) : null;
  const host = p.active && p.toolbarHost ? p.toolbarHost : null;
  const toolbar = !host ? null : mode && s ? createPortal(
    <span className={styles.sketchBar} role="toolbar" aria-label="Sketch tools">
      <b>Sketch {mode}</b><span className={styles.sketchPlane}>{planeWords(s.place)}{drawing ? ` · grid ${fmt(drawing.step)} mm` : ''}</span>
      {TOOLS.filter(([t]) => (t !== 'delete' && t !== 'round') || p.entryOpen).map(([t, label]) => <button key={t} aria-pressed={tool === t} className={tool === t ? styles.sketchToolOn : undefined}
        onClick={() => { toolPts.current = []; setTool(tool === t ? null : t); }}>{label}</button>)}
      <span className={styles.sketchFinish}>
        <label>depth <input type="number" min="0" step="any" value={depth} onChange={e => setDepth(e.target.value)} aria-label="Depth" /></label>
        <button onClick={() => finish('extrude')}>Extrude</button><button onClick={() => finish('pocket')}>Pocket</button>
      </span>
      <button onClick={done}>Done</button>
      {note && <span className={styles.sketchNote}>{note}</span>}
    </span>, host)
    : picking ? createPortal(
      <span className={styles.sketchBar} role="toolbar" aria-label="New sketch">
        <b>New sketch</b><span>Click a flat face in the view, or a plane:</span>
        <button onClick={() => newSketch("'top'")}>Top</button><button onClick={() => newSketch("'front'")}>Front</button><button onClick={() => newSketch("'side'")}>Side</button>
        <button onClick={() => setPicking(false)}>Cancel</button>
        {note && <span className={styles.sketchNote}>{note}</span>}
      </span>, host)
    : p.liveOn && p.entryOpen ? createPortal(<button className={styles.newSketch} onClick={() => { setNote(''); setPicking(true); }}>New sketch</button>, host) : null;
  if (!shown) return toolbar;
  return <>
    {toolbar}
    <svg className={styles.sketchOverlay} aria-hidden="true">
      {drawing?.clip && <defs><clipPath id={clipId}><path d={drawing.outline} clipRule="evenodd" /></clipPath></defs>}
      <g clipPath={drawing?.clip ? `url(#${clipId})` : undefined}>
        {drawing?.grid.map(([a, b, major], i) => <line key={`g${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className={major ? styles.gridMajor : styles.gridMinor} />)}
        {drawing?.axes.map(([a, b], i) => <line key={`a${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className={styles.gridAxis} />)}
      </g>
      {drawing?.outline && <path d={drawing.outline} className={styles.sketchFace} />}
      {drawing?.curves.map((c, i) => <polyline key={`c${i}`} points={c.map(q => q.join(',')).join(' ')} className={hover?.del?.includes(i) ? styles.sketchDelete : styles.sketchCurve} />)}
      {hover?.preview && <polyline points={hover.preview.map(q => q.join(',')).join(' ')} className={styles.sketchPreview} />}
    </svg>
    {mode && drawing?.dims.map(d => {
      const can = !tool && !!resizeOf(d.i, d.value) && ownersKey >= 0;
      if (editing?.i === d.i) return <input key={`d${d.i}`} className={styles.sketchDimEdit} style={{ left: d.at[0], top: d.at[1] }} autoFocus aria-label="New size"
        value={editing.value} onChange={e => setEditing({ i: d.i, value: e.target.value })} onBlur={() => setEditing(null)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applySize(); } if (e.key === 'Escape') { e.preventDefault(); setEditing(null); } }} />;
      return can ? <button key={`d${d.i}`} className={styles.sketchDim} style={{ left: d.at[0], top: d.at[1] }} title="Click to type a new size"
        onClick={() => setEditing({ i: d.i, value: fmt(d.value) })}>{d.text}</button>
        : <span key={`d${d.i}`} className={`${styles.sketchDim} ${styles.sketchDimFixed}`} style={{ left: d.at[0], top: d.at[1] }}>{d.text}</span>;
    })}
    {hover?.dot && <span className={styles.pointDot} style={{ left: hover.dot[0], top: hover.dot[1] }} />}
    {hover && <span className={styles.pointReadout} style={{ left: hover.x, top: hover.y, ...(hover.x > (p.inner?.innerWidth ?? 1e9) - 300 ? { transform: 'translate(calc(-100% - 14px), 14px)' } : {}) }}>
      {tool ? `${TOOLS.find(t => t[0] === tool)![1]}: ` : ''}{hover.text}</span>}
  </>;
}
