// What a feature made with SolidCraft's own tools looks like in reSHape Script, so it can be
// added to script.js. Input: the feature as SolidCraft's timeline stores it
// (timeline.inspect's definition; a sketch's curves from sketch.inspect) and the model
// just before it (the faces and edges of each body), to name faces and edges by word.
// A feature reSHape cannot write exactly is refused with a reason; nothing is guessed. The
// studio then rebuilds the part from the code through the guarded path and compares it with
// what the tools made.
import { edgeByLabels, edgeLabels, faceByLabel, labelFaces, type ScEdge, type ScFace } from './solidcraft-labels';

export interface TimelineFeature { id: number; name: string; type: string; definition: Record<string, any>; curves?: SketchCurve[]; /** a sketch's frame, from sketch.inspect */ frame?: SketchFrame }
export interface SketchCurve { id: string; type: string; construction?: boolean; link?: string | null; start_at?: number[]; end_at?: number[]; center_at?: number[]; radius?: number }
export interface UiContext {
  /** timeline sketch id → the variable that holds it */
  sketchVars: Map<number, string>;
  /** body name → the variable that holds it */
  bodyVars: Map<string, string>;
  /** names already declared in script.js */
  taken: Set<string>;
  /** each body's faces and edges just before the feature */
  geometry: Map<string, { faces: ScFace[]; edges: ScEdge[] }>;
  /** sketch variable → whether SolidCraft's normal for it points against reSHape's (extrude and pocket directions flip) */
  flipped?: Map<string, boolean>;
  /** each body's measured box just before the feature (a turn pivots on it in reSHape, a hole's at: is measured from its centre) */
  boxes?: Map<string, { min: number[]; max: number[] }>;
  /** set by featuresCode once a step that changes a part has been written: the faces, edges and boxes above are then from before it */
  afterSolidStep?: boolean;
}
/** How a sketch's own 2D points sit in the model: origin + x·u + y·v. */
export interface SketchFrame { origin: number[]; u: number[]; v: number[] }
export type Written = { lines: string[] } | { error: string };

const fmt = (n: number) => { const r = Math.round(n * 1e4) / 1e4; return String(Object.is(r, -0) ? 0 : r); };
const pt = (p: number[]) => `[${p.map(fmt).join(', ')}]`;
/** A number in the default unit (mm, or degrees for angles), as SolidCraft may store it ("360 deg"); null for an expression. */
const plainNumber = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const m = typeof v === 'string' ? /^\s*(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)\s*(?:mm|deg)?\s*$/i.exec(v) : null;
  return m ? Number(m[1]) : null;
};
/** reSHape's words: a new variable never hides one. */
const WORDS = new Set(['sketch', 'plane', 'extrude', 'pull', 'pocket', 'revolve', 'spin', 'groove', 'loft', 'blend', 'cuboid', 'box', 'cylinder', 'sphere', 'cone', 'torus', 'ring', 'prism', 'wedge',
  'fillet', 'round', 'chamfer', 'bevel', 'shell', 'hollow', 'hole', 'holes', 'draft', 'union', 'join', 'subtract', 'cut', 'intersect', 'keep', 'mirror', 'linearPattern', 'repeat', 'polarPattern', 'repeatAround', 'move', 'turn', 'param']);
function fresh(ctx: UiContext, base: string): string { let name = base, i = 2; while (ctx.taken.has(name) || WORDS.has(name)) name = `${base}${i++}`; ctx.taken.add(name); return name; }
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: number[], b: number[]) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: number[], k: number) => [a[0] * k, a[1] * k, a[2] * k];

/** The flat face of a body that `point` lies on (its plane, and nearest by centroid when several do). */
function faceAtPoint(faces: ScFace[], point: number[]): ScFace | null {
  const on = faces.filter(f => Array.isArray(f.plane_normal) && Math.abs(dot(sub(point, f.centroid), f.plane_normal)) < 1e-6);
  if (!on.length) return null;
  return on.sort((a, b) => Math.hypot(...sub(point, a.centroid)) - Math.hypot(...sub(point, b.centroid)))[0];
}
function bodyOfPoint(ctx: UiContext, point: number[]): string | null {
  for (const [body, g] of ctx.geometry) if (faceAtPoint(g.faces, point)) return body;
  return null;
}
/** The word naming the face through `point`, when the word names exactly that face. */
function faceWord(ctx: UiContext, body: string, point: number[]): string | null {
  const g = ctx.geometry.get(body); const f = g && faceAtPoint(g.faces, point);
  const label = f && labelFaces(g!.faces).get(f.index);
  if (!f || !label) return null;
  const r = faceByLabel(g!.faces, label, body);
  return 'face' in r && r.face.index === f.index ? label : null;
}
const onSegment = (p: number[], e: ScEdge) => {
  if (!e.start || !e.end) return Math.hypot(...sub(p, e.mid)) < 1e-6;
  const d = sub(e.end, e.start); const len = Math.hypot(...d); if (!len) return false;
  const t = dot(sub(p, e.start), d) / (len * len); if (t < -1e-9 || t > 1 + 1e-9) return false;
  return Math.hypot(...sub(p, add(e.start, scale(d, t)))) < 1e-4;
};
const extend = (e: ScEdge, t: number) => add(e.start!, scale(sub(e.end!, e.start!), t));
const colinear = (a: ScEdge, b: ScEdge) => !!a.start && !!a.end && !!b.start && !!b.end && onSegment(b.start, { ...a, start: extend(a, -1e6), end: extend(a, 1e6) }) && onSegment(b.end, { ...a, start: extend(a, -1e6), end: extend(a, 1e6) });
/** An edge as code, by its two face words when they name exactly this edge (or its pieces). */
function edgeCode(ctx: UiContext, point: number[]): { code: string } | { error: string } {
  for (const [body, g] of ctx.geometry) {
    const e = g.edges.find(x => onSegment(point, x)); if (!e) continue;
    const owner = ctx.bodyVars.get(body); if (!owner) return { error: 'its part is not in a variable of script.js' };
    const ls = edgeLabels(g.faces, e);
    if (ls) { const r = edgeByLabels(g.faces, g.edges, ls[0], ls[1], body); if ('edges' in r && r.edges.some(x => x.index === e.index) && r.edges.every(x => x.index === e.index || colinear(x, e))) return { code: `${owner}.edge('${ls[0]}', '${ls[1]}')` }; }
    return { error: 'one of its edges has no name in reSHape Script (it is not where two named faces meet)' };
  }
  return { error: 'one of its edges could not be found on the model' };
}

// ---- sketches --------------------------------------------------------------------------------------
const same = (a?: number[], b?: number[]) => !!a && !!b && Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
/** A sketch's drawn curves in reSHape's sketch words: rectangles, lines, circles and arcs. Projected outlines are skipped. */
export function curvesCode(v: string, curves: SketchCurve[], map: (p: number[]) => number[] = p => p): Written {
  const drawn = curves.filter(c => !c.link);
  if (drawn.some(c => c.construction)) return { error: 'it has construction lines, which the code cannot draw yet' };
  const unknown = drawn.find(c => !['line', 'circle', 'arc'].includes(c.type));
  if (unknown) return { error: `it has a ${unknown.type}, which the code cannot draw yet` };
  const P = (p: number[]) => pt(map(p));
  const lines: string[] = []; let todo = drawn.filter(c => c.type === 'line');
  while (todo.length) {
    const chain = [todo.shift()!];
    for (let grew = true; grew;) {
      grew = false;
      const last = chain[chain.length - 1]; const first = chain[0];
      const next = todo.findIndex(c => same(c.start_at, last.end_at)); if (next >= 0) { chain.push(todo.splice(next, 1)[0]); grew = true; continue; }
      const nextRev = todo.findIndex(c => same(c.end_at, last.end_at)); if (nextRev >= 0) { const c = todo.splice(nextRev, 1)[0]; chain.push({ ...c, start_at: c.end_at, end_at: c.start_at }); grew = true; continue; }
      const prev = todo.findIndex(c => same(c.end_at, first.start_at)); if (prev >= 0) { chain.unshift(todo.splice(prev, 1)[0]); grew = true; continue; }
      const prevRev = todo.findIndex(c => same(c.start_at, first.start_at)); if (prevRev >= 0) { const c = todo.splice(prevRev, 1)[0]; chain.unshift({ ...c, start_at: c.end_at, end_at: c.start_at }); grew = true; }
    }
    const pts = [chain[0].start_at!, ...chain.map(c => c.end_at!)].map(map);
    const closed = chain.length > 2 && same(pts[0], pts[pts.length - 1]);
    const corners = closed ? pts.slice(0, -1) : pts;
    const xs = [...new Set(corners.map(p => fmt(p[0])))], ys = [...new Set(corners.map(p => fmt(p[1])))];
    if (closed && corners.length === 4 && xs.length === 2 && ys.length === 2) {
      const lo = [Math.min(...corners.map(p => p[0])), Math.min(...corners.map(p => p[1]))], hi = [Math.max(...corners.map(p => p[0])), Math.max(...corners.map(p => p[1]))];
      lines.push(`${v}.rectangle(${pt(lo)}, ${pt(hi)});`);
    } else if (chain.length === 1) lines.push(`${v}.line(${pt(pts[0])}, ${pt(pts[1])});`);
    else lines.push(`${v}.lines([${(closed ? [...corners, corners[0]] : corners).map(pt).join(', ')}]);`);
  }
  for (const c of drawn) {
    if (c.type === 'circle') lines.push(`${v}.circle(${P(c.center_at!)}, { r: ${fmt(c.radius!)} });`);
    // SolidCraft keeps an arc counter-clockwise from start to end, which is reSHape's 'ccw' when the sketch's axes are not mirrored.
    if (c.type === 'arc') lines.push(`${v}.arc(${P(c.center_at!)}, ${P(c.start_at!)}, ${P(c.end_at!)}, '${mirrored(map) ? 'cw' : 'ccw'}');`);
  }
  return { lines };
}
/** Whether a 2D map flips handedness (a reflected frame turns ccw into cw). */
function mirrored(map: (p: number[]) => number[]): boolean {
  const o = map([0, 0]), x = map([1, 0]), y = map([0, 1]);
  return (x[0] - o[0]) * (y[1] - o[1]) - (x[1] - o[1]) * (y[0] - o[0]) < 0;
}
/** reSHape's sketch planes: the model axis each is square to, its normal's sign, and its 2D axes in the model. */
const PLANE: Record<'top' | 'front' | 'side', { normal: number; sign: number; u: number; v: number }> = {
  top: { normal: 2, sign: 1, u: 0, v: 1 }, front: { normal: 1, sign: -1, u: 0, v: 2 }, side: { normal: 0, sign: 1, u: 1, v: 2 },
};
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export interface SketchPlane { args: string; map: (p: number[]) => number[]; /** SolidCraft's normal points against reSHape's */ flip: boolean }
/**
 * The sketch() arguments for a sketch whose frame SolidCraft reports (sketch.inspect's plane), when the plane is square
 * to an axis: 'top', 'front' or 'side' and its offset. Its 2D points are carried through the model onto reSHape's axes.
 */
export function sketchPlane(frame: SketchFrame | undefined): SketchPlane | { error: string } {
  if (!frame || !Array.isArray(frame.origin) || !Array.isArray(frame.u) || !Array.isArray(frame.v)) return { error: 'its plane could not be read' };
  const n = cross(frame.u, frame.v); const axis = [0, 1, 2].find(i => Math.abs(Math.abs(n[i]) - 1) < 1e-9);
  if (axis === undefined) {
    // A slanted plane: reSHape's frame form, sketch({ origin, u, v }), whose normal is u x v as SolidCraft's is; the points stay in the sketch's own
    // axes. u and v are written in full (reSHape refuses a frame that is not unit length and square to within 1e-6, so rounding could break it).
    const unit = (a: number[]) => Math.abs(Math.hypot(...a) - 1) < 1e-9;
    if (!unit(frame.u) || !unit(frame.v) || Math.abs(dot(frame.u, frame.v)) > 1e-9) return { error: 'its plane\'s axes are not square to each other' };
    const exact = (a: number[]) => `[${a.map(x => String(Object.is(x, -0) ? 0 : x)).join(', ')}]`;
    return { args: `{ origin: ${pt(frame.origin)}, u: ${exact(frame.u)}, v: ${exact(frame.v)} }`, map: p => p, flip: false };
  }
  const word = axis === 2 ? 'top' : axis === 1 ? 'front' : 'side'; const k = PLANE[word];
  const at = frame.origin[axis];
  const map = (p: number[]) => { const w = add(frame.origin, add(scale(frame.u, p[0]), scale(frame.v, p[1]))); return [w[k.u], w[k.v]]; };
  return { args: Math.abs(at) < 1e-9 ? `'${word}'` : `'${word}', ${fmt(at)}`, map, flip: Math.sign(n[axis]) !== k.sign };
}
// ---- features --------------------------------------------------------------------------------------
const firstBody = (d: Record<string, any>) => Array.isArray(d.body_names) ? d.body_names[0] as string : undefined;
const newBody = (d: Record<string, any>) => !d.operation || d.operation === 'new_body' || d.operation === 'new';
/**
 * The lines for one feature, and the variables they declare (added to ctx so later
 * features can use them). Each feature becomes code that builds the same feature.
 */
export function featureCode(f: TimelineFeature, ctx: UiContext): Written {
  const d = f.definition ?? {}; const why = (r: string): Written => ({ error: `${f.name} (made in SolidCraft) cannot be written as code: ${r}.` });
  const owner = (body: unknown) => typeof body === 'string' ? ctx.bodyVars.get(body) ?? null : null;
  switch (f.type) {
    case 'Sketch': {
      const plane = sketchPlane(f.frame); if ('error' in plane) return why(plane.error);
      const v = fresh(ctx, 'sk');
      const drawn = curvesCode(v, f.curves ?? [], plane.map); if ('error' in drawn) { ctx.taken.delete(v); return why(drawn.error); }
      ctx.sketchVars.set(f.id, v); (ctx.flipped ??= new Map()).set(v, plane.flip);
      return { lines: [`const ${v} = sketch(${plane.args});`, ...drawn.lines] };
    }
    case 'ExtrudeFeature': {
      const sk = ctx.sketchVars.get(d.sketch); if (!sk) return why('its sketch is not in the code');
      if (d.profiles && d.profiles.type !== 'all') return why('it uses only some regions of its sketch');
      if (d.extent?.distance2 !== undefined || d.extent?.to || d.extent?.from || d.thin || d.taper) return why('it has extent options the code cannot write yet');
      const through = d.extent?.type === 'through_all' || d.extent?.through_all === true;
      const dist = plainNumber(d.extent?.distance); if (!through && dist === null) return why('its distance is an expression');
      const dir = d.extent?.direction ?? 'positive';
      // Both ways: SolidCraft's distance is the total when its convention says so, as reSHape's midplane depth is (measured: a 10 mm cut both ways from a
      // plane removes 5 mm on each side in both). Any other convention is not written.
      if (dir === 'symmetric' && d.extent?.convention !== 'total_distance') return why('it goes both ways by a distance the code cannot write yet');
      // Along reSHape's normal for the sketch's plane: SolidCraft's direction, turned round when its normal points the other way.
      const along = (dir === 'negative' ? -1 : 1) * (ctx.flipped?.get(sk) ? -1 : 1);
      if (d.operation === 'cut') {
        const target = (Array.isArray(d.targets) ? d.targets[0] : undefined) ?? (ctx.geometry.size === 1 ? [...ctx.geometry.keys()][0] : undefined);
        const part = owner(target); if (!part) return why('the part it cuts is not in a variable of script.js');
        if (through) return dir === 'symmetric' ? why('it cuts through everything both ways') : { lines: [`pocket(${sk}, ${part}, 1, { through: true });`] };
        if (dir === 'symmetric') return { lines: [`pocket(${sk}, ${part}, ${fmt(dist!)}, { midplane: true });`] };
        // reSHape's pocket cuts against the normal (into a part below a 'top' sketch) unless reversed.
        return { lines: [`pocket(${sk}, ${part}, ${fmt(dist!)}${along > 0 ? ', { reversed: true }' : ''});`] };
      }
      if (through) return why('it is extruded through everything');
      const opts = dir === 'symmetric' ? ', { midplane: true }' : along < 0 ? ', { reversed: true }' : '';
      const call = `extrude(${sk}, ${fmt(dist!)}${opts})`;
      if (d.operation === 'join') {
        const t = Array.isArray(d.targets) ? d.targets[0] : undefined; const part = owner(t); if (!part) return why('the part it joins is not in a variable of script.js');
        return { lines: [`union(${part}, ${call});`] };
      }
      if (!newBody(d)) return why(`its operation is ${d.operation}`);
      return declare(ctx, d, 'part', call);
    }
    case 'FilletFeature': case 'ChamferFeature': {
      if (!Array.isArray(d.edges) || !d.edges.length) return why('it has no edges');
      const extra = f.type === 'FilletFeature' ? ['type', 'radius2', 'radii', 'mid', 'start', 'knots', 'smooth', 'corner', 'fit'] : ['distance2', 'angle', 'flip'];
      if (extra.some(k => d[k] !== undefined && d[k] !== null && !(k === 'type' && d[k] === 'constant'))) return why('it has options the code cannot write yet');
      const size = plainNumber(f.type === 'FilletFeature' ? d.radius : d.distance); if (size === null) return why('its size is an expression');
      const edges: ({ code: string } | { error: string })[] = d.edges.map((p: unknown) => Array.isArray(p) ? edgeCode(ctx, p as number[]) : { error: 'one of its edges is not given by a point' });
      for (const e of edges) if ('error' in e) return why(e.error);
      const codes = [...new Set(edges.map(e => (e as { code: string }).code))];
      const list = codes.length === 1 ? codes[0] : `[${codes.join(', ')}]`;
      return { lines: [`${f.type === 'FilletFeature' ? 'fillet' : 'chamfer'}(${list}, ${fmt(size)});`] };
    }
    case 'ShellFeature': {
      const faces: number[][] = Array.isArray(d.faces) ? d.faces : [];
      if (d.direction && d.direction !== 'inside') return why('its wall goes outside');
      if (faces.length > 1) return why('it opens more than one face');
      const wall = plainNumber(d.thickness); if (wall === null) return why('its wall is an expression');
      const body = (faces.length ? bodyOfPoint(ctx, faces[0]) : null) ?? (ctx.geometry.size === 1 ? [...ctx.geometry.keys()][0] : null);
      const part = owner(body); if (!body || !part) return why('its part is not in a variable of script.js');
      const open = faces.length ? faceWord(ctx, body, faces[0]) : null;
      if (faces.length && !open) return why('the face it opens has no name in reSHape Script');
      return { lines: [`shell(${part}, { wall: ${fmt(wall)}${open ? `, open: '${open}'` : ''} });`] };
    }
    case 'BoxFeature': {
      if (!newBody(d)) return why(`its operation is ${d.operation}`);
      const [l, w, h] = [d.length, d.width, d.height].map(plainNumber); if (l === null || w === null || h === null) return why('its size is an expression');
      const center = Array.isArray(d.center) ? d.center : Array.isArray(d.corner) ? add(d.corner, [l / 2, w / 2, h / 2]) : null;
      return declare(ctx, d, 'block', `cuboid(${fmt(l)}, ${fmt(w)}, ${fmt(h)}${center && center.some((x: number) => x !== 0) ? `, { at: ${pt(center)} }` : ''})`);
    }
    case 'CylinderFeature': case 'SphereFeature': case 'ConeFeature': {
      if (!newBody(d)) return why(`its operation is ${d.operation}`);
      if (d.references) return why('it is placed by distances from edges');
      const r = plainNumber(d.radius); if (r === null) return why('its radius is an expression');
      if (f.type === 'SphereFeature') { const c = Array.isArray(d.center) ? d.center : [0, 0, 0]; return declare(ctx, d, 'ball', `sphere(${fmt(2 * r)}${c.some((x: number) => x !== 0) ? `, { at: ${pt(c)} }` : ''})`); }
      if (d.axis !== undefined && axisName(d.axis) !== 'Z') return why('it does not stand along Z');
      if (f.type === 'ConeFeature' && d.top_radius !== undefined && plainNumber(d.top_radius) !== 0) return why('it has a flat top, and reSHape\'s cone is pointed');
      const h = plainNumber(d.height); if (h === null) return why('its height is an expression');
      const base = Array.isArray(d.base) ? d.base : [0, 0, 0]; const c = add(base, [0, 0, h / 2]);
      const word = f.type === 'ConeFeature' ? 'cone' : 'cylinder';
      return declare(ctx, d, word === 'cone' ? 'tip' : 'rod', `${word}(${fmt(2 * r)}, ${fmt(h)}${c.some((x: number) => x !== 0) ? `, { at: ${pt(c)} }` : ''})`);
    }
    case 'CombineFeature': {
      const word = ({ join: 'union', cut: 'subtract', intersect: 'intersect' } as Record<string, string>)[d.operation];
      if (!word || d.keep_tools || d.new_component) return why('it keeps its tools or makes a component');
      if (typeof d.target !== 'string' || !Array.isArray(d.tools) || !d.tools.length) return why('its bodies are not named');
      const parts = [d.target, ...d.tools].map(owner); if (parts.some(p => !p)) return why('one of its parts is not in a variable of script.js');
      return { lines: [`${word}(${parts.join(', ')});`] };
    }
    case 'RectangularPatternFeature': case 'CircularPatternFeature': {
      if (!Array.isArray(d.bodies) || d.bodies.length !== 1 || (Array.isArray(d.features) && d.features.length)) return why('it repeats more than one body, or features');
      const part = owner(d.bodies[0]); if (!part) return why('its part is not in a variable of script.js');
      const pat = d.pattern ?? {};
      if (f.type === 'RectangularPatternFeature') {
        if (pat.alignment || pat.reversed || pat.symmetric || pat.symmetric2) return why('it repeats with options the code cannot write yet');
        const n = plainNumber(pat.count1), s = plainNumber(pat.spacing1); if (n === null || s === null || !Array.isArray(pat.dir1)) return why('its count or spacing is an expression');
        const row = `linearPattern(${part}, { count: ${fmt(n)}, step: ${pt(scale(pat.dir1, s / Math.hypot(...pat.dir1)))} });`;
        if (pat.dir2 === undefined && pat.count2 === undefined) return { lines: [row] };
        // Two directions: the row, then the row repeated (a pattern of the part repeats what it has become), count1 x count2 copies as SolidCraft makes.
        const n2 = plainNumber(pat.count2), s2 = plainNumber(pat.spacing2); if (n2 === null || s2 === null || !Array.isArray(pat.dir2)) return why('its second count or spacing is an expression');
        return { lines: [row, `linearPattern(${part}, { count: ${fmt(n2)}, step: ${pt(scale(pat.dir2, s2 / Math.hypot(...pat.dir2)))} });`] };
      }
      if (axisName(pat.axis) !== 'Z' || (Array.isArray(pat.origin) && pat.origin.some((v: number) => v !== 0)) || pat.alignment || pat.reversed) return why('it turns about an axis that is not Z through the origin');
      const n = plainNumber(pat.count), a = plainNumber(pat.angle ?? 360); if (n === null || a === null) return why('its count or angle is an expression');
      return { lines: [`polarPattern(${part}, { count: ${fmt(n)}${a !== 360 ? `, angle: ${fmt(a)}` : ''} });`] };
    }
    case 'MoveFeature': {
      if (!Array.isArray(d.bodies) || d.bodies.length !== 1 || d.occurrences) return why('it moves more than one body');
      const part = owner(d.bodies[0]); if (!part) return why('its part is not in a variable of script.js');
      const t = Array.isArray(d.translate) ? d.translate.map((x: unknown) => plainNumber(x) ?? NaN) : [0, 0, 0];
      if (t.some(Number.isNaN)) return why('it moves by an expression');
      const angle = d.angle === undefined ? 0 : plainNumber(d.angle); if (angle === null) return why('it turns by an expression');
      // reSHape has move(part, offset, { copy: true }), but the guarded build refuses it ("a copying move is not mapped"), so a copy is not written.
      if (d.copy) return why('it copies the part, which the guarded build does not make yet');
      if (angle === 0) return { lines: [`move(${part}, ${pt(t)});`] };
      // A turn: SolidCraft turns about an axis through the origin; reSHape's turn() about the centre of the part's box. The same turn is reSHape's turn
      // and then a move by R.c - c (c the box's centre), about one of X, Y and Z only.
      if (t.some(v => v !== 0)) return why('it moves and turns at once');
      if (ctx.afterSolidStep) return why('it was made in the same go as another step, so where it is cannot be measured; make it on its own');
      const ax = axisName(d.rotate_axis); if (!ax || d.origin) return why('it turns about an axis that is not X, Y or Z through the origin');
      const box = ctx.boxes?.get(d.bodies[0]); if (!box) return why('the box of its part could not be read');
      const c = box.min.map((v, i) => (v + box.max[i]) / 2); const k = 'XYZ'.indexOf(ax);
      const rad = angle * Math.PI / 180; const [co, si] = [Math.cos(rad), Math.sin(rad)]; const [i, j] = [(k + 1) % 3, (k + 2) % 3];
      const rc = [...c]; rc[i] = co * c[i] - si * c[j]; rc[j] = si * c[i] + co * c[j];
      const angles = [0, 0, 0]; angles[k] = angle;
      const shift = sub(rc, c);
      return { lines: [`turn(${part}, ${pt(angles)});`, ...(shift.some(v => Math.abs(v) > 1e-9) ? [`move(${part}, ${pt(shift)});`] : [])] };
    }
    case 'HoleFeature': {
      if (ctx.afterSolidStep) return why('it was made in the same go as another step, so where it is cannot be measured; make it on its own');
      // reSHape's hole(part, { across, deep, at, along }): drilled along X, Y or Z, at: measured from the centre of the part's box across the face, a blind
      // hole from the face at the high end of its axis (measured: hole(b, { deep: 8 }) on a box 0..20 high cuts 12..20). A through hole is the same either way.
      if (d.hole && d.hole.type !== 'simple') return why('it has a counterbore, countersink or thread');
      if (!Array.isArray(d.position) || !Array.isArray(d.direction)) return why('its place could not be read');
      const across = plainNumber(d.diameter); if (across === null) return why('its size is an expression');
      const deep = d.depth === undefined || d.depth === null ? null : plainNumber(d.depth); if (d.depth !== undefined && d.depth !== null && deep === null) return why('its depth is an expression');
      if (d.to !== undefined || d.through_all === false) return why('it is drilled to a point');
      const ax = axisName(d.direction.map((v: number) => Math.abs(v))); if (!ax) return why('it is not drilled along X, Y or Z');
      const k = 'XYZ'.indexOf(ax);
      const body = bodyOfPoint(ctx, d.position); const part = owner(body); if (!body || !part) return why('the part it drills is not in a variable of script.js');
      const box = ctx.boxes?.get(body); if (!box) return why('the box of its part could not be read');
      if (deep !== null && !(d.direction[k] < 0 && Math.abs(d.position[k] - box.max[k]) < 1e-6)) return why('it stops part way and is drilled from a face the code cannot drill from yet');
      const c = box.min.map((v, i) => (v + box.max[i]) / 2); const [u, v] = k === 2 ? [0, 1] : k === 1 ? [0, 2] : [1, 2];
      const opts = [`across: ${fmt(across)}`, ...(deep !== null ? [`deep: ${fmt(deep)}`] : []), `at: ${pt([d.position[u] - c[u], d.position[v] - c[v]])}`, ...(ax !== 'Z' ? [`along: '${ax.toLowerCase()}'`] : [])];
      return { lines: [`hole(${part}, { ${opts.join(', ')} });`] };
    }
    default:
      return why(`SolidCraft's ${f.type.replace(/Feature$/, '').toLowerCase()} is not one of the code's words yet`);
  }
}

/** X, Y or Z for an axis given as a letter or a unit vector along one; null otherwise. */
function axisName(a: unknown): 'X' | 'Y' | 'Z' | null {
  if (a === 'X' || a === 'Y' || a === 'Z') return a;
  if (Array.isArray(a) && a.length === 3) { const k = a.findIndex(v => Math.abs(Number(v)) > 1e-12); if (k >= 0 && a.every((v, i) => i === k ? Math.abs(Number(v) - 1) < 1e-12 : Math.abs(Number(v)) < 1e-12)) return (['X', 'Y', 'Z'] as const)[k]; }
  return null;
}
/** `const <name> = <call>;` for a feature that makes a body, remembering which variable holds it. */
function declare(ctx: UiContext, d: Record<string, any>, base: string, call: string): Written {
  const body = firstBody(d); if (!body) return { lines: [`${call};`] };
  const v = fresh(ctx, base); ctx.bodyVars.set(body, v); return { lines: [`const ${v} = ${call};`] };
}
/** Every new feature in order, or the first that cannot be written. */
export function featuresCode(features: TimelineFeature[], ctx: UiContext): Written {
  const lines: string[] = [];
  for (const f of features) { const w = featureCode(f, ctx); if ('error' in w) return w; lines.push(...w.lines); if (f.type !== 'Sketch') ctx.afterSolidStep = true; }
  return { lines };
}
