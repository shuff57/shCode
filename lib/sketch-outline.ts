// What number goes where, for the labels drawn on top of a sketch's outline
// -- length readouts, a rounded corner's radius, a bowed edge's bow. Kept
// apart from lib/sketch-arc.ts (which derives the OUTLINE, arcs and all) and
// from components/model/HandleOverlay.tsx (which turns a plane point into a
// screen pixel): this file only decides WHERE in the PLANE a number belongs
// and WHAT it says, in the same (u, v) space `points` already lives in.
//
// A pure function on purpose. The overlay reprojects whatever this returns
// through the same corner-anchor arithmetic it already uses for constraint
// glyphs (projectFrom/edgePolyline in HandleOverlay.tsx), so nothing here
// needs to know a screen exists -- which is what makes it testable with
// plain arithmetic instead of a browser.

import { arcFromBulge, bowOf, segmentRoles, type Point } from './sketch-arc';
import { type Constraint, edgeCorners, edgeLength } from './sketch-solve';

export interface EdgeLabel {
  /** Design edge index -- edge n runs corner n -> corner n+1, wrapping. */
  edge: number;
  /**
   * 'dimension' -- this edge carries an explicit Length rule, so it reads as
   * a driven measurement rather than a passive one: the overlay draws it
   * with end ticks, like jsketcher's own dimension lines. 'length' -- no
   * rule on this edge; it is only reporting what the edge currently
   * measures, the way an unconstrained edge does in every real CAD tool.
   */
  kind: 'length' | 'dimension';
  /** Midpoint of the edge, offset a small fixed distance outward -- away
   *  from the outline's own centroid, never across it -- so the number does
   *  not sit on top of the line it is about. Same units as `points`. */
  x: number;
  y: number;
  /** e.g. "40" or "17.5" -- whole unless the value needs the precision. */
  text: string;
}

export interface CornerLabel {
  corner: number;
  kind: 'round' | 'chamfer';
  x: number;
  y: number;
  /** "R3" or "C2.5" -- jsketcher's own letter for each, so a student who has
   *  seen either tool reads the same shorthand here. */
  text: string;
}

export interface BowLabel {
  edge: number;
  /** The arc's own peak, where a bow is easiest to read against the curve
   *  itself -- not the chord midpoint, which sits inside a heavily bowed
   *  edge rather than beside it. */
  x: number;
  y: number;
  /** Signed, matching the Bow box's own convention in SketchConstraints.tsx:
   *  "+5" bows outward, "-5" inward. */
  text: string;
}

export interface SketchLabels {
  edges: EdgeLabel[];
  corners: CornerLabel[];
  bows: BowLabel[];
}

/** A small, fixed offset in plane units -- deliberately not scaled to the
 *  sketch's own size. jsketcher's dimension lines sit a constant distance
 *  off the edge regardless of how big the part is, and a label that instead
 *  scaled with the sketch would drift absurdly far from a tiny one and sit
 *  inside a huge one. */
const LABEL_OFFSET = 3;

/** Two decimals, only when the value actually needs them -- "40" stays
 *  "40", "17.5" stays "17.5", and floating-point noise on either does not
 *  grow a visible third decimal a screen has no use for. */
export function formatLabel(n: number): string {
  const r = Math.round(n * 100) / 100;
  if (Number.isInteger(r)) return String(r);
  const s = r.toFixed(2);
  return s.endsWith('0') ? s.slice(0, -1) : s;
}

function centroidOf(points: Point[]): Point {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of points) { sx += x; sy += y; }
  return [sx / points.length, sy / points.length];
}

export interface OutlineTreatments {
  /** Design corner -> radius, for a corner outlineOf() rounded. */
  rounds: Record<number, number>;
  /** Design corner -> distance, for a corner outlineOf() chamfered. */
  chamfers: Record<number, number>;
  /** Design edge -> bulge, for an edge the student genuinely bowed. */
  edgeBulges: Record<number, number>;
}

/**
 * Reads back, from a RENDERED outline alone, which design corners carry a
 * round or a chamfer (and what value to label them with), and separately
 * which design EDGES carry a genuine bow.
 *
 * The split matters because outlineOf() represents a corner's own trim arc
 * as a bulge too -- at its POSITION in the rendered outline, which is not
 * the same number as the design edge it sits near once any earlier corner
 * has already inserted trim points. Handing that raw bulge dict straight to
 * sketchLabels() as if it were edge-indexed mislabels the corner's own arc
 * as a bowed edge. Measured 2026-09-04: "Round a corner 1" drew "R3" at the
 * corner correctly, AND a spurious "+8.28" on the very arc the round had
 * just created, because the arc's rendered-position bulge collided with a
 * real edge index once read that way.
 *
 * A 'corner' segment (segmentRoles) WITH a bulge is a round, sized by
 * arcFromBulge's own radius off the same two trim points outlineOf() already
 * produced; one with no bulge is a chamfer, sized by a trim point's distance
 * back to the original corner (`design[basis]`) -- the corner itself, not a
 * derived point, because that is exactly the distance chamferCorner() asked
 * outlineOf() to cut. A 'edge' segment's bulge, in contrast, IS still keyed
 * by a real design edge number (nothing has touched that edge), so it passes
 * through unchanged.
 */
export function treatmentsFromOutline(
  design: Point[],
  points: Point[],
  basis: number[],
  bulges?: Record<number, number>,
): OutlineTreatments {
  const rounds: Record<number, number> = {};
  const chamfers: Record<number, number> = {};
  const edgeBulges: Record<number, number> = {};
  const count = points.length;
  const roles = segmentRoles(basis);
  for (let i = 0; i < count; i++) {
    const role = roles[i];
    if (!role) continue;
    const bulge = bulges?.[i];
    if (role.role === 'edge') {
      if (bulge) edgeBulges[role.index] = bulge;
      continue;
    }
    const corner = role.index;
    const d = design[corner];
    if (!d) continue;
    const a = points[i];
    const b = points[(i + 1) % count];
    if (bulge) {
      rounds[corner] = arcFromBulge(a, b, bulge).radius;
    } else {
      chamfers[corner] = Math.hypot(a[0] - d[0], a[1] - d[1]);
    }
  }
  return { rounds, chamfers, edgeBulges };
}

/**
 * The labels a selected sketch's outline should carry, in plane coordinates.
 *
 * `rounds`/`chamfers` are the MODERN per-corner requests (SketchFeature's own
 * fields): the two design edges meeting a treated corner stay perfectly
 * straight in `points` and still get an ordinary length label, exactly as
 * the Rules panel's own placeholder already reads them -- only the corner
 * itself additionally gets an "R"/"C" label. `bulges` is the LEGACY
 * curved-edge form (a bulge baked directly onto a design edge, from before
 * that refactor) OR a genuine bow from "Bow an edge": an edge carrying one
 * has no straight length to report, so it is skipped here and given a bow
 * label instead, the same "curved" test SketchConstraints.tsx already uses.
 * This must be design-edge-indexed, not outline-position-indexed -- see
 * treatmentsFromOutline's own comment for why those are not the same number
 * once any corner in the sketch has been rounded or chamfered.
 */
export function sketchLabels(
  points: Point[],
  constraints: Constraint[] = [],
  rounds?: Record<number, number>,
  chamfers?: Record<number, number>,
  bulges?: Record<number, number>,
): SketchLabels {
  const count = points.length;
  if (count < 2) return { edges: [], corners: [], bows: [] };
  const centroid = centroidOf(points);
  const lengthRuled = new Set<number>();
  for (const c of constraints) if (c.kind === 'length') lengthRuled.add(c.edge);

  const edges: EdgeLabel[] = [];
  for (let e = 0; e < count; e++) {
    if (bulges?.[e]) continue; // curved -- see the bows loop below instead
    const [a, b] = edgeCorners(e, count);
    const pa = points[a];
    const pb = points[b];
    const mx = (pa[0] + pb[0]) / 2;
    const my = (pa[1] + pb[1]) / 2;
    const dx = pb[0] - pa[0];
    const dy = pb[1] - pa[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) continue; // nothing to measure on a collapsed edge
    // Perpendicular to the edge, then flipped if that direction points
    // toward the centroid rather than away from it -- "outward" has to mean
    // away from the shape's own middle, not just "some normal or other".
    let nx = -dy / len;
    let ny = dx / len;
    if (nx * (centroid[0] - mx) + ny * (centroid[1] - my) > 0) { nx = -nx; ny = -ny; }
    edges.push({
      edge: e,
      kind: lengthRuled.has(e) ? 'dimension' : 'length',
      x: mx + nx * LABEL_OFFSET,
      y: my + ny * LABEL_OFFSET,
      text: formatLabel(edgeLength(points, e)),
    });
  }

  const corners: CornerLabel[] = [];
  for (const [key, want] of Object.entries(rounds ?? {})) {
    const k = Number(key);
    if (!Number.isInteger(k) || k < 0 || k >= count || !(want > 0)) continue;
    corners.push({ corner: k, kind: 'round', x: points[k][0], y: points[k][1], text: `R${formatLabel(want)}` });
  }
  for (const [key, want] of Object.entries(chamfers ?? {})) {
    const k = Number(key);
    if (!Number.isInteger(k) || k < 0 || k >= count || !(want > 0)) continue;
    // A corner asked for both is rounded, not chamfered -- outlineOf()'s own
    // tie-break (lib/sketch-arc.ts), repeated here so the label agrees with
    // what is actually drawn.
    if ((rounds?.[k] ?? 0) > 0) continue;
    corners.push({ corner: k, kind: 'chamfer', x: points[k][0], y: points[k][1], text: `C${formatLabel(want)}` });
  }

  const bows: BowLabel[] = [];
  for (const [key, bulge] of Object.entries(bulges ?? {})) {
    const e = Number(key);
    if (!Number.isInteger(e) || e < 0 || e >= count || !bulge) continue;
    const [a, b] = edgeCorners(e, count);
    const pa = points[a];
    const pb = points[b];
    const { center, radius } = arcFromBulge(pa, pb, bulge);
    const mx = (pa[0] + pb[0]) / 2;
    const my = (pa[1] + pb[1]) / 2;
    // The point on the arc's own circle, in the direction from its centre
    // through the chord's midpoint -- the arc's peak, which is where a bow
    // reads best (a chord-midpoint label sits INSIDE a heavily bowed edge
    // rather than beside the curve it is describing).
    const dx = mx - center[0];
    const dy = my - center[1];
    const d = Math.hypot(dx, dy) || 1;
    const bow = bowOf(points, e, bulges);
    bows.push({
      edge: e,
      x: center[0] + (dx / d) * (radius + LABEL_OFFSET),
      y: center[1] + (dy / d) * (radius + LABEL_OFFSET),
      text: `${bow >= 0 ? '+' : ''}${formatLabel(bow)}`,
    });
  }

  return { edges, corners, bows };
}
