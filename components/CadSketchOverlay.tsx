'use client';
// Live sketching over SolidCraft's view, for the code-first CAD studio (SolidCraftCodeStudio).
//
// When the editor cursor is in a sketch's block (const lid = sketch(…) and the lid.…(…) lines right after it) and "Live sketch" is on, the studio
// is in sketch mode for that sketch, as SolidCraft is when a sketch is started on a face:
//   - the view turns to face the sketch's plane (its u to the right, its v up), and turns back when the cursor leaves;
//   - a snap grid is drawn on the plane, its step following the zoom, with the part's edges that lie on the plane drawn over it;
//   - the sketch's own lines, circles and arcs are drawn as the code is typed (reSHape's document, re-evaluated in the opaque
//     runner; nothing is built);
//   - sketch tools (Line, Rectangle, Circle, Polyline) draw with snapped clicks and write the reSHape line at the end of the
//     sketch's block in the code.
// With "Points" on and no sketch mode, the pointer shows [x, y] on the top plane (or the sketch at the cursor) and a click writes it.
//
// SolidCraft has worldToScreen and no screen-to-world: four points of the plane projected by SolidCraft give the projective map
// between the plane and the screen (lib/sketch-plane-points.ts), both ways.
import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { EditorView } from '@codemirror/view';
import styles from './solidcraft-sandbox.module.css';
import { bundleProject, CAD_ENTRY, readVariableProbe, withVariableProbe } from '../lib/solidcraft-code';
import { topLevelVariables } from '../lib/solidcraft-picks';
import type { ScEdge, ScFace } from '../lib/solidcraft-labels';
import {
  activeSketch, applyProjective, fmt, fromPlane, geomPath, geomSnaps, gridStep, planeFrameOf, planeWords, pointCode, pointInsertion,
  projective, sketchAtCursor, sketchBlockEnd, toPlane, toolCode, viewAngles, type PlaneFrame, type SketchGeom, type SketchPlaceInput, type V2, type V3,
} from '../lib/sketch-plane-points';

type Api = { request(method: string, params?: object): Promise<any>; execute(command: string, params?: object): Promise<any> };
type Evaluate = (source: string) => Promise<{ errors: { message: string; line?: number | null }[]; doc?: { features?: unknown[] } | null }>;
type Tool = 'line' | 'rectangle' | 'circle' | 'polyline';
interface Sketch { place: SketchPlaceInput; frame: PlaneFrame; geoms: SketchGeom[] }
interface Props {
  active: boolean;
  sc: Api | null;
  inner: Window | null;
  editor: RefObject<EditorView | null>;
  evaluate: Evaluate | null;
  files: Record<string, string>;
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
  onMode(name: string | null): void;
}
const TOOLS: [Tool, string][] = [['line', 'Line'], ['rectangle', 'Rectangle'], ['circle', 'Circle'], ['polyline', 'Polyline']];
const TOP: SketchPlaceInput = { plane: 'xy', offset: 0 };
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export default function CadSketchOverlay(p: Props) {
  const props = useRef(p); props.current = p;
  const sketches = useRef(new Map<string, Sketch>());
  const [version, setVersion] = useState(0); // the sketches were read again
  const [mode, setMode] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const toolPts = useRef<V2[]>([]);
  const [drawing, setDrawing] = useState<{ grid: [V2, V2, boolean][]; axes: [V2, V2][]; face: [V2, V2][]; curves: V2[][]; step: number } | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; text: string; dot: V2 | null; preview: V2[] | null } | null>(null);
  const view = useRef<{ F: number[]; H: number[]; frame: PlaneFrame; step: number; snaps: { s: V2; q: V2; kind: string }[]; label: string } | null>(null);
  const savedCamera = useRef<Record<string, unknown> | null>(null);
  const modeRef = useRef<string | null>(null);

  // ---- the sketches, read again from reSHape's document when the code changes (debounced) and after a Run --------------------
  const filesKey = JSON.stringify(p.files);
  useEffect(() => {
    const ev = p.evaluate; if (!p.active || !ev) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const files = props.current.files; const b = bundleProject(files); if (b.errors.length) return;
        const probe = readVariableProbe((await ev(withVariableProbe(b.source, topLevelVariables(files[CAD_ENTRY] ?? '')))).errors);
        const r = await ev(b.source);
        if (!live || !probe || !r.doc) return; // code mid-edit: the last sketches that ran stay
        const next = new Map<string, Sketch>();
        for (const f of (r.doc.features ?? []) as (SketchPlaceInput & { id?: unknown; kind?: unknown; geoms?: SketchGeom[] })[]) {
          const v = f.kind === 'sketch' && typeof f.id === 'string' ? probe.sketches.get(f.id) : undefined;
          if (v) { const place = { plane: f.plane, offset: f.offset, frame: f.frame }; next.set(v, { place, frame: planeFrameOf(place), geoms: Array.isArray(f.geoms) ? f.geoms : [] }); }
        }
        sketches.current = next; setVersion(x => x + 1);
      } catch { /* the runner is busy; the next change reads again */ }
    }, 450);
    return () => { live = false; clearTimeout(t); };
  }, [p.active, p.evaluate, filesKey, p.buildKey]);

  // ---- sketch mode follows the editor cursor -----------------------------------------------------------------------------------
  useEffect(() => {
    if (!p.active) return;
    const timer = setInterval(() => {
      const v = props.current.editor.current; if (!v) return;
      const name = props.current.liveOn ? sketchAtCursor(v.state.doc.toString(), v.state.selection.main.head, new Set(sketches.current.keys())) : null;
      if (name !== modeRef.current) { modeRef.current = name; setMode(name); }
    }, 250);
    return () => clearInterval(timer);
  }, [p.active]);
  useEffect(() => { p.onMode(p.active ? mode : null); if (!mode) { setTool(null); toolPts.current = []; } }, [mode, p.active]);

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
        const target = fromPlane(s.frame, toPlane(s.frame, cam.target));
        await sc.request('ui.camera', { target, yaw, pitch, roll: 0 });
        const [o, u] = await sc.request('ui.worldToScreen', { points: [target, fromPlane(s.frame, [toPlane(s.frame, target)[0] + 10, toPlane(s.frame, target)[1]])] });
        if (live && Array.isArray(o) && Array.isArray(u)) await sc.request('ui.camera', { roll: -Math.atan2(u[1] - o[1], u[0] - o[0]) });
      } catch { /* the view keeps its camera */ }
    })();
    return () => { live = false; };
  }, [mode, p.active, p.sc]);

  // ---- the drawing: grid, the part's edges on the plane, the sketch's curves; kept up with the camera ---------------------------
  const shown = p.active && (!!mode || p.pointsOn);
  // The part's corners, edge middles and face centres to snap to, its edges and its box: read after each Run, not on every keystroke.
  const part = useRef<{ corners: { p: V3; kind: string }[]; edges: [V3, V3][]; box: { min: number[]; max: number[] } | null; n: number }>({ corners: [], edges: [], box: null, n: 0 });
  /** The readout again at the last pointer position, when the drawing changes under a still pointer. */
  const refreshHover = useRef<(() => void) | null>(null);
  useEffect(() => {
    const sc = p.sc; if (!shown || !sc) return;
    let live = true;
    void (async () => {
      try {
        let box: { min: number[]; max: number[] } | null = null;
        const doc = await sc.request('document.inspect', { measure: true }); const out: { p: V3; kind: string }[] = []; const segs: [V3, V3][] = [];
        for (const b of (doc.bodies ?? []) as { name?: string; bbox?: { min: number[]; max: number[] } }[]) {
          if (!b.name) continue;
          if (b.bbox) box = box ? { min: box.min.map((v, i) => Math.min(v, b.bbox!.min[i])), max: box.max.map((v, i) => Math.max(v, b.bbox!.max[i])) } : b.bbox;
          const g = await props.current.geometry(b.name);
          for (const e of g.edges) if (e.start && e.end) { out.push({ p: e.start as V3, kind: 'corner' }, { p: e.end as V3, kind: 'corner' }, { p: e.mid as V3, kind: 'middle of an edge' }); segs.push([e.start as V3, e.end as V3]); }
          for (const f of g.faces) if (Array.isArray(f.plane_normal)) out.push({ p: f.centroid as V3, kind: 'centre of a face' });
        }
        if (live) part.current = { corners: out, edges: segs, box, n: part.current.n + 1 };
      } catch { /* no part to snap to */ }
    })();
    return () => { live = false; };
  }, [shown, p.sc, p.buildKey]);
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
      // the region drawn: the part's box dropped onto the plane, the sketch's own rows and the origin, with a margin
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
      const pxPerMm = Math.min(dist(o, one), dist(o, oneV));
      let step = s ? gridStep(pxPerMm) : 0.5;
      const snaps: { s: V2; q: V2; kind: string }[] = [];
      corners.forEach((c, i) => { const p2 = screen[4 + i]; if (Array.isArray(p2)) snaps.push({ s: [p2[0], p2[1]], q: toPlane(f, c.p), kind: c.kind }); });
      for (const g of sk?.geoms ?? []) for (const n of geomSnaps(g)) { const sp = applyProjective(F, n.q); if (sp) snaps.push({ s: sp, q: n.q, kind: n.kind }); }
      view.current = { F, H, frame: f, step, snaps, label }; refreshHover.current?.();
      if (!s) { setDrawing({ grid: [], axes: [], face: [], curves: [], step }); return; }
      // the grid: at most about 120 lines each way, every fifth line stronger
      const [x0, y0, x1, y1] = [quad[0][0], quad[0][1], quad[2][0], quad[2][1]];
      while ((x1 - x0) / step > 120 || (y1 - y0) / step > 120) step *= 2;
      view.current.step = step; refreshHover.current?.();
      const grid: [V2, V2, boolean][] = [];
      for (let k = Math.ceil(x0 / step); k * step <= x1; k++) grid.push([toScreen([k * step, y0]), toScreen([k * step, y1]), k % 5 === 0]);
      for (let k = Math.ceil(y0 / step); k * step <= y1; k++) grid.push([toScreen([x0, k * step]), toScreen([x1, k * step]), k % 5 === 0]);
      const axes: [V2, V2][] = [[toScreen([x0, 0]), toScreen([x1, 0])], [toScreen([0, y0]), toScreen([0, y1])]];
      const n = Math.hypot(...f.n) || 1; const on = (q: number[]) => Math.abs((q[0] - f.origin[0]) * f.n[0] + (q[1] - f.origin[1]) * f.n[1] + (q[2] - f.origin[2]) * f.n[2]) / n < 1e-5;
      const face = edges.filter(([a, b]) => on(a) && on(b)).map(([a, b]) => [toScreen(toPlane(f, a)), toScreen(toPlane(f, b))] as [V2, V2]);
      const curves = sk!.geoms.map(g => geomPath(g).map(toScreen));
      setDrawing({ grid, axes, face, curves, step });
    };
    const loop = async () => { try { await draw(); } catch { /* the view is busy */ } if (live) timer = setTimeout(loop, 150); };
    void loop();
    return () => { live = false; clearTimeout(timer); };
  }, [shown, p.sc, version, mode]);

  // ---- the pointer: the point under it, snapped; clicks draw with a tool or write the point -----------------------------------
  useEffect(() => {
    const inner = p.inner; const sc = p.sc; if (!shown || !inner || !sc) { setHover(null); return; }
    let down: V2 | null = null; let last: { q: V2; x: number; y: number } | null = null;
    const pointAt = (x: number, y: number) => {
      const v = view.current; if (!v) return null;
      let best: { d: number; q: V2; kind: string; s: V2 } | null = null;
      for (const c of v.snaps) { const d = dist(c.s, [x, y]); if (d <= 10 && (!best || d < best.d)) best = { d, q: c.q, kind: c.kind, s: c.s }; }
      const free = applyProjective(v.H, [x, y]); if (!best && !free) return null;
      const q: V2 = best ? best.q : [Math.round(free![0] / v.step) * v.step, Math.round(free![1] / v.step) * v.step];
      const sp = best ? best.s : applyProjective(v.F, q);
      return { q, kind: best?.kind ?? (modeRef.current ? `grid ${fmt(v.step)} mm` : ''), dot: sp ? [sp[0], sp[1] - props.current.crop] as V2 : null };
    };
    const preview = (q: V2): V2[] | null => {
      const v = view.current; const pts = toolPts.current; if (!v || !tool || !pts.length) return null;
      const sc2 = (r: V2) => { const s2 = applyProjective(v.F, r)!; return [s2[0], s2[1] - props.current.crop] as V2; };
      if (tool === 'line' || tool === 'polyline') return [...pts, q].map(sc2);
      if (tool === 'rectangle') { const a = pts[0]; return ([[a[0], a[1]], [q[0], a[1]], [q[0], q[1]], [a[0], q[1]], [a[0], a[1]]] as V2[]).map(sc2); }
      const r = dist(pts[0], q); return geomPath({ k: 'circle', c: pts[0], r }).map(sc2);
    };
    const show = (x: number, y: number) => {
      const at = pointAt(x, y); if (!at) { last = null; setHover(null); return; }
      last = { q: at.q, x, y };
      const v = view.current!;
      setHover({ x, y: y - props.current.crop, text: `${v.label}: ${pointCode(at.q)}${at.kind ? ` · ${at.kind}` : ''}`, dot: at.dot, preview: preview(at.q) });
    };
    const write = (code: string) => {
      const ed = props.current.editor.current; const name = modeRef.current; if (!ed || !name) return;
      const doc = ed.state.doc.toString(); const end = sketchBlockEnd(doc, name);
      const at = end ?? ed.state.selection.main.head; const text = `\n${code}`;
      ed.dispatch({ changes: { from: at, insert: text }, selection: { anchor: at + text.length }, scrollIntoView: true });
      props.current.onInserted(`Added: ${code}`);
    };
    const finishPolyline = (closed: boolean) => {
      const pts = toolPts.current; const name = modeRef.current;
      if (name && pts.length >= (closed ? 3 : 2)) write(toolCode.lines(name, pts, closed));
      toolPts.current = [];
    };
    let at: V2 | null = null;
    const onMove = (e: PointerEvent) => { at = [e.clientX, e.clientY]; show(e.clientX, e.clientY); };
    const onLeave = () => { at = null; last = null; setHover(null); };
    refreshHover.current = () => { if (at) show(at[0], at[1]); };
    const onDown = (e: PointerEvent) => { down = [e.clientX, e.clientY]; };
    const onClick = (e: MouseEvent) => {
      if (!last || (down && dist(down, [e.clientX, e.clientY]) > 4)) return; // a drag turns the view; it draws nothing
      e.preventDefault(); e.stopImmediatePropagation(); props.current.suppressPick();
      const q = last.q; const name = modeRef.current;
      if (!tool || !name) {
        const ed = props.current.editor.current; if (!ed) return;
        const head = ed.state.selection.main.head; const text = pointInsertion(ed.state.doc.toString(), head, q);
        ed.dispatch({ changes: { from: head, insert: text }, selection: { anchor: head + text.length } });
        props.current.onInserted(`Inserted: ${text.replace(/^, /, '')}`); return;
      }
      const pts = toolPts.current;
      if (tool === 'polyline') {
        if (pts.length >= 3 && dist(q, pts[0]) < 1e-9) finishPolyline(true);
        else if (pts.length && dist(q, pts[pts.length - 1]) < 1e-9) finishPolyline(false); // the same point twice ends an open one
        else pts.push(q);
      } else if (!pts.length) pts.push(q);
      else {
        const a = pts[0]; toolPts.current = [];
        if (tool === 'line' && dist(a, q) > 0) write(toolCode.line(name, a, q));
        if (tool === 'rectangle' && a[0] !== q[0] && a[1] !== q[1]) write(toolCode.rectangle(name, a, q));
        if (tool === 'circle') { const step = view.current?.step ?? 0.5; const r = Math.max(step, Math.round(dist(a, q) / step) * step); write(toolCode.circle(name, a, r)); }
      }
      show(last.x, last.y);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!tool) return;
      if (e.key === 'Escape') { toolPts.current = []; e.preventDefault(); e.stopImmediatePropagation(); if (last) show(last.x, last.y); }
      if (e.key === 'Enter' && tool === 'polyline') { finishPolyline(false); e.preventDefault(); e.stopImmediatePropagation(); }
    };
    inner.addEventListener('pointermove', onMove, true); inner.addEventListener('pointerdown', onDown, true);
    inner.addEventListener('click', onClick, true); inner.addEventListener('keydown', onKey, true); inner.document.addEventListener('pointerleave', onLeave);
    return () => {
      refreshHover.current = null;
      inner.removeEventListener('pointermove', onMove, true); inner.removeEventListener('pointerdown', onDown, true);
      inner.removeEventListener('click', onClick, true); inner.removeEventListener('keydown', onKey, true); inner.document.removeEventListener('pointerleave', onLeave);
    };
  }, [shown, p.inner, p.sc, tool]);

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
  const toolbar = p.active && mode && s && p.toolbarHost ? createPortal(
    <span className={styles.sketchBar} role="toolbar" aria-label="Sketch tools">
      <b>Sketch {mode}</b><span className={styles.sketchPlane}>{planeWords(s.place)}{drawing ? ` · grid ${fmt(drawing.step)} mm` : ''}</span>
      {TOOLS.map(([t, label]) => <button key={t} aria-pressed={tool === t} className={tool === t ? styles.sketchToolOn : undefined}
        onClick={() => { toolPts.current = []; setTool(tool === t ? null : t); }}>{label}</button>)}
      <button onClick={done}>Done</button>
    </span>, p.toolbarHost) : null;
  if (!shown) return toolbar;
  return <>
    {toolbar}
    <svg className={styles.sketchOverlay} aria-hidden="true">
      {drawing?.grid.map(([a, b, major], i) => <line key={`g${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className={major ? styles.gridMajor : styles.gridMinor} />)}
      {drawing?.axes.map(([a, b], i) => <line key={`a${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className={styles.gridAxis} />)}
      {drawing?.face.map(([a, b], i) => <line key={`f${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className={styles.sketchFace} />)}
      {drawing?.curves.map((c, i) => <polyline key={`c${i}`} points={c.map(q => q.join(',')).join(' ')} className={styles.sketchCurve} />)}
      {hover?.preview && <polyline points={hover.preview.map(q => q.join(',')).join(' ')} className={styles.sketchPreview} />}
    </svg>
    {hover?.dot && <span className={styles.pointDot} style={{ left: hover.dot[0], top: hover.dot[1] }} />}
    {hover && <span className={styles.pointReadout} style={{ left: hover.x, top: hover.y, ...(hover.x > (p.inner?.innerWidth ?? 1e9) - 300 ? { transform: 'translate(calc(-100% - 14px), 14px)' } : {}) }}>
      {tool ? `${TOOLS.find(t => t[0] === tool)![1]}: ` : ''}{hover.text}</span>}
  </>;
}
