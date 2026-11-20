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
/**
 * A number to 1e-9, for a point that has to sit on an arc: reSHape refuses a sketch whose rules (an arc's two ends on one circle) miss by more
 * than 1e-6 mm, which a point rounded to 0.001 usually does. A number that is exact to 0.001 is written as short as before.
 */
export function fmt9(n: number): string { const r = Math.round(n * 1e9) / 1e9; return String(Object.is(r, -0) ? 0 : r); }
export const pointExact = (q: V2) => `[${fmt9(q[0])}, ${fmt9(q[1])}]`;
const r9 = (p: number[]): V2 => [Math.round(p[0] * 1e9) / 1e9, Math.round(p[1] * 1e9) / 1e9];
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
  slot: (s: string, a: V2, b: V2, r: number) => slotGeoms(a, b, r).map(g => g.k === 'line' ? `${s}.line(${pointExact(g.a)}, ${pointExact(g.b)});`
    : g.k === 'arc' ? `${s}.arc(${pointCode(g.c)}, ${pointExact(g.a)}, ${pointExact(g.b)}, '${g.sense}');` : '').join('\n'),
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

/** An arc from a, counter-clockwise, to where the ray towards b crosses its circle (that end written to 1e-9, so it is on the circle). */
export function arcCode(s: string, c: V2, a: V2, b: V2): string | null {
  const r = Math.hypot(a[0] - c[0], a[1] - c[1]); const d = Math.hypot(b[0] - c[0], b[1] - c[1]);
  if (r < 1e-9 || d < 1e-9) return null;
  const end: V2 = [c[0] + (b[0] - c[0]) * r / d, c[1] + (b[1] - c[1]) * r / d];
  if (Math.hypot(end[0] - a[0], end[1] - a[1]) < 1e-9) return null;
  return `${s}.arc(${pointCode(c)}, ${pointCode(a)}, ${pointExact(end)}, 'ccw');`;
}
/**
 * Moving a drawn point: the [x, y] literals in sketch `name`'s block whose value is `from` are rewritten as `to` (every one, so a
 * corner two lines share, or a closed outline's first and last point, move together). Only plain number literals are found; a
 * point written with a variable or a sum is not, and nothing is changed for it. A plain `sk.rectangle(a, b)` also moves by the
 * two corners its code does not write: [b.x, a.y] and [a.x, b.y] become the new corner, its sides staying level and upright.
 * The changes to make, in the document's offsets; `code` writes the new point (to 0.001 unless told otherwise).
 */
export function movePointEdits(doc: string, name: string, from: V2, to: V2, code: (q: V2) => string = pointCode): { from: number; to: number; insert: string }[] {
  const end = sketchBlockEnd(doc, name); if (end === null) return [];
  const esc = name.replace(/\$/g, '\\$');
  const decl = new RegExp(`^\\s*(?:const|let|var)\\s+${esc}\\s*=\\s*sketch\\s*\\(`, 'm').exec(doc); if (!decl) return [];
  const block = doc.slice(decl.index, end); const out: { from: number; to: number; insert: string }[] = [];
  const same = (x: string, y: string, p: V2) => Math.abs(Number(x) - p[0]) < 1e-9 && Math.abs(Number(y) - p[1]) < 1e-9;
  const taken: [number, number][] = [];
  const rect = new RegExp(String.raw`\.rectangle\(\s*(${PT})\s*,\s*(${PT})\s*\)`, 'g');
  for (let m = rect.exec(block); m; m = rect.exec(block)) {
    const [x0, y0, x1, y1] = [m[2], m[3], m[5], m[6]];
    const a: V2 | null = same(x1, y0, from) ? [Number(x0), to[1]] : same(x0, y1, from) ? [to[0], Number(y0)] : null;
    if (!a) continue;
    const b: V2 = same(x1, y0, from) ? [to[0], Number(y1)] : [Number(x1), to[1]];
    const s = decl.index + m.index + m[0].indexOf(m[1]); const e = decl.index + m.index + m[0].lastIndexOf(m[4]) + m[4].length;
    out.push({ from: s, to: e, insert: `${code(a)}, ${code(b)}` }); taken.push([s, e]);
  }
  const re = new RegExp(PT, 'g');
  for (let m = re.exec(block); m; m = re.exec(block)) {
    const s = decl.index + m.index;
    if (same(m[1], m[2], from) && !taken.some(([ts, te]) => s >= ts && s < te)) out.push({ from: s, to: s + m[0].length, insert: code(to) });
  }
  return out.sort((p, q) => p.from - q.from);
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
    return r9([from[0] + u[0] * ns[0], from[1] + u[1] * ns[0]]);
  }
  if (tool === 'rectangle') {
    const [w, h] = ns.length === 2 ? ns : [ns[0], ns[0]]; if (!(w > 0) || !(h > 0)) return null;
    const a = pts[0]; const sx = pointer[0] < a[0] ? -1 : 1, sy = pointer[1] < a[1] ? -1 : 1;
    return r9([a[0] + sx * w, a[1] + sy * h]);
  }
  if (tool === 'slot' && pts.length === 2) {
    if (ns.length !== 1 || !(ns[0] > 0)) return null;
    const [a, b] = pts; const d = [b[0] - a[0], b[1] - a[1]]; const l = Math.hypot(d[0], d[1]); if (!(l > 1e-9)) return null;
    return r9([(a[0] + b[0]) / 2 - d[1] / l * ns[0], (a[1] + b[1]) / 2 + d[0] / l * ns[0]]);
  }
  if (tool === 'arc' && pts.length === 2) {
    if (ns.length !== 1 || !(ns[0] !== 0) || Math.abs(ns[0]) >= 360) return null;
    const [c, s] = pts; const t = ns[0] * Math.PI / 180; const d = [s[0] - c[0], s[1] - c[1]];
    return r9([c[0] + d[0] * Math.cos(t) - d[1] * Math.sin(t), c[1] + d[0] * Math.sin(t) + d[1] * Math.cos(t)]);
  }
  return null;
}
/** The distance from p to the segment ab. */
export function distToSegment(p: V2, a: V2, b: V2): number { return distToPolyline(p, [a, b]); }
/** A slot's outline (the two caps and the two sides), as reSHape's slot(a, b, r) draws it, for the preview. */
export function slotGeoms(a: V2, b: V2, r: number): SketchGeom[] {
  const d = [b[0] - a[0], b[1] - a[1]]; const l = Math.hypot(d[0], d[1]); if (!(l > 1e-9) || !(r > 0)) return [];
  const n: V2 = [-d[1] / l * r, d[0] / l * r];
  const a1 = r9([a[0] + n[0], a[1] + n[1]]), a2 = r9([a[0] - n[0], a[1] - n[1]]), b1 = r9([b[0] + n[0], b[1] + n[1]]), b2 = r9([b[0] - n[0], b[1] - n[1]]);
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

// ---- Round and Chamfer: a corner where two curves meet, each a line or an arc --------------------------------------------------

type ArcGeom = SketchGeom & { k: 'arc' };
const sub2 = (a: number[], b: number[]): V2 => [a[0] - b[0], a[1] - b[1]];
const dot2 = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1];
const cross2 = (a: number[], b: number[]) => a[0] * b[1] - a[1] * b[0];
const len2 = (a: number[]) => Math.hypot(a[0], a[1]);
const ang2 = (a: number[]) => Math.atan2(a[1], a[0]);
const turn2pi = (x: number) => { const t = 2 * Math.PI; return ((x % t) + t) % t; };
const at6 = (a: V2, q: V2) => Math.hypot(a[0] - q[0], a[1] - q[1]) < 1e-6;
/** An arc's sweep from a to b in its sense, in (0, 2π]. */
function arcSweep(g: ArcGeom): number { const d = ang2(sub2(g.b, g.c)) - ang2(sub2(g.a, g.c)); const s = turn2pi(g.sense === 'cw' ? -d : d); return s < 1e-12 ? 2 * Math.PI : s; }
/**
 * A line or an arc seen from its end at corner q: the way it leaves q (t), its other end (far), and for an arc its centre, radius, sweep, and
 * s = +1 when leaving q turns it counter-clockwise about its centre (−1 clockwise).
 */
interface FromCorner { k: 'line' | 'arc'; t: V2; far: V2; len: number; c: V2; R: number; s: number; sweep: number; atA: boolean }
function fromCorner(g: SketchGeom, q: V2): FromCorner {
  if (g.k === 'line') {
    const atA = at6(g.a, q); const far = atA ? g.b : g.a; const d = sub2(far, q); const len = len2(d);
    return { k: 'line', t: [d[0] / len, d[1] / len], far, len, c: q, R: 0, s: 0, sweep: 0, atA };
  }
  const a = g as ArcGeom; const atA = at6(a.a, q); const p = atA ? a.a : a.b; const s = (a.sense === 'cw' ? -1 : 1) * (atA ? 1 : -1);
  // its radius is taken from its far end, the end it is written from once cut (reSHape takes an arc's radius from its start)
  const rho = sub2(p, a.c); const R = len2(sub2(atA ? a.b : a.a, a.c)); const rl = len2(rho);
  return { k: 'arc', t: [-s * rho[1] / rl, s * rho[0] / rl], far: atA ? a.b : a.a, len: 0, c: a.c, R, s, sweep: arcSweep(a), atA };
}
/** How far round arc f a point X is from the corner end (radians, in [0, 2π)). */
const roundFrom = (f: FromCorner, q: V2, X: number[]) => turn2pi(f.s * (ang2(sub2(X, f.c)) - ang2(sub2(q, f.c))));
const pairWords = (geoms: SketchGeom[], ix: number[]) => {
  const arcs = ix.filter(i => geoms[i].k === 'arc').length;
  return arcs === 0 ? 'these lines' : arcs === 1 ? 'the line and the arc' : 'the two arcs';
};

/** The corners a pointer can round or chamfer: ends of the sketch's lines and arcs, each once. */
export function cutCorners(geoms: SketchGeom[]): V2[] {
  const out: V2[] = [];
  for (const g of geoms) if (g.k === 'line' || g.k === 'arc') for (const q of [g.a, g.b]) if (!out.some(o => at6(o, q))) out.push(q);
  return out;
}
/**
 * The two curves (lines or arcs) that meet at corner q, their far ends, and half the angle between the ways they leave it; a sentence when it
 * is not a corner of two of them (to round or to chamfer).
 */
export function cornerAt(geoms: SketchGeom[], q: V2, verb: 'round' | 'chamfer' = 'round'): { lines: [number, number]; far: [V2, V2]; half: number; arcs: boolean } | string {
  const touching = geoms.flatMap((g, i) => (g.k === 'line' || g.k === 'arc') && (at6(g.a, q) || at6(g.b, q)) ? [i] : []);
  if (touching.length !== 2) return `Only a corner where two lines or arcs meet can be ${verb === 'round' ? 'rounded' : 'chamfered'}.`;
  const fs = touching.map(i => fromCorner(geoms[i], q));
  const arcs = fs.some(f => f.k === 'arc');
  const angle = Math.acos(Math.max(-1, Math.min(1, dot2(fs[0].t, fs[1].t))));
  if (!(angle > 1e-6) || !(angle < Math.PI - 1e-6)) return arcs ? `They run on smoothly there: there is no corner to ${verb}.` : `The two lines run straight on there: there is no corner to ${verb}.`;
  return { lines: touching as [number, number], far: [fs[0].far, fs[1].far], half: angle / 2, arcs };
}
/**
 * The round of radius r at corner q, exactly (not yet written to 1e-9): its centre and where it meets each curve, or null when it does not fit.
 * Its centre is where the two curves' offsets by r towards the inside of the corner cross (a line's offset is a line, an arc's a circle of
 * radius R ± r), the crossing nearest the corner whose touching points lie on both curves.
 */
function roundAt(geoms: SketchGeom[], ix: [number, number], q: V2, r: number): { centre: V2; ends: [V2, V2]; used: [boolean, boolean] } | null {
  const fs = ix.map(i => fromCorner(geoms[i], q));
  const side = Math.sign(cross2(fs[0].t, fs[1].t));
  type Off = { k: 'L'; p: V2; d: V2 } | { k: 'C'; c: V2; r: number };
  const offs: Off[] = [];
  for (let n = 0; n < 2; n++) {
    const f = fs[n]; const sg = n === 0 ? side : -side; const nrm: V2 = [-f.t[1] * sg, f.t[0] * sg];
    if (f.k === 'line') { offs.push({ k: 'L', p: [q[0] + nrm[0] * r, q[1] + nrm[1] * r], d: f.t }); continue; }
    const inside = dot2(nrm, sub2(f.c, q)) > 0;
    if (inside && r >= f.R - 1e-9) return null;
    offs.push({ k: 'C', c: f.c, r: inside ? f.R - r : f.R + r });
  }
  const cands: V2[] = [];
  const lineCircle = (L: { p: V2; d: V2 }, C: { c: V2; r: number }) => {
    const w = sub2(L.p, C.c); const b = dot2(L.d, w); const disc = b * b - (dot2(w, w) - C.r * C.r);
    if (disc < -1e-12) return; const sq = Math.sqrt(Math.max(0, disc));
    for (const l of [-b - sq, -b + sq]) cands.push([L.p[0] + L.d[0] * l, L.p[1] + L.d[1] * l]);
  };
  const [o0, o1] = offs;
  if (o0.k === 'L' && o1.k === 'L') {
    const den = cross2(o0.d, o1.d); if (Math.abs(den) > 1e-12) { const l = cross2(sub2(o1.p, o0.p), o1.d) / den; cands.push([o0.p[0] + o0.d[0] * l, o0.p[1] + o0.d[1] * l]); }
  } else if (o0.k === 'L' && o1.k === 'C') lineCircle(o0, o1);
  else if (o0.k === 'C' && o1.k === 'L') lineCircle(o1, o0);
  else if (o0.k === 'C' && o1.k === 'C') {
    const d = sub2(o1.c, o0.c); const D = len2(d);
    if (D > 1e-12 && D <= o0.r + o1.r + 1e-9 && D >= Math.abs(o0.r - o1.r) - 1e-9) {
      const a = (o0.r * o0.r - o1.r * o1.r + D * D) / (2 * D); const h = Math.sqrt(Math.max(0, o0.r * o0.r - a * a));
      const m: V2 = [o0.c[0] + d[0] * a / D, o0.c[1] + d[1] * a / D];
      cands.push([m[0] - d[1] * h / D, m[1] + d[0] * h / D], [m[0] + d[1] * h / D, m[1] - d[0] * h / D]);
    }
  }
  let best: { centre: V2; ends: [V2, V2]; used: [boolean, boolean] } | null = null; let bd = Infinity;
  for (const P of cands) {
    const touch = fs.map(f => {
      if (f.k === 'line') { const s = dot2(sub2(P, q), f.t); return s > 1e-9 && s <= f.len + 1e-6 ? { T: [q[0] + f.t[0] * s, q[1] + f.t[1] * s] as V2, used: Math.abs(s - f.len) <= 1e-6 } : null; }
      const u = sub2(P, f.c); const ul = len2(u); if (ul < 1e-12) return null;
      const T: V2 = [f.c[0] + u[0] * f.R / ul, f.c[1] + u[1] * f.R / ul]; const phi = roundFrom(f, q, T);
      return phi > 1e-9 && phi <= f.sweep + 1e-6 / f.R ? { T, used: Math.abs(phi - f.sweep) * f.R <= 1e-6 } : null;
    });
    if (!touch[0] || !touch[1]) continue;
    const dq = len2(sub2(P, q)); if (dq < bd) { bd = dq; best = { centre: P, ends: [touch[0].T, touch[1].T], used: [touch[0].used, touch[1].used] }; }
  }
  return best;
}
/** The largest radius corner q takes, rounded down to 0.001 (between two lines: the round may use up the whole of the shorter one). */
export function largestRound(geoms: SketchGeom[], q: V2): number | null {
  const c = cornerAt(geoms, q); if (typeof c === 'string') return null;
  if (!c.arcs) {
    const short = Math.min(...c.far.map(f => Math.hypot(f[0] - q[0], f[1] - q[1])));
    return Math.floor(short * Math.tan(c.half) * 1000 + 1e-6) / 1000;
  }
  // with an arc: the largest that still fits, found by halving (a round grows away from the corner along both curves as r grows)
  const fits = (r: number) => roundAt(geoms, c.lines, q, r) !== null;
  if (!fits(1e-3)) return 0;
  let lo = 1e-3, hi = 2e-3;
  while (fits(hi) && hi < 1e7) { lo = hi; hi *= 2; }
  for (let n = 0; n < 60; n++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
  return Math.floor(lo * 1000 + 1e-6) / 1000;
}
/** The round's arc and where it meets the two curves, for the preview; a sentence when that radius does not fit. */
export function roundGeom(geoms: SketchGeom[], q: V2, r: number): { arc: ArcGeom; ends: [V2, V2]; lines: [number, number]; used: [boolean, boolean] } | string {
  const c = cornerAt(geoms, q); if (typeof c === 'string') return c;
  if (!(r > 0)) return 'Give a radius above 0.';
  if (c.arcs) {
    const s = roundAt(geoms, c.lines, q, r);
    if (!s) { const most = largestRound(geoms, q); return `A radius of ${fmt(r)} does not fit between ${pairWords(geoms, c.lines)}${most && most > 0 ? `; the largest is ${fmt(most)}` : ''}.`; }
    const centre = r9(s.centre); const ends = s.ends.map((T, i) => s.used[i] ? c.far[i] : r9(T)) as [V2, V2];
    // counter-clockwise from one end to the other, the way that passes the corner's side of the centre
    const a0 = ang2(sub2(ends[0], centre)); const mid = a0 + turn2pi(ang2(sub2(ends[1], centre)) - a0) / 2;
    const m: V2 = [centre[0] + Math.cos(mid), centre[1] + Math.sin(mid)]; const m2: V2 = [2 * centre[0] - m[0], 2 * centre[1] - m[1]];
    const [a, b] = len2(sub2(m, q)) <= len2(sub2(m2, q)) ? ends : [ends[1], ends[0]];
    return { arc: { k: 'arc', c: centre, r, a, b, sense: 'ccw' }, ends, lines: c.lines, used: s.used };
  }
  const t = r / Math.tan(c.half);
  const lens = c.far.map(f => Math.hypot(f[0] - q[0], f[1] - q[1]));
  if (lens.some(l => t > l + 1e-6)) { const most = largestRound(geoms, q); return `A radius of ${fmt(r)} does not fit between these lines${most && most > 0 ? `; the largest is ${fmt(most)}` : ''}.`; }
  const u = c.far.map((f, i) => [(f[0] - q[0]) / lens[i], (f[1] - q[1]) / lens[i]]);
  // a round that uses up a whole line meets the line's far end, and the line goes
  const used = lens.map(l => Math.abs(t - l) <= 1e-6) as [boolean, boolean];
  const ends = u.map((d, i) => used[i] ? c.far[i] : r9([q[0] + d[0] * t, q[1] + d[1] * t])) as [V2, V2];
  const bis = [u[0][0] + u[1][0], u[0][1] + u[1][1]]; const bl = Math.hypot(bis[0], bis[1]); const k = r / Math.sin(c.half) / bl;
  const centre = r9([q[0] + bis[0] * k, q[1] + bis[1] * k]);
  // the short way round, written counter-clockwise: from the end where turning left takes it to the other
  const cross = (ends[0][0] - centre[0]) * (ends[1][1] - centre[1]) - (ends[0][1] - centre[1]) * (ends[1][0] - centre[0]);
  const [a, b] = cross > 0 ? ends : [ends[1], ends[0]];
  return { arc: { k: 'arc', c: centre, r, a, b, sense: 'ccw' }, ends, lines: c.lines, used };
}
/** The largest chamfer distance corner q takes, rounded down to 0.001: a line's length; an arc's chord to its far end, or its diameter past half a turn. */
export function largestChamfer(geoms: SketchGeom[], q: V2): number | null {
  const c = cornerAt(geoms, q, 'chamfer'); if (typeof c === 'string') return null;
  const most = Math.min(...c.lines.map(i => { const f = fromCorner(geoms[i], q); return f.k === 'line' ? f.len : f.sweep >= Math.PI ? 2 * f.R : len2(sub2(f.far, q)); }));
  return Math.floor(most * 1000 + 1e-6) / 1000;
}
/**
 * A chamfer of corner q: a cut at the same distance d from the corner on each curve (along a line; on an arc, the point that far from the
 * corner in a straight line), joined by a straight line; a sentence when d does not fit.
 */
export function chamferGeom(geoms: SketchGeom[], q: V2, d: number): { cut: SketchGeom & { k: 'line' }; ends: [V2, V2]; lines: [number, number]; used: [boolean, boolean] } | string {
  const c = cornerAt(geoms, q, 'chamfer'); if (typeof c === 'string') return c;
  if (!(d > 0)) return 'Give a distance above 0.';
  const most = largestChamfer(geoms, q)!;
  const fs = c.lines.map(i => fromCorner(geoms[i], q));
  const tooFar = fs.some(f => f.k === 'line' ? d > f.len + 1e-6 : 2 * Math.asin(Math.min(1, d / (2 * f.R))) > f.sweep + 1e-6 / f.R || d > 2 * f.R + 1e-6);
  if (tooFar) return `A distance of ${fmt(d)} does not fit along ${pairWords(geoms, c.lines)}; the largest is ${fmt(most)}.`;
  const cutOn = (f: FromCorner): { T: V2; used: boolean } => {
    if (f.k === 'line') return { T: [q[0] + f.t[0] * d, q[1] + f.t[1] * d], used: Math.abs(d - f.len) <= 1e-6 };
    const phi = 2 * Math.asin(Math.min(1, d / (2 * f.R))); const a = ang2(sub2(q, f.c)) + f.s * phi;
    return { T: [f.c[0] + f.R * Math.cos(a), f.c[1] + f.R * Math.sin(a)], used: Math.abs(phi - f.sweep) * f.R <= 1e-6 };
  };
  const cuts = fs.map(cutOn); const used = cuts.map(x => x.used) as [boolean, boolean];
  const ends = cuts.map((x, i) => x.used ? c.far[i] : r9(x.T)) as [V2, V2];
  return { cut: { k: 'line', a: ends[0], b: ends[1] }, ends, lines: c.lines, used };
}
/** What is left of curve g once its corner end q is moved to `end`, written from its far end (an arc keeps its radius exactly that way). */
function cutCurve(g: SketchGeom, q: V2, end: V2): SketchGeom {
  if (g.k === 'line') return at6(g.a, q) ? { k: 'line', a: end, b: g.b } : { k: 'line', a: g.a, b: end };
  const a = g as ArcGeom; const sense = a.sense === 'cw' ? 'cw' : 'ccw';
  return at6(a.a, q) ? { k: 'arc', c: a.c, r: a.r, a: a.b, b: end, sense: sense === 'cw' ? 'ccw' : 'cw' } : { k: 'arc', c: a.c, r: a.r, a: a.a, b: end, sense };
}
/** The preview of a round or chamfer: along the first curve from its far end to the cut, across the corner, and along the other to its far end. */
export function cutPreview(geoms: SketchGeom[], q: V2, g: { ends: [V2, V2]; lines: [number, number]; used: [boolean, boolean]; arc?: ArcGeom }, pieces = 32): V2[] {
  const piece = (n: number): V2[] => g.used[n] ? [g.ends[n]] : geomPath(cutCurve(geoms[g.lines[n]], q, g.ends[n]), pieces);
  let across: V2[] = g.ends;
  if (g.arc) { across = geomPath(g.arc, pieces); if (!at6(g.arc.a, g.ends[0])) across.reverse(); }
  return [...piece(0), ...across, ...piece(1).reverse()];
}
/** A curve in the drawing words, its points to 1e-9. */
export function curveCode(name: string, g: SketchGeom): string {
  if (g.k === 'line') return `${name}.line(${pointExact(g.a)}, ${pointExact(g.b)});`;
  if (g.k === 'arc') return `${name}.arc(${pointExact(g.c)}, ${pointExact(g.a)}, ${pointExact(g.b)}, '${g.sense === 'cw' ? 'cw' : 'ccw'}');`;
  if (g.k === 'circle') return `${name}.circle(${pointExact(g.c)}, { r: ${fmt9(g.r)} });`;
  return '';
}
/**
 * The code edits that change some of sketch `name`'s curves: `change(i)` gives what curve i becomes (nothing, one curve, or several), or null to
 * leave it. Each line of the block that drew a changed curve is written again as its curves one by one in the drawing words (a rectangle or a
 * polyline as its separate lines: the drawing words have no rounded, chamfered or trimmed rectangle), and `added` after the last of those lines.
 * Only lines written as plain numbers (to nine decimals) are changed; for others a sentence about `what` ("corner", "line", ...) says so.
 * `lines` and `owner` are the block's drawing lines and which of them drew each curve.
 */
function rewriteCurves(doc: string, name: string, lines: { from: number; to: number; text: string }[], owner: number[], geoms: SketchGeom[],
  changed: number[], change: (i: number) => SketchGeom[] | null, added: string[], what: string): { from: number; to: number; insert: string }[] | string {
  const esc = name.replace(/\$/g, '\\$');
  const many = [String.raw`^${esc}\.line\(\s*${PT}\s*,\s*${PT}\s*\);?$`, String.raw`^${esc}\.rectangle\(\s*${PT}\s*,\s*${PT}\s*\);?$`,
    String.raw`^${esc}\.lines\(\s*\[\s*${PT}(?:\s*,\s*${PT})*\s*\]\s*\);?$`].map(s => new RegExp(s));
  const arcLine = new RegExp(String.raw`^${esc}\.arc\(\s*${PT}\s*,\s*${PT}\s*,\s*${PT}\s*,\s*(['"])(?:ccw|cw)\7\s*\);?$`);
  const circleLine = new RegExp(String.raw`^${esc}\.circle\(\s*${PT}\s*,\s*\{\s*r\s*:\s*${NUM}\s*\}\s*\);?$`);
  const ks = [...new Set(changed.map(i => owner[i]))].sort((x, y) => x - y);
  const nineDecimals = (vs: number[]) => vs.every(v => Math.abs(Number(fmt9(v)) - v) <= 1e-12);
  for (const k of ks) {
    const l = lines[k]; const kind = !l ? null : arcLine.test(l.text) ? 'arc' : circleLine.test(l.text) ? 'circle' : many.some(re => re.test(l.text)) ? 'line' : null;
    if (!kind) return `That ${what} is written with a variable or a sum; change it in the code.`;
    const mine = geoms.flatMap((x, i) => owner[i] === k ? [x] : []);
    const ok = kind === 'line' ? mine.every(x => x.k === 'line' && nineDecimals([...x.a, ...x.b]))
      : mine.length === 1 && mine[0].k === kind && nineDecimals(mine[0].k === 'arc' ? [...mine[0].c, ...mine[0].a, ...mine[0].b] : mine[0].k === 'circle' ? [...mine[0].c, mine[0].r] : []);
    if (!ok) return `That ${what} is written with more than nine decimals; change it in the code.`;
  }
  return ks.map(k => {
    const l = lines[k]; const raw = doc.slice(l.from, l.to); const indent = /^\s*/.exec(raw)![0]; const nl = raw.endsWith('\n') ? '\n' : '';
    const out = geoms.flatMap((x, i) => owner[i] !== k ? [] : (change(i) ?? [x]).map(y => curveCode(name, y)));
    if (k === ks[ks.length - 1]) out.push(...added);
    return { from: l.from, to: l.to, insert: out.length ? out.map(s => indent + s).join('\n') + nl : '' };
  });
}
/**
 * The code edits that cut corner q of sketch `name`: the two curves that meet there end at `cut.ends` instead (one used up goes), and `added` is
 * written after the later of their lines; an arc is written again from its far end, so its radius stays as it was (see rewriteCurves).
 */
function cornerCutEdits(doc: string, name: string, lines: { from: number; to: number; text: string }[], owner: number[], geoms: SketchGeom[], q: V2,
  cut: { ends: [V2, V2]; lines: [number, number]; used: [boolean, boolean] }, added: string): { from: number; to: number; insert: string }[] | string {
  return rewriteCurves(doc, name, lines, owner, geoms, cut.lines, i => {
    const j = cut.lines.indexOf(i); if (j < 0) return null;
    return cut.used[j] ? [] : [cutCurve(geoms[i], q, cut.ends[j])];
  }, [added], 'corner');
}
/** Rounding corner q of sketch `name` with radius r: the code edits, and the arc line written after the two lines (see cornerCutEdits). */
export function roundEdits(doc: string, name: string, lines: { from: number; to: number; text: string }[], owner: number[], geoms: SketchGeom[], q: V2, r: number):
  { edits: { from: number; to: number; insert: string }[]; arcCode: string } | string {
  const g = roundGeom(geoms, q, r); if (typeof g === 'string') return g;
  const arcCode = `${name}.arc(${pointExact(g.arc.c)}, ${pointExact(g.arc.a)}, ${pointExact(g.arc.b)}, 'ccw');`;
  const edits = cornerCutEdits(doc, name, lines, owner, geoms, q, g, arcCode);
  return typeof edits === 'string' ? edits : { edits, arcCode };
}
/** Chamfering corner q of sketch `name` by d from the corner on each curve: the code edits, and the line written across the corner. */
export function chamferEdits(doc: string, name: string, lines: { from: number; to: number; text: string }[], owner: number[], geoms: SketchGeom[], q: V2, d: number):
  { edits: { from: number; to: number; insert: string }[]; lineCode: string } | string {
  const g = chamferGeom(geoms, q, d); if (typeof g === 'string') return g;
  const lineCode = `${name}.line(${pointExact(g.cut.a)}, ${pointExact(g.cut.b)});`;
  const edits = cornerCutEdits(doc, name, lines, owner, geoms, q, g, lineCode);
  return typeof edits === 'string' ? edits : { edits, lineCode };
}

// ---- Trim: the piece of a curve between the two crossings nearest the pointer, cut away -----------------------------------------

type Carrier = { k: 'L'; p: V2; d: V2 } | { k: 'C'; c: V2; r: number };
const carrierOf = (g: SketchGeom): Carrier | null => g.k === 'line' ? { k: 'L', p: g.a, d: sub2(g.b, g.a) } : g.k === 'arc' || g.k === 'circle' ? { k: 'C', c: g.c, r: g.r } : null;
/** Where curve g runs, as a number along it: a line 0 to 1 from a to b; an arc the turn from a in its sense; a circle the angle from +x, counter-clockwise. */
function along(g: SketchGeom, X: number[]): number {
  if (g.k === 'line') { const d = sub2(g.b, g.a); return dot2(sub2(X, g.a), d) / dot2(d, d); }
  if (g.k === 'arc') { const t = ang2(sub2(X, g.c)) - ang2(sub2(g.a, g.c)); return turn2pi(g.sense === 'cw' ? -t : t); }
  if (g.k === 'circle') return turn2pi(ang2(sub2(X, g.c)));
  return 0;
}
/** How long curve g is, in its own measure (see along). */
const lengthOf = (g: SketchGeom) => g.k === 'line' ? 1 : g.k === 'arc' ? arcSweep(g as ArcGeom) : 2 * Math.PI;
/** Whether a point on curve g's carrier lies on the curve itself (its ends included). */
function onCurve(g: SketchGeom, X: V2): boolean {
  if (g.k === 'circle') return true;
  if (g.k === 'line') { const t = along(g, X); const l = len2(sub2(g.b, g.a)); return t >= -1e-9 / l && t <= 1 + 1e-9 / l; }
  if (g.k === 'arc') { const t = along(g, X); const s = arcSweep(g as ArcGeom); return t <= s + 1e-9 / g.r || t >= 2 * Math.PI - 1e-9 / g.r; }
  return false;
}
/** Where curves g and h cross or touch (one's end on the other counts). */
export function crossings(g: SketchGeom, h: SketchGeom): V2[] {
  return carrierMeets(g, h).filter(X => onCurve(g, X) && onCurve(h, X));
}
/** Where the carriers of g and h meet: g's and h's lines run on for ever, their arcs go all the way round. */
function carrierMeets(g: SketchGeom, h: SketchGeom): V2[] {
  const A = carrierOf(g), B = carrierOf(h); if (!A || !B) return [];
  const pts: V2[] = [];
  const lineCircle = (L: { p: V2; d: V2 }, C: { c: V2; r: number }) => {
    const dl = len2(L.d); const u: V2 = [L.d[0] / dl, L.d[1] / dl]; const w = sub2(L.p, C.c); const b = dot2(u, w); const disc = b * b - (dot2(w, w) - C.r * C.r);
    if (disc < -1e-9 * Math.max(1, C.r)) return; const sq = Math.sqrt(Math.max(0, disc));
    for (const l of sq < 1e-12 ? [-b] : [-b - sq, -b + sq]) pts.push([L.p[0] + u[0] * l, L.p[1] + u[1] * l]);
  };
  if (A.k === 'L' && B.k === 'L') {
    const den = cross2(A.d, B.d); if (Math.abs(den) < 1e-12 * len2(A.d) * len2(B.d)) return []; // parallel lines: an overlap is not a crossing
    const t = cross2(sub2(B.p, A.p), B.d) / den; pts.push([A.p[0] + A.d[0] * t, A.p[1] + A.d[1] * t]);
  } else if (A.k === 'L' && B.k === 'C') lineCircle(A, B);
  else if (A.k === 'C' && B.k === 'L') lineCircle(B, A);
  else if (A.k === 'C' && B.k === 'C') {
    const d = sub2(B.c, A.c); const D = len2(d); if (D < 1e-12) return [];
    if (D > A.r + B.r + 1e-9 || D < Math.abs(A.r - B.r) - 1e-9) return [];
    const a = (A.r * A.r - B.r * B.r + D * D) / (2 * D); const h2 = A.r * A.r - a * a; const hh = Math.sqrt(Math.max(0, h2));
    const m: V2 = [A.c[0] + d[0] * a / D, A.c[1] + d[1] * a / D];
    pts.push([m[0] - d[1] * hh / D, m[1] + d[0] * hh / D]); if (hh > 1e-12) pts.push([m[0] + d[1] * hh / D, m[1] - d[0] * hh / D]);
  }
  return pts;
}
/** A point put on the nearest of `ends` within 1e-7 of it, so two curves meet by value; else written to 1e-9. */
function nearEnd(ends: V2[], raw: V2): V2 {
  let best: V2 | null = null; let bd = 1e-7;
  for (const e of ends) { const d = len2(sub2(e, raw)); if (d < bd) { bd = d; best = e; } }
  return best ?? r9(raw);
}
const kindWord = (g: SketchGeom) => g.k === 'circle' ? 'circle' : g.k === 'arc' ? 'arc' : 'line';
/**
 * Trimming curve i of `geoms` at plane point p (the pointer, on or near the curve): the piece between the two crossings with the other curves
 * nearest p is cut away, and the rest is kept (a line or arc: up to two pieces; a circle crossed twice or more: the arc that is left). With
 * nothing crossing it, the whole curve goes. A crossing within 1e-7 of another curve's end is put on that end exactly, so the two meet by value;
 * the rest are written to 1e-9.
 */
export function trimGeom(geoms: SketchGeom[], i: number, p: V2): { piece: SketchGeom; keep: SketchGeom[]; whole: boolean; kind: string } | string {
  const g = geoms[i]; if (!g || (g.k !== 'line' && g.k !== 'arc' && g.k !== 'circle')) return 'Only a line, an arc or a circle can be trimmed.';
  const ends = geoms.flatMap((h, j) => j !== i && (h.k === 'line' || h.k === 'arc') ? [h.a, h.b] : []);
  const total = lengthOf(g); const eps = g.k === 'line' ? 1e-9 / len2(sub2(g.b, g.a)) : 1e-9 / g.r;
  const cuts: { t: number; X: V2 }[] = [];
  for (let j = 0; j < geoms.length; j++) {
    if (j === i) continue;
    for (const raw of crossings(g, geoms[j])) {
      const X = nearEnd(ends, raw); const t = along(g, X);
      if (g.k !== 'circle' && (t < eps || t > total - eps || t > total)) continue; // the curve's own ends are no cut
      if (!cuts.some(c => Math.abs(c.t - t) < eps || len2(sub2(c.X, X)) < 1e-9)) cuts.push({ t, X });
    }
  }
  cuts.sort((x, y) => x.t - y.t);
  const kind = kindWord(g);
  if (g.k === 'circle') {
    if (cuts.length < 2) return { piece: g, keep: [], whole: true, kind };
    const tp = along(g, p); let k = cuts.length - 1; for (let n = 0; n < cuts.length; n++) if (cuts[n].t <= tp) k = n;
    const lo = cuts[k], hi = cuts[(k + 1) % cuts.length];
    return { piece: { k: 'arc', c: g.c, r: g.r, a: lo.X, b: hi.X, sense: 'ccw' }, keep: [{ k: 'arc', c: g.c, r: g.r, a: hi.X, b: lo.X, sense: 'ccw' }], whole: false, kind };
  }
  if (!cuts.length) return { piece: g, keep: [], whole: true, kind };
  let tp = along(g, p); if (g.k === 'arc' && tp > total) tp = tp - total < 2 * Math.PI - tp ? total : 0; tp = Math.max(0, Math.min(total, tp));
  const bounds = [{ t: 0, X: g.a }, ...cuts, { t: total, X: g.b }];
  let n = 0; while (n < bounds.length - 2 && bounds[n + 1].t <= tp) n++;
  const lo = bounds[n], hi = bounds[n + 1]; const keep: SketchGeom[] = [];
  const part = (a: V2, b: V2): SketchGeom => g.k === 'line' ? { k: 'line', a, b } : { k: 'arc', c: g.c, r: g.r, a, b, sense: g.sense === 'cw' ? 'cw' : 'ccw' };
  if (n > 0) keep.push(part(g.a, lo.X));
  if (n + 1 < bounds.length - 1) keep.push(part(hi.X, g.b));
  return { piece: part(lo.X, hi.X), keep, whole: false, kind };
}
/** Trimming curve i of sketch `name` at p: the code edits, and the code of what is left of it (see trimGeom, rewriteCurves). */
export function trimEdits(doc: string, name: string, lines: { from: number; to: number; text: string }[], owner: number[], geoms: SketchGeom[], i: number, p: V2):
  { edits: { from: number; to: number; insert: string }[]; keepCode: string[]; kind: string } | string {
  const t = trimGeom(geoms, i, p); if (typeof t === 'string') return t;
  const edits = rewriteCurves(doc, name, lines, owner, geoms, [i], j => j === i ? t.keep : null, [], t.kind);
  return typeof edits === 'string' ? edits : { edits, keepCode: t.keep.map(g => curveCode(name, g)), kind: t.kind };
}

// ---- Extend: a line or an arc grown from the end nearer the pointer to the first curve in its way ---------------------------------

/**
 * Extending curve i of `geoms` from its end nearer plane point p: that end moves on (a line straight on, an arc on round its circle, in either
 * case away from its other end) to the first place it meets another curve. That place is put on another curve's end when within 1e-7 of it,
 * else written to 1e-9. `piece` is what is added; a sentence when the curve is not a line or an arc, or nothing lies ahead of that end.
 */
export function extendGeom(geoms: SketchGeom[], i: number, p: V2): { grown: SketchGeom; piece: SketchGeom; to: V2; kind: string } | string {
  const g = geoms[i]; if (!g || (g.k !== 'line' && g.k !== 'arc')) return 'Only a line or an arc can be extended.';
  const kind = kindWord(g); const total = lengthOf(g); const tp = along(g, p);
  // which end: for an arc, a pointer off the arc counts with the end it is nearer round the circle
  const atB = g.k === 'line' ? tp > 0.5 : tp <= total ? tp > total / 2 : tp - total < 2 * Math.PI - tp;
  const ends = geoms.flatMap((h, j) => j !== i && (h.k === 'line' || h.k === 'arc') ? [h.a, h.b] : []);
  const eps = g.k === 'line' ? 1e-9 / len2(sub2(g.b, g.a)) : 1e-9 / g.r;
  let best: { ahead: number; X: V2 } | null = null;
  for (let j = 0; j < geoms.length; j++) {
    if (j === i) continue;
    for (const raw of carrierMeets(g, geoms[j])) {
      if (!onCurve(geoms[j], raw)) continue;
      const X = nearEnd(ends, raw); const t = along(g, X);
      const ahead = g.k === 'line' ? (atB ? t - 1 : -t) : (atB ? t - total : 2 * Math.PI - t);
      if (!(ahead > eps) || (g.k === 'arc' && (t <= total + eps || ahead >= 2 * Math.PI - total - eps))) continue;
      if (!best || ahead < best.ahead) best = { ahead, X };
    }
  }
  if (!best) return `Nothing lies ahead of this end of the ${kind}.`;
  const X = best.X; const from = atB ? g.b : g.a;
  if (g.k === 'line') return { grown: atB ? { k: 'line', a: g.a, b: X } : { k: 'line', a: X, b: g.b }, piece: { k: 'line', a: from, b: X }, to: X, kind };
  const sense = g.sense === 'cw' ? 'cw' : 'ccw'; const other = sense === 'cw' ? 'ccw' : 'cw';
  return { grown: { k: 'arc', c: g.c, r: g.r, a: atB ? g.a : X, b: atB ? X : g.b, sense }, piece: { k: 'arc', c: g.c, r: g.r, a: from, b: X, sense: atB ? sense : other }, to: X, kind };
}
/** Extending curve i of sketch `name` from its end nearer p: the code edits, and the code of the grown curve (see extendGeom, rewriteCurves). */
export function extendEdits(doc: string, name: string, lines: { from: number; to: number; text: string }[], owner: number[], geoms: SketchGeom[], i: number, p: V2):
  { edits: { from: number; to: number; insert: string }[]; code: string; kind: string } | string {
  const t = extendGeom(geoms, i, p); if (typeof t === 'string') return t;
  const edits = rewriteCurves(doc, name, lines, owner, geoms, [i], j => j === i ? [t.grown] : null, [], t.kind);
  return typeof edits === 'string' ? edits : { edits, code: curveCode(name, t.grown), kind: t.kind };
}

// ---- Tangent arc: an arc that leaves a line's or an arc's free end without a corner -------------------------------------------

/**
 * The way the curve ending at q runs on past it (a line straight on, an arc along its tangent there), and which curve that is; a sentence when
 * no line or arc ends at q, or two curves do (then there is no one way to run on).
 */
export function tangentAt(geoms: SketchGeom[], q: V2): { t: V2; i: number } | string {
  const at = geoms.flatMap((g, k) => (g.k === 'line' || g.k === 'arc') && (at6(g.a, q) || at6(g.b, q)) ? [k] : []);
  if (!at.length) return 'Click the end of a line or arc.';
  if (at.length > 1) return 'Two curves end there: click the free end of a line or arc.';
  const f = fromCorner(geoms[at[0]], q); return { t: [0 - f.t[0], 0 - f.t[1]], i: at[0] };
}
/**
 * The arc that leaves q along t (a unit vector) and ends at e: its centre is on the normal to t at q, as far from e as from q, written to
 * 1e-9. Null when e is q, or on the line through q along t (straight on or straight back: no arc gets there leaving that way).
 */
export function tangentArc(q: V2, t: V2, e: V2): SketchGeom & { k: 'arc' } | null {
  const d = sub2(e, q); const n: V2 = [-t[1], t[0]]; const nd = dot2(n, d); const dd = dot2(d, d);
  if (dd < 1e-18 || Math.abs(nd) < 1e-9 * Math.sqrt(dd)) return null;
  const s = dd / (2 * nd);
  return { k: 'arc', c: r9([q[0] + n[0] * s, q[1] + n[1] * s]), r: Math.abs(s), a: q, b: e, sense: s > 0 ? 'ccw' : 'cw' };
}

// ---- Mirror: a curve's mirror image about a line of the sketch -----------------------------------------------------------------

/** Whether two curves are the same curve (a line either way round; an arc the same piece of the same circle, either way round). */
function sameCurve(g: SketchGeom, h: SketchGeom): boolean {
  const eq = (p: number[], q: number[]) => len2(sub2(p, q)) < 1e-9;
  if (g.k === 'line' && h.k === 'line') return (eq(g.a, h.a) && eq(g.b, h.b)) || (eq(g.a, h.b) && eq(g.b, h.a));
  if (g.k === 'circle' && h.k === 'circle') return eq(g.c, h.c) && Math.abs(g.r - h.r) < 1e-9;
  if (g.k === 'arc' && h.k === 'arc') return eq(g.c, h.c) && ((g.sense === h.sense && eq(g.a, h.a) && eq(g.b, h.b)) || (g.sense !== h.sense && eq(g.a, h.b) && eq(g.b, h.a)));
  return false;
}
/**
 * The mirror image of curve i of `geoms` about the line through about[0] and about[1]: a line's two ends, an arc's centre and ends (it then
 * turns the other way), a circle's centre, each put on a curve's end when within 1e-7 of it, else written to 1e-9. A sentence when it is not
 * a line, an arc or a circle, is its own mirror image, or its mirror image is drawn already.
 */
export function mirrorGeom(geoms: SketchGeom[], about: [V2, V2], i: number): { copy: SketchGeom; kind: string } | string {
  const g = geoms[i]; if (!g || (g.k !== 'line' && g.k !== 'arc' && g.k !== 'circle')) return 'Only a line, an arc or a circle can be mirrored.';
  const A = about[0]; const D = sub2(about[1], A); const L = len2(D); const u: V2 = [D[0] / L, D[1] / L];
  const ends = geoms.flatMap(h => h.k === 'line' || h.k === 'arc' ? [h.a, h.b] : []);
  const m = (p: V2): V2 => { const d = sub2(p, A); const k = 2 * dot2(u, d); const raw: V2 = [A[0] + k * u[0] - d[0], A[1] + k * u[1] - d[1]]; return nearEnd(ends, raw); };
  const kind = kindWord(g);
  const copy: SketchGeom = g.k === 'line' ? { k: 'line', a: m(g.a), b: m(g.b) } : g.k === 'circle' ? { k: 'circle', c: r9(m(g.c)), r: g.r }
    : { k: 'arc', c: r9(m(g.c)), r: g.r, a: m(g.a), b: m(g.b), sense: g.sense === 'cw' ? 'ccw' : 'cw' };
  if (sameCurve(copy, g)) return `This ${kind} is its own mirror image.`;
  if (geoms.some(h => sameCurve(copy, h))) return `Its mirror image is drawn already.`;
  return { copy, kind };
}

// ---- Offset: a copy of a curve, or of the chain of curves joined end to end with it, a distance to one side ---------------------

type Piece = (SketchGeom & { k: 'line' }) | ArcGeom;
const flip = (g: Piece): Piece => g.k === 'line' ? { k: 'line', a: g.b, b: g.a } : { k: 'arc', c: g.c, r: g.r, a: g.b, b: g.a, sense: g.sense === 'cw' ? 'ccw' : 'cw' };
/**
 * The chain of lines and arcs joined end to end through curve i, each turned to run on from the one before (curve i as drawn), and where
 * curve i is in it. A joint where more than two curves end stops the chain there. Closed when it comes back round to curve i.
 */
export function offsetChain(geoms: SketchGeom[], i: number): { pieces: Piece[]; closed: boolean; at: number } | null {
  const g = geoms[i]; if (!g || (g.k !== 'line' && g.k !== 'arc')) return null;
  const others = (q: V2, not: number) => geoms.flatMap((h, k) => k !== not && (h.k === 'line' || h.k === 'arc') && (at6(h.a, q) || at6(h.b, q)) ? [k] : []);
  const used = new Set([i]); const fwd: Piece[] = [g as Piece]; const back: Piece[] = []; let closed = false;
  for (let cur = i, piece = g as Piece; ;) {
    const o = others(piece.b, cur); if (o.length !== 1) break;
    if (o[0] === i) { closed = true; break; } if (used.has(o[0])) break;
    const h = geoms[o[0]] as Piece; piece = at6(h.a, piece.b) ? h : flip(h); cur = o[0]; used.add(cur); fwd.push(piece);
  }
  if (!closed) for (let cur = i, piece = g as Piece; ;) {
    const o = others(piece.a, cur); if (o.length !== 1 || used.has(o[0])) break;
    const h = geoms[o[0]] as Piece; piece = at6(h.b, piece.a) ? h : flip(h); cur = o[0]; used.add(cur); back.unshift(piece);
  }
  return { pieces: [...back, ...fwd], closed, at: back.length };
}
/** How far plane point p is from curve g's carrier (a line run on for ever, an arc's whole circle). */
export function offsetDistance(g: SketchGeom, p: V2): number {
  if (g.k === 'line') { const d = sub2(g.b, g.a); return Math.abs(cross2(d, sub2(p, g.a))) / len2(d); }
  return g.k === 'arc' || g.k === 'circle' ? Math.abs(len2(sub2(p, g.c)) - g.r) : 0;
}
/**
 * The offset of curve i of `geoms` by d on the side of plane point p: a circle's concentric circle; else every curve of its chain (offsetChain)
 * moved d to that side (a line along itself, an arc to a radius d more or less about the same centre), each two that follow on meeting where
 * their carriers cross (a sharp corner; where they ran on smoothly, they still meet without one). Points are written to 1e-9. A sentence when
 * it cannot be: a line turned round, an arc past its centre or round the other way, two neighbours that do not meet, or the offset running
 * into itself.
 */
export function offsetGeoms(geoms: SketchGeom[], i: number, p: V2, d: number): { pieces: SketchGeom[]; kind: string } | string {
  const g = geoms[i]; if (!g || (g.k !== 'line' && g.k !== 'arc' && g.k !== 'circle')) return 'Only a line, an arc or a circle can be offset.';
  if (!(d > 0)) return 'Give a distance above 0.';
  const tooFar = `At ${fmt(d)} the offset runs into itself; give a smaller distance.`;
  if (g.k === 'circle') {
    const R = len2(sub2(p, g.c)) < g.r ? g.r - d : g.r + d;
    return R > 1e-9 ? { pieces: [{ k: 'circle', c: g.c, r: r9([R, 0])[0] }], kind: 'circle' } : tooFar;
  }
  const ch = offsetChain(geoms, i)!; const P = ch.pieces; const me = P[ch.at];
  const left = me.k === 'line' ? cross2(sub2(me.b, me.a), sub2(p, me.a)) >= 0 : (len2(sub2(p, me.c)) < me.r) === (me.sense === 'ccw');
  const dd = left ? d : -d;
  const out: Piece[] = [];
  for (const q of P) {
    if (q.k === 'line') { const u = sub2(q.b, q.a); const l = len2(u); const n: V2 = [-u[1] / l * dd, u[0] / l * dd]; out.push({ k: 'line', a: [q.a[0] + n[0], q.a[1] + n[1]], b: [q.b[0] + n[0], q.b[1] + n[1]] }); continue; }
    const R = q.r - (q.sense === 'ccw' ? dd : -dd); if (!(R > 1e-9)) return tooFar;
    const at = (x: V2): V2 => [q.c[0] + (x[0] - q.c[0]) * R / q.r, q.c[1] + (x[1] - q.c[1]) * R / q.r];
    out.push({ k: 'arc', c: q.c, r: R, a: at(q.a), b: at(q.b), sense: q.sense });
  }
  // neighbours meet: where their carriers cross nearest where they end now, or where they already meet
  const n = out.length; const joints = ch.closed ? n : n - 1;
  for (let k = 0; k < joints; k++) {
    const A = out[k], B = out[(k + 1) % n]; const mid: V2 = [(A.b[0] + B.a[0]) / 2, (A.b[1] + B.a[1]) / 2];
    let X: V2 | null = len2(sub2(A.b, B.a)) < 1e-9 ? mid : null;
    if (!X) for (const c of carrierMeets(A, B)) if (!X || len2(sub2(c, mid)) < len2(sub2(X, mid))) X = c;
    if (!X) return `At ${fmt(d)} two of these curves no longer meet; give a smaller distance.`;
    A.b = r9(X); B.a = A.b;
  }
  for (const q of out) { if (q.k === 'line') { q.a = r9(q.a); q.b = r9(q.b); } }
  if (!ch.closed) for (const q of [out[0], out[n - 1]]) if (q.k === 'arc') { q.a = r9(q.a); q.b = r9(q.b); }
  // the same way round as before, and not running into itself
  for (let k = 0; k < n; k++) {
    const q = out[k], o = P[k];
    if (q.k === 'line' && o.k === 'line' && !(dot2(sub2(q.b, q.a), sub2(o.b, o.a)) > 0)) return tooFar;
    if (q.k === 'arc' && o.k === 'arc' && Math.abs(arcSweep(q) - arcSweep(o)) >= Math.PI) return tooFar;
  }
  for (let x = 0; x < n; x++) for (let y = x + 1; y < n; y++) {
    const shared = [...(y === x + 1 ? [out[x].b] : []), ...(ch.closed && x === 0 && y === n - 1 ? [out[0].a] : [])];
    if (crossings(out[x], out[y]).some(X => !shared.some(s2 => len2(sub2(s2, X)) < 1e-7))) return tooFar;
  }
  return { pieces: out, kind: n > 1 ? (ch.closed ? 'outline' : 'curves') : kindWord(g) };
}

// ---- Angle dimensions: the angle where two lines meet, changed by turning one of them about the corner -------------------------

/** An angle to show: at corner q of lines i and j (i drawn first), in degrees, with the ways the two lines leave q. */
export interface AngleDim { q: V2; i: number; j: number; value: number; ui: V2; uj: V2 }
/**
 * The angles to show: one at each corner where exactly two curves end and both are lines, unless they run straight on, or are a level and
 * an upright line (that right angle the grid shows, and every rectangle would have four).
 */
export function angleDims(geoms: SketchGeom[]): AngleDim[] {
  const out: AngleDim[] = [];
  const level = (t: V2) => Math.abs(t[0]) < 1e-12 || Math.abs(t[1]) < 1e-12;
  for (const q of cutCorners(geoms)) {
    const at = geoms.flatMap((g, k) => (g.k === 'line' || g.k === 'arc') && (at6(g.a, q) || at6(g.b, q)) ? [k] : []);
    if (at.length !== 2 || at.some(k => geoms[k].k !== 'line')) continue;
    const [i, j] = at; const fi = fromCorner(geoms[i], q), fj = fromCorner(geoms[j], q);
    if (!(fi.len > 1e-9 && fj.len > 1e-9)) continue;
    if (level(fi.t) && level(fj.t) && Math.abs(dot2(fi.t, fj.t)) < 1e-12) continue;
    const s = Math.abs(cross2(fi.t, fj.t)); if (s < 1e-9) continue;
    out.push({ q, i, j, value: Math.atan2(s, dot2(fi.t, fj.t)) * 180 / Math.PI, ui: fi.t, uj: fj.t });
  }
  return out;
}
/**
 * The code edits that make angle d `value` degrees (above 0, below 180): the later line turns about the corner and keeps its length; when it
 * cannot, the earlier one does. Its far end is written to 1e-9, with every [x, y] of the block that is that end (so a line that shares the end
 * follows it, see movePointEdits). A line turns only when its far end is written as plain numbers in its own line, and only lines end there,
 * none of them a rectangle's side (an arc or a circle there would be left off its curve). Null when neither line can turn.
 */
export function angleEdits(doc: string, name: string, lines: { from: number; to: number; text: string }[], owner: number[], geoms: SketchGeom[],
  d: AngleDim, value: number): { from: number; to: number; insert: string }[] | null {
  if (!(value > 0 && value < 180)) return null;
  for (const [t, f] of [[d.j, d.i], [d.i, d.j]]) {
    const gt = geoms[t], gf = geoms[f]; const own = lines[owner[t]]; if (!gt || !gf || !own) continue;
    const ft = fromCorner(gt, d.q), ff = fromCorner(gf, d.q); const F = ft.far;
    const there = geoms.flatMap((g, k) => ((g.k === 'line' || g.k === 'arc') && (at6(g.a, F) || at6(g.b, F))) || ((g.k === 'arc' || g.k === 'circle') && at6(g.c, F)) ? [k] : []);
    if (there.some(k => geoms[k].k !== 'line' || !lines[owner[k]] || /\.rectangle\(/.test(lines[owner[k]].text))) continue;
    const re = new RegExp(PT, 'g'); let written = false;
    for (let m = re.exec(own.text); m; m = re.exec(own.text)) if (Math.abs(Number(m[1]) - F[0]) < 1e-9 && Math.abs(Number(m[2]) - F[1]) < 1e-9) written = true;
    if (!written) continue;
    const th = (Math.sign(cross2(ff.t, ft.t)) || 1) * value * Math.PI / 180; const c = Math.cos(th), s = Math.sin(th);
    const u: V2 = [ff.t[0] * c - ff.t[1] * s, ff.t[0] * s + ff.t[1] * c];
    const edits = movePointEdits(doc, name, F, r9([d.q[0] + u[0] * ft.len, d.q[1] + u[1] * ft.len]), pointExact);
    if (edits.some(e => e.from >= own.from && e.to <= own.to)) return edits;
  }
  return null;
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
