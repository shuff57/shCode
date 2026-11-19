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
  // a slot in the drawing words (reSHape's own slot() cannot share a sketch with them): its two sides and its two caps, counter-clockwise
  slot: (s: string, a: V2, b: V2, r: number) => slotGeoms(a, b, r).map(g => g.k === 'line' ? `${s}.line(${pointCode(g.a)}, ${pointCode(g.b)});`
    : g.k === 'arc' ? `${s}.arc(${pointCode(g.c)}, ${pointCode(g.a)}, ${pointCode(g.b)}, '${g.sense}');` : '').join('\n'),
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
 * A sketch feature's curves for drawing: its geoms rows, or, for a plain outline (sk.polygon(…), sk.rect(…), sk.circle(d, { at }), d the diameter), which reSHape
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
  if (tool === 'slot' && pts.length === 2) {
    if (ns.length !== 1 || !(ns[0] > 0)) return null;
    const [a, b] = pts; const d = [b[0] - a[0], b[1] - a[1]]; const l = Math.hypot(d[0], d[1]); if (!(l > 1e-9)) return null;
    return r3([(a[0] + b[0]) / 2 - d[1] / l * ns[0], (a[1] + b[1]) / 2 + d[0] / l * ns[0]]);
  }
  if (tool === 'arc' && pts.length === 2) {
    if (ns.length !== 1 || !(ns[0] !== 0) || Math.abs(ns[0]) >= 360) return null;
    const [c, s] = pts; const t = ns[0] * Math.PI / 180; const d = [s[0] - c[0], s[1] - c[1]];
    return r3([c[0] + d[0] * Math.cos(t) - d[1] * Math.sin(t), c[1] + d[0] * Math.sin(t) + d[1] * Math.cos(t)]);
  }
  return null;
}
/** The distance from p to the segment ab. */
export function distToSegment(p: V2, a: V2, b: V2): number { return distToPolyline(p, [a, b]); }
/** A slot's outline (the two caps and the two sides), as reSHape's slot(a, b, r) draws it, for the preview. */
export function slotGeoms(a: V2, b: V2, r: number): SketchGeom[] {
  const d = [b[0] - a[0], b[1] - a[1]]; const l = Math.hypot(d[0], d[1]); if (!(l > 1e-9) || !(r > 0)) return [];
  const n: V2 = [-d[1] / l * r, d[0] / l * r]; const r3 = (q: number[]): V2 => [Math.round(q[0] * 1000) / 1000, Math.round(q[1] * 1000) / 1000];
  const a1 = r3([a[0] + n[0], a[1] + n[1]]), a2 = r3([a[0] - n[0], a[1] - n[1]]), b1 = r3([b[0] + n[0], b[1] + n[1]]), b2 = r3([b[0] - n[0], b[1] - n[1]]);
  // counter-clockwise: the side below a to b, the cap round b, the side above back to a, the cap round a
  return [{ k: 'line', a: a2, b: b2 }, { k: 'arc', c: b, r, a: b2, b: b1, sense: 'ccw' }, { k: 'line', a: b1, b: a1 }, { k: 'arc', c: a, r, a: a1, b: a2, sense: 'ccw' }];
}
/** What the typed size means for the tool, for the readout: 'length 25', 'width 30, height 20', 'radius 5', 'angle 90°'. */
export function typedWords(tool: string, pts: V2[], typed: string): string {
  const ns = typedNumbers(typed); const t = typed.trim();
  if (tool === 'rectangle') return ns && ns.length === 2 ? `width ${fmt(ns[0])}, height ${fmt(ns[1])}` : ns ? `${fmt(ns[0])} square` : t;
  if (tool === 'circle' || (tool === 'slot' && pts.length === 2)) return `radius ${t}`;
  if (tool === 'arc' && pts.length === 2) return `angle ${t}°`;
  return `length ${t}`;
}

// ---- dimensions: each curve's size shown on it, and changed by typing a new one ------------------------------------------------

/** Where a curve's size is shown and what it says: a line's length at its middle, a circle's or an arc's radius on it. */
export function dimensionOf(g: SketchGeom): { at: V2; text: string; value: number; kind: 'length' | 'radius' } | null {
  if (g.k === 'line') { const l = Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]); return l > 1e-9 ? { at: [(g.a[0] + g.b[0]) / 2, (g.a[1] + g.b[1]) / 2], text: fmt(l), value: l, kind: 'length' } : null; }
  if (g.k === 'circle') return { at: [g.c[0] + g.r * Math.SQRT1_2, g.c[1] + g.r * Math.SQRT1_2], text: `r ${fmt(g.r)}`, value: g.r, kind: 'radius' };
  if (g.k === 'arc') { const p = geomPath(g, 16); return { at: p[Math.floor(p.length / 2)], text: `r ${fmt(g.r)}`, value: g.r, kind: 'radius' }; }
  return null;
}
const NUM = String.raw`-?(?:\d+\.?\d*|\.\d+)`;
const PT = String.raw`\[\s*(${NUM})\s*,\s*(${NUM})\s*\]`;
/**
 * The code edits that give curve g (drawn by the drawing line `line`, from `doc`) the size `value`, or null when its numbers are not plain
 * numbers there:
 * - a circle, sk.circle([x, y], { r }) or the one-shape sk.circle(d, { at }): its radius (the diameter, twice it);
 * - a side of sk.rectangle(a, b): b moves along that side, so the rectangle gets that width or height and a stays;
 * - any other line: its end b moves along the line, with every [x, y] in the sketch's block that is b (so a corner it shares moves too).
 */
export function resizeEdits(doc: string, name: string, line: { from: number; to: number; text: string }, g: SketchGeom, value: number): { from: number; to: number; insert: string }[] | null {
  if (!(value > 0)) return null;
  const text = doc.slice(line.from, line.to);
  if (g.k === 'circle') {
    let m = new RegExp(String.raw`\.circle\(\s*${PT}\s*,\s*\{\s*r\s*:\s*(${NUM})\s*\}`).exec(text);
    if (m) { const i = line.from + m.index + m[0].lastIndexOf(m[3]); return [{ from: i, to: i + m[3].length, insert: fmt(value) }]; }
    m = new RegExp(String.raw`\.circle\(\s*(${NUM})\s*,\s*\{\s*at\s*:`).exec(text);
    if (m) { const i = line.from + m.index + m[0].indexOf(m[1]); return [{ from: i, to: i + m[1].length, insert: fmt(2 * value) }]; }
    return null;
  }
  if (g.k !== 'line') return null;
  const rect = new RegExp(String.raw`\.rectangle\(\s*${PT}\s*,\s*(${PT})\s*\)`).exec(text);
  if (rect) {
    const [x0, y0, x1, y1] = [rect[1], rect[2], rect[4], rect[5]].map(Number);
    const across = Math.abs(g.a[1] - g.b[1]) < 1e-9; // a side along x: the width
    const nb: V2 = across ? [x0 + Math.sign(x1 - x0 || 1) * value, y1] : [x1, y0 + Math.sign(y1 - y0 || 1) * value];
    const i = line.from + rect.index + rect[0].lastIndexOf(rect[3]);
    return [{ from: i, to: i + rect[3].length, insert: pointCode(nb) }];
  }
  const l = Math.hypot(g.b[0] - g.a[0], g.b[1] - g.a[1]); if (!(l > 1e-9)) return null;
  const nb: V2 = [Math.round((g.a[0] + (g.b[0] - g.a[0]) * value / l) * 1000) / 1000, Math.round((g.a[1] + (g.b[1] - g.a[1]) * value / l) * 1000) / 1000];
  // only when the line's own code holds its end as plain numbers; then every [x, y] of the block that is that end moves with it
  const edits = movePointEdits(doc, name, g.b, nb);
  return edits.some(e => e.from >= line.from && e.to <= line.to) ? edits : null;
}

// ---- Round: a corner where two lines meet, rounded with an arc -----------------------------------------------------------------

/** The corners a pointer can round: ends of the sketch's lines, each once. */
export function lineCorners(geoms: SketchGeom[]): V2[] {
  const out: V2[] = [];
  for (const g of geoms) if (g.k === 'line') for (const q of [g.a, g.b]) if (!out.some(o => Math.hypot(o[0] - q[0], o[1] - q[1]) < 1e-6)) out.push(q);
  return out;
}
/** The two lines that meet at corner q, and the angle between them; a sentence when it is not a corner of two lines. */
export function cornerAt(geoms: SketchGeom[], q: V2): { lines: [number, number]; far: [V2, V2]; half: number } | string {
  const near = (a: V2) => Math.hypot(a[0] - q[0], a[1] - q[1]) < 1e-6;
  const touching = geoms.flatMap((g, i) => g.k === 'line' ? (near(g.a) || near(g.b) ? [i] : []) : g.k === 'arc' && (near(g.a) || near(g.b)) ? [i] : []);
  if (touching.length !== 2 || touching.some(i => geoms[i].k !== 'line')) return 'Only a corner where two lines meet can be rounded.';
  const far = touching.map(i => { const g = geoms[i] as { a: V2; b: V2 }; return near(g.a) ? g.b : g.a; }) as [V2, V2];
  const u = far.map(f => { const d = [f[0] - q[0], f[1] - q[1]]; const l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l]; });
  const cos = Math.max(-1, Math.min(1, u[0][0] * u[1][0] + u[0][1] * u[1][1]));
  const angle = Math.acos(cos);
  if (!(angle > 1e-6) || !(angle < Math.PI - 1e-6)) return 'The two lines run straight on there: there is no corner to round.';
  return { lines: touching as [number, number], far, half: angle / 2 };
}
/** The largest radius corner q takes: the round may use up the whole of the shorter line, which then goes (rounded down to 0.001). */
export function largestRound(geoms: SketchGeom[], q: V2): number | null {
  const c = cornerAt(geoms, q); if (typeof c === 'string') return null;
  const short = Math.min(...c.far.map(f => Math.hypot(f[0] - q[0], f[1] - q[1])));
  return Math.floor(short * Math.tan(c.half) * 1000 + 1e-6) / 1000;
}
/** The round's arc and where it meets the two lines, for the preview; a sentence when that radius does not fit. */
export function roundGeom(geoms: SketchGeom[], q: V2, r: number): { arc: SketchGeom & { k: 'arc' }; ends: [V2, V2]; lines: [number, number]; used: [boolean, boolean] } | string {
  const c = cornerAt(geoms, q); if (typeof c === 'string') return c;
  if (!(r > 0)) return 'Give a radius above 0.';
  const t = r / Math.tan(c.half); const r3 = (p: number[]): V2 => [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000];
  const lens = c.far.map(f => Math.hypot(f[0] - q[0], f[1] - q[1]));
  if (lens.some(l => t > l + 1e-6)) { const most = largestRound(geoms, q); return `A radius of ${fmt(r)} does not fit between these lines${most && most > 0 ? `; the largest is ${fmt(most)}` : ''}.`; }
  const u = c.far.map((f, i) => [(f[0] - q[0]) / lens[i], (f[1] - q[1]) / lens[i]]);
  // a round that uses up a whole line meets the line's far end, and the line goes
  const used = lens.map(l => Math.abs(t - l) <= 1e-6) as [boolean, boolean];
  const ends = u.map((d, i) => used[i] ? c.far[i] : r3([q[0] + d[0] * t, q[1] + d[1] * t])) as [V2, V2];
  const bis = [u[0][0] + u[1][0], u[0][1] + u[1][1]]; const bl = Math.hypot(bis[0], bis[1]); const k = r / Math.sin(c.half) / bl;
  const centre = r3([q[0] + bis[0] * k, q[1] + bis[1] * k]);
  // the short way round, written counter-clockwise: from the end where turning left takes it to the other
  const cross = (ends[0][0] - centre[0]) * (ends[1][1] - centre[1]) - (ends[0][1] - centre[1]) * (ends[1][0] - centre[0]);
  const [a, b] = cross > 0 ? ends : [ends[1], ends[0]];
  return { arc: { k: 'arc', c: centre, r, a, b, sense: 'ccw' }, ends, lines: c.lines, used };
}
/**
 * Rounding corner q of sketch `name` with radius r: the code edits and the arc line written. The lines that meet there are shortened to where
 * the round meets them, and the arc goes after the later of their lines. A rectangle or a polyline that one of them belongs to is written out
 * as its separate lines first (the drawing words have no rounded rectangle). Only lines written as plain numbers are changed; for one written
 * with a variable, a sentence says so. `lines` and `owner` are the block's drawing lines and which of them drew each curve.
 */
export function roundEdits(doc: string, name: string, lines: { from: number; to: number; text: string }[], owner: number[], geoms: SketchGeom[], q: V2, r: number):
  { edits: { from: number; to: number; insert: string }[]; arcCode: string } | string {
  const g = roundGeom(geoms, q, r); if (typeof g === 'string') return g;
  const esc = name.replace(/\$/g, '\\$');
  const plain = [String.raw`^${esc}\.line\(\s*${PT}\s*,\s*${PT}\s*\);?$`, String.raw`^${esc}\.rectangle\(\s*${PT}\s*,\s*${PT}\s*\);?$`,
    String.raw`^${esc}\.lines\(\s*\[\s*${PT}(?:\s*,\s*${PT})*\s*\]\s*\);?$`].map(s => new RegExp(s));
  const ks = [...new Set(g.lines.map(i => owner[i]))].sort((x, y) => x - y);
  for (const k of ks) {
    const l = lines[k]; if (!l || !plain.some(re => re.test(l.text))) return 'That corner is written with a variable or a sum; change it in the code.';
    const mine = geoms.flatMap((x, i) => owner[i] === k ? [x] : []);
    if (mine.some(x => x.k !== 'line' || [...x.a, ...x.b].some(v => Math.abs(Number(fmt(v)) - v) > 1e-9))) return 'That corner is written with more than three decimals; change it in the code.';
  }
  const arcCode = `${name}.arc(${pointCode(g.arc.c)}, ${pointCode(g.arc.a)}, ${pointCode(g.arc.b)}, 'ccw');`;
  const near = (a: V2) => Math.hypot(a[0] - q[0], a[1] - q[1]) < 1e-6;
  const edits = ks.map(k => {
    const l = lines[k]; const raw = doc.slice(l.from, l.to); const indent = /^\s*/.exec(raw)![0]; const nl = raw.endsWith('\n') ? '\n' : '';
    const out = geoms.flatMap((x, i) => {
      if (owner[i] !== k || x.k !== 'line') return [];
      const j = g.lines.indexOf(i); if (j >= 0 && g.used[j]) return [];
      const end = (p: V2) => j >= 0 && near(p) ? g.ends[j] : p;
      return [`${name}.line(${pointCode(end(x.a))}, ${pointCode(end(x.b))});`];
    });
    if (k === ks[ks.length - 1]) out.push(arcCode);
    return { from: l.from, to: l.to, insert: out.length ? out.map(s => indent + s).join('\n') + nl : '' };
  });
  return { edits, arcCode };
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
