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
