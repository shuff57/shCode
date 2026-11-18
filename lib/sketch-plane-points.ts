// Points on a sketch's plane, for the code-first CAD studio's "Points" switch: the pointer over the view is turned into the
// sketch's own [x, y], so a student can see and use coordinates on a sketch made on a face (sketch('top', 10)).
//
// - The plane comes from reSHape's document (a sketch feature's plane + offset, or its frame), resolved the way reSHape does
//   it (model-types.ts sketchFrameOf): a named plane's axes are fixed and its origin is normal x offset.
// - SolidCraft has worldToScreen but no screen-to-world. A plane maps onto the screen by a projective map, so four of its
//   points projected by SolidCraft give that map exactly, and its inverse turns a pointer position into plane coordinates.
// - Nothing here talks to SolidCraft; the studio does the projecting.

export type V3 = [number, number, number];
export type V2 = [number, number];
export interface PlaneFrame { origin: V3; u: V3; v: V3; n: V3 }
export interface SketchPlaceInput { plane?: string; offset?: number; frame?: { origin: number[]; u: number[]; v: number[] } }

const NAMED: Record<string, { u: V3; v: V3; n: V3 }> = {
  xy: { u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] },
  xz: { u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0] },
  yz: { u: [0, 1, 0], v: [0, 0, 1], n: [1, 0, 0] },
};
const WORD: Record<string, string> = { xy: 'top', xz: 'front', yz: 'side' };
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A sketch feature's world frame, as reSHape resolves it. */
export function planeFrameOf(f: SketchPlaceInput): PlaneFrame {
  if (f.frame) {
    const { origin, u, v } = f.frame;
    return { origin: [origin[0], origin[1], origin[2]], u: [u[0], u[1], u[2]], v: [v[0], v[1], v[2]], n: [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]] };
  }
  const a = NAMED[f.plane ?? 'xy'] ?? NAMED.xy; const k = f.offset ?? 0;
  return { origin: [a.n[0] * k, a.n[1] * k, a.n[2] * k], u: a.u, v: a.v, n: a.n };
}
/** How the plane is named in the code: 'top', 'front, 10', or 'a slanted plane'. */
export function planeWords(f: SketchPlaceInput): string {
  if (f.frame) return 'a slanted plane';
  const w = WORD[f.plane ?? 'xy'] ?? 'top'; const k = f.offset ?? 0;
  return k ? `${w} plane at ${fmt(k)}` : `${w} plane`;
}
/** A world point in the sketch's own 2D coordinates (a point off the plane is dropped onto it). */
export const toPlane = (f: PlaneFrame, p: number[]): V2 => { const d = [p[0] - f.origin[0], p[1] - f.origin[1], p[2] - f.origin[2]]; return [dot(d, f.u), dot(d, f.v)]; };
/** The world point of the sketch's [x, y]. */
export const fromPlane = (f: PlaneFrame, q: number[]): V3 => [0, 1, 2].map(i => f.origin[i] + q[0] * f.u[i] + q[1] * f.v[i]) as V3;

/** The projective map taking four points `from` to four points `to` (3x3, row-major, h33 = 1); null when they do not fix one. */
export function projective(from: V2[], to: V2[]): number[] | null {
  if (from.length !== 4 || to.length !== 4) return null;
  // h11 x + h12 y + h13 - h31 x X - h32 y X = X, and the same for Y: eight equations, eight unknowns.
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = from[i]; const [X, Y] = to[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X, X]);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y, Y]);
  }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) if (r !== c) { const k = A[r][c] / A[c][c]; for (let j = c; j < 9; j++) A[r][j] -= k * A[c][j]; }
  }
  return [...A.map((row, i) => row[8] / row[i]), 1];
}
export function applyProjective(h: number[], p: V2): V2 | null {
  const w = h[6] * p[0] + h[7] * p[1] + h[8];
  if (Math.abs(w) < 1e-12) return null;
  return [(h[0] * p[0] + h[1] * p[1] + h[2]) / w, (h[3] * p[0] + h[4] * p[1] + h[5]) / w];
}

/** A number as it is written in the code: at most 3 decimals, no -0. */
export function fmt(n: number): string { const r = Math.round(n * 1000) / 1000; return String(Object.is(r, -0) ? 0 : r); }
/** A point as code: [x, y]. */
export const pointCode = (q: V2) => `[${fmt(q[0])}, ${fmt(q[1])}]`;
/** Rounded to a grid step (a pointer is not exact; a snapped corner is). */
export const toGrid = (q: V2, step = 0.5): V2 => [Math.round(q[0] / step) * step, Math.round(q[1] / step) * step];

/**
 * The sketch the editor cursor is working in: the variable of `X.something(` on the cursor's line or the nearest line above,
 * or of `const X = sketch(`. Only names in `sketches` count. null when none is near.
 */
export function activeSketch(doc: string, cursor: number, sketches: Set<string>): string | null {
  if (!sketches.size) return null;
  const lines = doc.slice(0, cursor).split('\n');
  const after = doc.slice(cursor).split('\n')[0] ?? '';
  lines[lines.length - 1] += after;
  for (let i = lines.length - 1; i >= 0 && i >= lines.length - 40; i--) {
    const line = lines[i];
    const decl = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*sketch\s*\(/.exec(line);
    if (decl && sketches.has(decl[1])) return decl[1];
    const uses = [...line.matchAll(/([A-Za-z_$][\w$]*)\s*\.\s*[A-Za-z_$][\w$]*\s*\(/g)].map(m => m[1]).filter(n => sketches.has(n));
    if (uses.length) return uses[uses.length - 1];
    // a sketch handed to a step (extrude(lid, …), pocket(lid, …)) ends the search: the lines above belong to it
    const passed = [...line.matchAll(/\(\s*([A-Za-z_$][\w$]*)\s*[,)]/g)].map(m => m[1]).filter(n => sketches.has(n));
    if (passed.length) return passed[passed.length - 1];
  }
  return null;
}

/** What goes in the code at the cursor: `[x, y]`, with ', ' first when the cursor follows a point or a value. */
export function pointInsertion(doc: string, cursor: number, q: V2): string {
  const before = doc.slice(0, cursor).replace(/[ \t]+$/, '');
  return /[\]\d)]$/.test(before) ? `, ${pointCode(q)}` : pointCode(q);
}

// ---- live sketch mode: the camera, the grid, the sketch's own curves and the sketch tools ---------------------------------------

/**
 * SolidCraft's camera angles that look straight at a plane from the side its u reads right and its v up (the eye along u x v).
 * Measured on SolidCraft 0.30.1 (z up): front is yaw 0, pitch 0; right is yaw -pi/2; top is pitch pi/2; the eye's direction is
 * (-sin yaw cos pitch, -cos yaw cos pitch, sin pitch). Roll is set after, from where u lands on the screen.
 */
export function viewAngles(f: PlaneFrame): { yaw: number; pitch: number } {
  const e = [f.u[1] * f.v[2] - f.u[2] * f.v[1], f.u[2] * f.v[0] - f.u[0] * f.v[2], f.u[0] * f.v[1] - f.u[1] * f.v[0]];
  const len = Math.hypot(e[0], e[1], e[2]) || 1; const [x, y, z] = e.map(c => c / len);
  const pitch = Math.asin(Math.max(-1, Math.min(1, z)));
  return { yaw: Math.hypot(x, y) < 1e-9 ? 0 : Math.atan2(-x, -y), pitch };
}
/** The grid step, in mm, whose cells are at least `minPx` pixels at this zoom. */
export function gridStep(pxPerMm: number, minPx = 14): number {
  for (const s of [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500]) if (s * pxPerMm >= minPx) return s;
  return 1000;
}

/** A sketch row of reSHape's document, in the sketch's own coordinates. */
export type SketchGeom =
  | { k: 'point'; p: V2 } | { k: 'line'; a: V2; b: V2 } | { k: 'circle'; c: V2; r: number }
  | { k: 'arc'; c: V2; r: number; a: V2; b: V2; sense?: 'ccw' | 'cw' };
/** A row as points to draw through (circles and arcs in short straight pieces). */
export function geomPath(g: SketchGeom, pieces = 64): V2[] {
  if (g.k === 'point') return [g.p];
  if (g.k === 'line') return [g.a, g.b];
  if (g.k === 'circle') return Array.from({ length: pieces + 1 }, (_, i) => { const t = 2 * Math.PI * i / pieces; return [g.c[0] + g.r * Math.cos(t), g.c[1] + g.r * Math.sin(t)] as V2; });
  const a0 = Math.atan2(g.a[1] - g.c[1], g.a[0] - g.c[0]); let a1 = Math.atan2(g.b[1] - g.c[1], g.b[0] - g.c[0]);
  const ccw = g.sense !== 'cw';
  if (ccw) { while (a1 <= a0) a1 += 2 * Math.PI; } else { while (a1 >= a0) a1 -= 2 * Math.PI; }
  const n = Math.max(2, Math.ceil(pieces * Math.abs(a1 - a0) / (2 * Math.PI)));
  return Array.from({ length: n + 1 }, (_, i) => { const t = a0 + (a1 - a0) * i / n; return [g.c[0] + g.r * Math.cos(t), g.c[1] + g.r * Math.sin(t)] as V2; });
}
/** The points a pointer snaps to on a sketch's own rows: ends, centres. */
export function geomSnaps(g: SketchGeom): { q: V2; kind: string }[] {
  if (g.k === 'point') return [{ q: g.p, kind: 'point of the sketch' }];
  if (g.k === 'line') return [{ q: g.a, kind: 'end of a line' }, { q: g.b, kind: 'end of a line' }, { q: [(g.a[0] + g.b[0]) / 2, (g.a[1] + g.b[1]) / 2], kind: 'middle of a line' }];
  if (g.k === 'circle') return [{ q: g.c, kind: 'centre of a circle' }];
  return [{ q: g.c, kind: 'centre of an arc' }, { q: g.a, kind: 'end of an arc' }, { q: g.b, kind: 'end of an arc' }];
}

/**
 * Where a new line of sketch `name` goes: the end of the last line of its block (its `const name = sketch(` line and the lines
 * right after it that call name.something(...), blank lines and comments between them allowed). null when the declaration is
 * not a top-level line of `doc`.
 */
export function sketchBlockEnd(doc: string, name: string): number | null {
  const esc = name.replace(/\$/g, '\\$');
  const lines = doc.split('\n'); let off = 0; let decl = -1; const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) { starts.push(off); off += lines[i].length + 1; if (decl < 0 && new RegExp(`^\\s*(?:const|let|var)\\s+${esc}\\s*=\\s*sketch\\s*\\(`).test(lines[i])) decl = i; }
  if (decl < 0) return null;
  let last = decl;
  for (let i = decl + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith('//')) continue;
    if (new RegExp(`^${esc}\\s*\\.`).test(t)) { last = i; continue; }
    break;
  }
  return starts[last] + lines[last].length;
}
/** The code each sketch tool writes, in reSHape's friendly sketch words. */
export const toolCode = {
  line: (s: string, a: V2, b: V2) => `${s}.line(${pointCode(a)}, ${pointCode(b)});`,
  rectangle: (s: string, a: V2, b: V2) => `${s}.rectangle(${pointCode([Math.min(a[0], b[0]), Math.min(a[1], b[1])])}, ${pointCode([Math.max(a[0], b[0]), Math.max(a[1], b[1])])});`,
  circle: (s: string, c: V2, r: number) => `${s}.circle(${pointCode(c)}, { r: ${fmt(r)} });`,
  lines: (s: string, pts: V2[], closed: boolean) => `${s}.lines([${[...pts, ...(closed ? [pts[0]] : [])].map(pointCode).join(', ')}]);`,
};
/**
 * The sketch whose block the cursor's line is in (its declaration line, the name.something(…) lines right after it, and blank
 * lines or comments between them): sketch mode. Stricter than activeSketch, so a line below a sketch's block is out of it.
 */
export function sketchAtCursor(doc: string, cursor: number, sketches: Set<string>): string | null {
  const line = doc.slice(0, cursor).split('\n').length - 1; const lines = doc.split('\n');
  for (const name of sketches) {
    const esc = name.replace(/\$/g, '\\$');
    const decl = lines.findIndex(l => new RegExp(`^\\s*(?:const|let|var)\\s+${esc}\\s*=\\s*sketch\\s*\\(`).test(l));
    if (decl < 0 || line < decl) continue;
    const end = sketchBlockEnd(doc, name); if (end === null) continue;
    const last = doc.slice(0, end).split('\n').length - 1;
    if (line <= last) return name;
  }
  return null;
}

// ---- starting a sketch on a face, and finishing it into a feature ------------------------------------------------------------

const cross3 = (a: number[], b: number[]): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit3 = (a: number[]): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const exact = (a: number[]) => `[${a.map(x => { const r = Math.abs(x) < 1e-12 ? 0 : x; return String(Object.is(r, -0) ? 0 : r); }).join(', ')}]`;
/**
 * The sketch() arguments for a flat face: 'top', 10 for a face square to an axis (as solidcraft-picks writes it), else reSHape's frame
 * form through the face, its normal (u x v) the face's outward normal so extrude goes out of the part and pocket into it. null when
 * the face is not flat.
 */
export function faceSketchArgs(face: { plane_normal?: number[] | null; centroid: number[] }): string | null {
  const n = face.plane_normal; if (!Array.isArray(n)) return null;
  const axis = [0, 1, 2].find(i => Math.abs(Math.abs(n[i]) - 1) < 1e-6);
  if (axis !== undefined) {
    const word = axis === 2 ? 'top' : axis === 1 ? 'front' : 'side'; const at = face.centroid[axis];
    return Math.abs(at) < 1e-9 ? `'${word}'` : `'${word}', ${fmt(at)}`;
  }
  const nn = unit3(n);
  // u: level (square to Z) where the face is not flat-on to Z, so the sketch's x runs across the slope
  const u = unit3(Math.hypot(nn[0], nn[1]) > 1e-9 ? [-nn[1], nn[0], 0] : [1, 0, 0]); const v = cross3(nn, u);
  return `{ origin: ${pointCode3(face.centroid)}, u: ${exact(u)}, v: ${exact(v)} }`;
}
const pointCode3 = (p: number[]) => `[${p.map(fmt).join(', ')}]`;
/** reSHape's sweep direction for a sketch: an extrude goes along it, a pocket against it (u x v; the front plane's is -Y). */
export const sweepOf = (f: PlaneFrame): V3 => unit3(cross3(f.u, f.v));
/**
 * Which way extrude and pocket go from a sketch, given the centre of the part it sits on: an extrude away from the part and a
 * pocket into it. `reversed` is reSHape's option that turns either round.
 */
export function finishDirections(f: PlaneFrame, partCentre: number[] | null): { extrudeReversed: boolean; pocketReversed: boolean } {
  if (!partCentre) return { extrudeReversed: false, pocketReversed: false };
  const s = sweepOf(f); const d = [partCentre[0] - f.origin[0], partCentre[1] - f.origin[1], partCentre[2] - f.origin[2]];
  const side = s[0] * d[0] + s[1] * d[1] + s[2] * d[2]; // > 0: the part lies along the sweep
  return { extrudeReversed: side > 1e-9, pocketReversed: side > 1e-9 };
}
/** A fresh variable name: base, base2, base3 … not in `taken`. */
export function freshName(base: string, taken: Set<string>): string { let n = base, i = 2; while (taken.has(n)) n = `${base}${i++}`; return n; }

// ---- the arc tool and moving a drawn point -------------------------------------------------------------------------------------

/** An arc from a, counter-clockwise, to where the ray towards b crosses its circle. */
export function arcCode(s: string, c: V2, a: V2, b: V2): string | null {
  const r = Math.hypot(a[0] - c[0], a[1] - c[1]); const d = Math.hypot(b[0] - c[0], b[1] - c[1]);
  if (r < 1e-9 || d < 1e-9) return null;
  const end: V2 = [c[0] + (b[0] - c[0]) * r / d, c[1] + (b[1] - c[1]) * r / d];
  if (Math.hypot(end[0] - a[0], end[1] - a[1]) < 1e-9) return null;
  return `${s}.arc(${pointCode(c)}, ${pointCode(a)}, ${pointCode(end)}, 'ccw');`;
}
/**
 * Moving a drawn point: the [x, y] literals in sketch `name`'s block whose value is `from` are rewritten as `to` (every one, so a
 * corner two lines share, or a closed outline's first and last point, move together). Only plain number literals are found; a
 * point written with a variable or a sum is not, and nothing is changed for it. The changes to make, in the document's offsets.
 */
export function movePointEdits(doc: string, name: string, from: V2, to: V2): { from: number; to: number; insert: string }[] {
  const end = sketchBlockEnd(doc, name); if (end === null) return [];
  const esc = name.replace(/\$/g, '\\$');
  const decl = new RegExp(`^\\s*(?:const|let|var)\\s+${esc}\\s*=\\s*sketch\\s*\\(`, 'm').exec(doc); if (!decl) return [];
  const block = doc.slice(decl.index, end); const out: { from: number; to: number; insert: string }[] = [];
  const re = /\[\s*(-?(?:\d+\.?\d*|\.\d+))\s*,\s*(-?(?:\d+\.?\d*|\.\d+))\s*\]/g;
  for (let m = re.exec(block); m; m = re.exec(block)) {
    if (Math.abs(Number(m[1]) - from[0]) < 1e-9 && Math.abs(Number(m[2]) - from[1]) < 1e-9) out.push({ from: decl.index + m.index, to: decl.index + m.index + m[0].length, insert: pointCode(to) });
  }
  return out;
}

/**
 * A sketch feature's curves for drawing: its geoms rows, or, for a plain outline (sk.polygon(…), sk.rect(…), sk.circle(r, { at })), which reSHape
 * keeps as points only, the outline's sides or its circle (a circle's points are the two ends of a diameter). An outline with rounded, chamfered or
 * bulged corners is not drawn: its straight sides would not be its shape.
 */
export function sketchGeoms(f: { geoms?: unknown; points?: unknown; shape?: unknown; rounds?: unknown; chamfers?: unknown; bulges?: unknown }): SketchGeom[] {
  if (Array.isArray(f.geoms) && f.geoms.length) return f.geoms as SketchGeom[];
  const pts = Array.isArray(f.points) ? (f.points as unknown[]).filter((q): q is V2 => Array.isArray(q) && q.length === 2 && q.every(x => typeof x === 'number')) : [];
  const bent = [f.rounds, f.chamfers, f.bulges].some(x => Array.isArray(x) ? x.some(v => typeof v === 'number' ? v !== 0 : v !== null && v !== undefined) : x !== undefined && x !== null && typeof x === 'object' && Object.keys(x).length > 0);
  if (bent) return [];
  if (f.shape === 'circle' && pts.length === 2) return [{ k: 'circle', c: [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], r: Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) / 2 }];
  if ((f.shape === undefined || f.shape === 'polygon') && pts.length >= 3) return pts.map((a, i) => ({ k: 'line', a, b: pts[(i + 1) % pts.length] }));
  return [];
}

// ---- a size typed while drawing ----------------------------------------------------------------------------------------------

/** The numbers typed: '25', '30, 20', '30 x 20'; null when it is not one or two numbers. */
export function typedNumbers(typed: string): number[] | null {
  const parts = typed.trim().split(/\s*[,x×]\s*|\s+/i).filter(Boolean);
  if (!parts.length || parts.length > 2) return null;
  const ns = parts.map(Number); return ns.every(Number.isFinite) ? ns : null;
}
/**
 * The point a typed size puts down, from the points clicked so far and the pointer (which gives the direction):
 * - line, polyline: the length from the last point, towards the pointer (+x when the pointer is on the point);
 * - rectangle: 'w, h' (or one number: a square) from the first corner, into the pointer's quarter;
 * - circle: the radius, towards the pointer;
 * - arc, after its centre and start: the angle in degrees it turns counter-clockwise from the start.
 * null when nothing can be put down (no first point, a size of 0 or less, or the wrong count of numbers).
 */
export function typedPoint(tool: string, pts: V2[], pointer: V2, typed: string): V2 | null {
  const ns = typedNumbers(typed); if (!ns || !pts.length) return null;
  const r3 = (q: number[]): V2 => [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000];
  const last = pts[pts.length - 1];
  const towards = (from: V2): V2 => { const d = [pointer[0] - from[0], pointer[1] - from[1]]; const l = Math.hypot(d[0], d[1]); return l < 1e-9 ? [1, 0] : [d[0] / l, d[1] / l]; };
  if (tool === 'line' || tool === 'polyline' || tool === 'circle') {
    if (ns.length !== 1 || !(ns[0] > 0)) return null;
    const from = tool === 'circle' ? pts[0] : last; const u = towards(from);
    return r3([from[0] + u[0] * ns[0], from[1] + u[1] * ns[0]]);
  }
  if (tool === 'rectangle') {
    const [w, h] = ns.length === 2 ? ns : [ns[0], ns[0]]; if (!(w > 0) || !(h > 0)) return null;
    const a = pts[0]; const sx = pointer[0] < a[0] ? -1 : 1, sy = pointer[1] < a[1] ? -1 : 1;
    return r3([a[0] + sx * w, a[1] + sy * h]);
  }
  if (tool === 'arc' && pts.length === 2) {
    if (ns.length !== 1 || !(ns[0] !== 0) || Math.abs(ns[0]) >= 360) return null;
    const [c, s] = pts; const t = ns[0] * Math.PI / 180; const d = [s[0] - c[0], s[1] - c[1]];
    return r3([c[0] + d[0] * Math.cos(t) - d[1] * Math.sin(t), c[1] + d[0] * Math.sin(t) + d[1] * Math.cos(t)]);
  }
  return null;
}
/** What the typed size means for the tool, for the readout: 'length 25', 'width 30, height 20', 'radius 5', 'angle 90°'. */
export function typedWords(tool: string, pts: V2[], typed: string): string {
  const ns = typedNumbers(typed); const t = typed.trim();
  if (tool === 'rectangle') return ns && ns.length === 2 ? `width ${fmt(ns[0])}, height ${fmt(ns[1])}` : ns ? `${fmt(ns[0])} square` : t;
  if (tool === 'circle') return `radius ${t}`;
  if (tool === 'arc' && pts.length === 2) return `angle ${t}°`;
  return `length ${t}`;
}

// ---- Delete: which line of the sketch's block drew which curve ---------------------------------------------------------------

/** The lines of a sketch's block that draw (name.something(…)), with where each starts and ends in the doc (its newline included). */
export function sketchStatementLines(doc: string, name: string): { from: number; to: number; text: string }[] {
  const end = sketchBlockEnd(doc, name); if (end === null) return [];
  const esc = name.replace(/\$/g, '\\$');
  const decl = new RegExp(`^\\s*(?:const|let|var)\\s+${esc}\\s*=\\s*sketch\\s*\\(`, 'm').exec(doc); if (!decl) return [];
  const out: { from: number; to: number; text: string }[] = [];
  let at = doc.indexOf('\n', decl.index); // the line after the declaration
  while (at >= 0 && at < end) {
    const from = at + 1; const nl = doc.indexOf('\n', from); const lineEnd = nl < 0 ? doc.length : nl;
    const text = doc.slice(from, lineEnd);
    if (new RegExp(`^\\s*${esc}\\s*\\.`).test(text)) out.push({ from, to: nl < 0 ? lineEnd : nl + 1, text: text.trim() });
    at = nl;
  }
  return out;
}
/**
 * Which drawing line made each curve, from the sketch's curve count with the code cut short after each of its lines (counts[i]:
 * after line i). null when the counts do not add up to the sketch's curves, or go down: then which line drew a curve is not known.
 */
export function curveOwners(counts: number[], total: number): number[] | null {
  const owner: number[] = []; let prev = 0;
  for (let i = 0; i < counts.length; i++) { if (!(counts[i] >= prev)) return null; for (let k = prev; k < counts[i]; k++) owner.push(i); prev = counts[i]; }
  return prev === total ? owner : null;
}
/** The screen distance from a point to a polyline. */
export function distToPolyline(p: V2, pts: V2[]): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]]; const d = [b[0] - a[0], b[1] - a[1]]; const l2 = d[0] * d[0] + d[1] * d[1];
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) / l2)) : 0;
    best = Math.min(best, Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1]));
  }
  return best;
}

// ---- the face a sketch sits on, as closed outlines (the grid is drawn inside them) ----------------------------------------------

/**
 * The part's edges that lie on a sketch plane, in the plane's 2D coordinates, joined into closed outlines: straight edges by their
 * ends, a full circle (start = end) from its start and the point opposite. Pieces that do not close are left out.
 */
export function planeOutlines(edges: { a: V2; b: V2; mid: V2 }[], tol = 1e-6): V2[][] {
  const loops: V2[][] = []; const open: { a: V2; b: V2; pts: V2[] }[] = [];
  const near = (p: V2, q: V2) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= tol;
  for (const e of edges) {
    if (near(e.a, e.b)) { // a whole circle: start and its opposite point (the middle of the edge)
      const c: V2 = [(e.a[0] + e.mid[0]) / 2, (e.a[1] + e.mid[1]) / 2]; const r = Math.hypot(e.a[0] - c[0], e.a[1] - c[1]);
      if (r > tol) loops.push(Array.from({ length: 49 }, (_, i) => [c[0] + r * Math.cos(2 * Math.PI * i / 48), c[1] + r * Math.sin(2 * Math.PI * i / 48)] as V2));
      continue;
    }
    const straight = Math.abs((e.b[0] - e.a[0]) * (e.mid[1] - e.a[1]) - (e.b[1] - e.a[1]) * (e.mid[0] - e.a[0])) <= tol * Math.max(1, Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]));
    open.push({ a: e.a, b: e.b, pts: straight ? [e.a, e.b] : [e.a, e.mid, e.b] });
  }
  while (open.length) {
    const first = open.shift()!; const chain = [...first.pts]; let grew = true;
    while (grew && !near(chain[0], chain[chain.length - 1])) {
      grew = false; const tail = chain[chain.length - 1];
      const i = open.findIndex(x => near(x.a, tail) || near(x.b, tail)); if (i < 0) break;
      const x = open.splice(i, 1)[0]; chain.push(...(near(x.a, tail) ? x.pts.slice(1) : [...x.pts].reverse().slice(1))); grew = true;
    }
    if (chain.length > 3 && near(chain[0], chain[chain.length - 1])) loops.push(chain);
  }
  return loops;
}
