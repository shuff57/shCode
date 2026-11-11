// The Font maker's drawing (phase 3 of the fonts work, 2026-11-12): what a
// student draws for each letter, how it becomes a font outline, and how a
// whole drawing becomes a real font file.
//
// A FontDoc is kept beside the font it made (the Library item's `meta`, the
// browser's `fontmeta:<name>`), so the Font maker can reopen a font to edit it
// and a classmate's Remix opens a copy. It is JSON with short keys, because it
// counts against the student's 500 KB of fonts.
//
// Every piece -- a pen stroke, a line, an arc, an ellipse, a box, grid squares,
// a point-and-curve shape -- is turned into polygons, and all of a letter's
// polygons are merged
// (polygon-clipping's union), so overlapping strokes become ONE clean outline
// and a ring (an outlined circle or box) keeps its hole. The merged outline is
// what goes into the font, written by opentype.js. Point-and-curve shapes are
// combined with each other first by XOR, so a shape drawn inside another is a
// hole (the middle of an O) and two shapes drawn apart are both filled. Coordinates are font units:
// 1000 to the em, y up from the baseline (0), capitals 700 tall, small letters
// 500, descenders down to -200.
//
// No DOM here: the editor (components/FontEditor.tsx) and the tests
// (scripts/test-font-doc.mjs) both use it.

import polygonClipping from 'polygon-clipping';
import opentype from 'opentype.js';

export const EM = 1000;
export const ASCENDER = 800;
export const DESCENDER = -200;
export const CAP_HEIGHT = 700;
export const X_HEIGHT = 500;
export const DEFAULT_ADVANCE = 600;
export const SPACE_ADVANCE = 300;
/** The most a saved drawing may be (JSON characters); the server allows the same for a font's meta. */
export const MAX_DOC_BYTES = 48 * 1024;
/** How far a curve may stray from its true line when it is turned into straight pieces, in font units. */
const TOLERANCE = 1.5;

export type P = [number, number];
/** A point of a point-and-curve shape and its curve handle (dx, dy from the point; 0, 0 is a sharp corner). */
export type CurvePt = [number, number, number, number];
/** One thing drawn on a letter. `w` is a line's thickness; 0 means filled (ellipse, box). */
export type Piece =
  | { t: 'pen'; p: P[]; w: number }
  | { t: 'line'; a: P; b: P; w: number }
  | { t: 'arc'; a: P; m: P; b: P; w: number }
  | { t: 'ellipse'; a: P; b: P; w: number }
  | { t: 'box'; a: P; b: P; w: number }
  | { t: 'grid'; s: number; c: P[] }
  | { t: 'curve'; p: CurvePt[] };
export interface Glyph { adv: number; pieces: Piece[] }
export interface FontDoc { v: 1; glyphs: Record<string, Glyph> }

/** The characters the Font maker offers, in the order of its letter strip. */
export const CHARSET: string[] = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...'abcdefghijklmnopqrstuvwxyz', ...'0123456789',
  ...'.,!?:;\'"-+=*/()[]<>#$%&@_~^|\\`{}',
];

export function emptyDoc(): FontDoc {
  return { v: 1, glyphs: {} };
}

// ---- geometry ---------------------------------------------------------------

type Ring = P[];
type Poly = Ring[]; // [outer, ...holes]

function circlePoints(cx: number, cy: number, rx: number, ry: number): Ring {
  const r = Math.max(rx, ry, 1);
  const n = Math.max(12, Math.ceil(Math.PI / Math.acos(Math.max(-1, 1 - TOLERANCE / r))));
  const out: Ring = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  out.push(out[0]);
  return out;
}

/** A thick straight segment with round ends (a capsule), as one ring. */
function capsule(a: P, b: P, w: number): Ring {
  const r = w / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 0.01) return circlePoints(a[0], a[1], r, r);
  const ang = Math.atan2(dy, dx);
  const steps = Math.max(6, Math.ceil(Math.PI / Math.acos(Math.max(-1, 1 - TOLERANCE / Math.max(r, 1))) / 2));
  const out: Ring = [];
  // Round end at b (from the left side to the right side), then round end at a.
  for (let i = 0; i <= steps; i++) {
    const t = ang + Math.PI / 2 - (i / steps) * Math.PI;
    out.push([b[0] + Math.cos(t) * r, b[1] + Math.sin(t) * r]);
  }
  for (let i = 0; i <= steps; i++) {
    const t = ang - Math.PI / 2 - (i / steps) * Math.PI;
    out.push([a[0] + Math.cos(t) * r, a[1] + Math.sin(t) * r]);
  }
  out.push(out[0]);
  return out;
}

/** The points along the circle through a, m and b, from a to b by way of m; a straight line if they are in a row. */
export function arcPoints(a: P, m: P, b: P): P[] {
  const ax = a[0], ay = a[1], bx = m[0], by = m[1], cx = b[0], cy = b[1];
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-6) return [a, b];
  const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  const r = Math.hypot(ax - ux, ay - uy);
  if (r > 1e6) return [a, b];
  const t0 = Math.atan2(ay - uy, ax - ux);
  const tm = Math.atan2(by - uy, bx - ux);
  const t1 = Math.atan2(cy - uy, cx - ux);
  const norm = (x: number) => ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  // Go counter-clockwise from t0 to t1 if m lies on that way round, else clockwise.
  const ccw = norm(tm - t0) < norm(t1 - t0);
  const sweep = ccw ? norm(t1 - t0) : -norm(t0 - t1);
  const n = Math.max(4, Math.ceil(Math.abs(sweep) / Math.acos(Math.max(-1, 1 - TOLERANCE / Math.max(r, 1)))));
  const out: P[] = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + (sweep * i) / n;
    out.push([ux + Math.cos(t) * r, uy + Math.sin(t) * r]);
  }
  return out;
}

/**
 * The closed outline of a point-and-curve shape, as points along it. Between
 * two points the line is a cubic curve whose controls are the first point plus
 * its handle and the second point minus its handle, so a point's handle bends
 * the line through it smoothly on both sides; no handle is a sharp corner.
 */
export function curveRing(pts: CurvePt[]): Ring {
  const out: Ring = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0, h0x, h0y] = pts[i];
    const [x3, y3, h3x, h3y] = pts[(i + 1) % n];
    const c1: P = [x0 + h0x, y0 + h0y], c2: P = [x3 - h3x, y3 - h3y];
    const straight = h0x === 0 && h0y === 0 && h3x === 0 && h3y === 0;
    const len = Math.hypot(c1[0] - x0, c1[1] - y0) + Math.hypot(c2[0] - c1[0], c2[1] - c1[1]) + Math.hypot(x3 - c2[0], y3 - c2[1]);
    const steps = straight ? 1 : Math.max(6, Math.ceil(len / 12));
    for (let k = 0; k < steps; k++) {
      const t = k / steps, u = 1 - t;
      out.push([
        u * u * u * x0 + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * x3,
        u * u * u * y0 + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * y3,
      ]);
    }
  }
  if (out.length) out.push(out[0]);
  return out;
}

function strokePolys(pts: P[], w: number): Poly[] {
  if (!pts.length || !(w > 0)) return [];
  if (pts.length === 1) return [[circlePoints(pts[0][0], pts[0][1], w / 2, w / 2)]];
  const out: Poly[] = [];
  for (let i = 1; i < pts.length; i++) out.push([capsule(pts[i - 1], pts[i], w)]);
  return out;
}

function rectRing(x0: number, y0: number, x1: number, y1: number): Ring {
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
}

/** The polygons one piece covers (overlapping one another is fine: they are merged). */
export function piecePolys(piece: Piece): Poly[] {
  switch (piece.t) {
    case 'pen': return strokePolys(piece.p, piece.w);
    case 'line': return strokePolys([piece.a, piece.b], piece.w);
    case 'arc': return strokePolys(arcPoints(piece.a, piece.m, piece.b), piece.w);
    case 'ellipse': {
      const cx = (piece.a[0] + piece.b[0]) / 2, cy = (piece.a[1] + piece.b[1]) / 2;
      const rx = Math.abs(piece.b[0] - piece.a[0]) / 2, ry = Math.abs(piece.b[1] - piece.a[1]) / 2;
      if (rx < 1 || ry < 1) return [];
      if (!(piece.w > 0)) return [[circlePoints(cx, cy, rx, ry)]];
      const h = piece.w / 2;
      const outer = circlePoints(cx, cy, rx + h, ry + h);
      if (rx - h < 1 || ry - h < 1) return [[outer]];
      return [[outer, circlePoints(cx, cy, rx - h, ry - h)]];
    }
    case 'box': {
      const x0 = Math.min(piece.a[0], piece.b[0]), x1 = Math.max(piece.a[0], piece.b[0]);
      const y0 = Math.min(piece.a[1], piece.b[1]), y1 = Math.max(piece.a[1], piece.b[1]);
      if (x1 - x0 < 1 || y1 - y0 < 1) return [];
      if (!(piece.w > 0)) return [[rectRing(x0, y0, x1, y1)]];
      const h = piece.w / 2;
      const outer = rectRing(x0 - h, y0 - h, x1 + h, y1 + h);
      if (x1 - x0 <= piece.w || y1 - y0 <= piece.w) return [[outer]];
      return [[outer, rectRing(x0 + h, y0 + h, x1 - h, y1 - h)]];
    }
    case 'grid':
      return piece.c.map(([col, row]) => [rectRing(col * piece.s, row * piece.s, (col + 1) * piece.s, (row + 1) * piece.s)]);
    case 'curve':
      return piece.p.length >= 3 ? [[curveRing(piece.p)]] : [];
  }
}

/** Drop points that lie (within `tol`) on the line between their neighbours: Ramer-Douglas-Peucker. */
export function simplify(pts: P[], tol: number): P[] {
  if (pts.length < 3) return pts.slice();
  const keep = new Array(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [i0, i1] = stack.pop()!;
    const [ax, ay] = pts[i0], [bx, by] = pts[i1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let far = -1, best = tol;
    for (let i = i0 + 1; i < i1; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
      if (d > best) { best = d; far = i; }
    }
    if (far >= 0) { keep[far] = true; stack.push([i0, far], [far, i1]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/**
 * simplify() for a closed ring (first point = last). Measuring against the line
 * from the first point to the last would measure against a single point, so the
 * ring is split at its point farthest from the start and each half simplified.
 */
export function simplifyRing(ring: Ring, tol: number): Ring {
  if (ring.length < 5) return ring.slice();
  let far = 1, best = -1;
  for (let i = 1; i < ring.length - 1; i++) {
    const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]);
    if (d > best) { best = d; far = i; }
  }
  const a = simplify(ring.slice(0, far + 1), tol);
  const b = simplify(ring.slice(far), tol);
  return [...a, ...b.slice(1)];
}

function ringArea(r: Ring): number {
  let a = 0;
  for (let i = 1; i < r.length; i++) a += r[i - 1][0] * r[i][1] - r[i][0] * r[i - 1][1];
  return a / 2;
}

/**
 * A letter's outline: every piece merged into polygons with holes, simplified
 * and rounded to whole font units. Outer rings run counter-clockwise and holes
 * clockwise (polygon-clipping's order), which is what a font's nonzero fill
 * needs to leave the holes empty.
 */
export function glyphOutline(g: Glyph): Poly[] {
  // Snapped to an eighth of a unit: polygon-clipping can fail to close a ring
  // when many nearly-equal points from overlapping round ends meet.
  const snap = (v: number) => Math.round(v * 8) / 8;
  const prep = (list: Piece[]) => list.flatMap(piecePolys)
    .filter((p) => p.length && p[0].length >= 4)
    .map((p) => p.map((r) => r.map(([x, y]) => [snap(x), snap(y)] as P)));
  const polys = prep(g.pieces.filter((p) => p.t !== 'curve'));
  // Point-and-curve shapes XOR each other first: one inside another is a hole.
  const curves = prep(g.pieces.filter((p) => p.t === 'curve'));
  if (curves.length) {
    try {
      const x = polygonClipping.xor(curves[0] as never, ...(curves.slice(1) as never[])) as unknown as Poly[];
      polys.push(...x);
    } catch {
      polys.push(...curves);
    }
  }
  if (!polys.length) return [];
  let merged: Poly[];
  try {
    merged = polygonClipping.union(polys[0] as never, ...(polys.slice(1) as never[])) as unknown as Poly[];
  } catch {
    // Still could not merge: keep the pieces separate, every outer ring turned
    // counter-clockwise and every hole clockwise. A font fills overlapping
    // outlines turned the same way as one shape (nonzero), so the letter looks
    // the same; the file is just a little bigger.
    merged = polys.map((p) => p.map((r, i) => ((ringArea(r) > 0) === (i === 0) ? r : r.slice().reverse())));
  }
  const out: Poly[] = [];
  const clean = (ring: Ring): Ring | null => {
    const s = simplifyRing(ring.map(([x, y]) => [Math.round(x), Math.round(y)] as P), 0.6);
    return s.length >= 4 && Math.abs(ringArea(s)) >= 4 ? s : null;
  };
  for (const poly of merged) {
    // A shape too small to keep takes its holes with it: a hole on its own would be filled.
    const outer = clean(poly[0]);
    if (!outer) continue;
    const holes = poly.slice(1).map(clean).filter((r): r is Ring => r !== null);
    out.push([outer, ...holes]);
  }
  return out;
}

// ---- the font ---------------------------------------------------------------

/** Is there anything drawn on this letter? */
export function drawn(g: Glyph | undefined): boolean {
  return !!g && g.pieces.length > 0;
}

/**
 * The font file for a drawing: every drawn letter, a space, and the required
 * empty .notdef. Letters not drawn are left out, so a sketch shows them in the
 * fallback font. `outlines` may be passed in (the editor caches them per letter).
 */
export function buildFont(doc: FontDoc, familyName: string, outlines?: Map<string, Poly[]>): ArrayBuffer {
  const glyphs: opentype.Glyph[] = [
    new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: DEFAULT_ADVANCE, path: new opentype.Path() }),
  ];
  const space = doc.glyphs[' '];
  glyphs.push(new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: space?.adv ?? SPACE_ADVANCE, path: new opentype.Path() }));
  for (const ch of CHARSET) {
    const g = doc.glyphs[ch];
    if (!drawn(g)) continue;
    const path = new opentype.Path();
    for (const poly of outlines?.get(ch) ?? glyphOutline(g)) {
      for (const ring of poly) {
        path.moveTo(ring[0][0], ring[0][1]);
        for (let i = 1; i < ring.length - 1; i++) path.lineTo(ring[i][0], ring[i][1]);
        path.close();
      }
    }
    const code = ch.codePointAt(0)!;
    glyphs.push(new opentype.Glyph({ name: 'uni' + code.toString(16).toUpperCase().padStart(4, '0'), unicode: code, advanceWidth: g.adv, path }));
  }
  const font = new opentype.Font({
    familyName, styleName: 'Regular', unitsPerEm: EM, ascender: ASCENDER, descender: DESCENDER,
    designer: 'Made in the shCode Font maker', glyphs,
  });
  return font.toArrayBuffer() as ArrayBuffer;
}

/** A font file as a data URI, ready for saveFont(). */
export function fontDataUri(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return 'data:font/otf;base64,' + btoa(bin);
}

// ---- saving the drawing -----------------------------------------------------

/** The drawing as the JSON kept beside the font (whole font units, short keys). */
export function serializeDoc(doc: FontDoc): string {
  const glyphs: Record<string, Glyph> = {};
  for (const [ch, g] of Object.entries(doc.glyphs)) if (drawn(g) || g.adv !== DEFAULT_ADVANCE) glyphs[ch] = g;
  return JSON.stringify({ v: 1, glyphs }, (_k, v) => (typeof v === 'number' ? Math.round(v) : v));
}

function isPoint(v: unknown): v is P {
  return Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 10000);
}
function isPiece(v: unknown): v is Piece {
  if (!v || typeof v !== 'object') return false;
  const p = v as Record<string, unknown>;
  const w = typeof p.w === 'number' && p.w >= 0 && p.w <= 1000;
  switch (p.t) {
    case 'pen': return w && Array.isArray(p.p) && p.p.length > 0 && p.p.length <= 4000 && p.p.every(isPoint);
    case 'line': return w && isPoint(p.a) && isPoint(p.b);
    case 'arc': return w && isPoint(p.a) && isPoint(p.m) && isPoint(p.b);
    case 'ellipse': case 'box': return w && isPoint(p.a) && isPoint(p.b);
    case 'grid': return typeof p.s === 'number' && p.s >= 10 && p.s <= 500 && Array.isArray(p.c) && p.c.length <= 4000 && p.c.every(isPoint);
    case 'curve': return Array.isArray(p.p) && p.p.length >= 3 && p.p.length <= 400
      && p.p.every((q) => Array.isArray(q) && q.length === 4 && q.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 10000));
    default: return false;
  }
}

/** A saved drawing read back, or null when it is not one (an uploaded font has none). Unknown pieces are dropped. */
export function parseDoc(json: string | null | undefined): FontDoc | null {
  if (!json) return null;
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { return null; }
  if (!raw || typeof raw !== 'object' || (raw as { v?: unknown }).v !== 1) return null;
  const src = (raw as { glyphs?: unknown }).glyphs;
  if (!src || typeof src !== 'object') return null;
  const doc = emptyDoc();
  for (const [ch, g] of Object.entries(src as Record<string, unknown>)) {
    if (!CHARSET.includes(ch) && ch !== ' ') continue;
    const gg = g as { adv?: unknown; pieces?: unknown };
    const adv = typeof gg.adv === 'number' && gg.adv > 0 && gg.adv <= 3000 ? gg.adv : DEFAULT_ADVANCE;
    const pieces = Array.isArray(gg.pieces) ? gg.pieces.filter(isPiece) : [];
    doc.glyphs[ch] = { adv, pieces };
  }
  return doc;
}
