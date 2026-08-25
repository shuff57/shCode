// Curved sketch geometry, kept out of sketch-solve.ts on purpose: the solver
// there is a relaxation loop over STRAIGHT edges (horizontal/vertical/length/
// equal/lock) and stays exactly that. A circle or a rounded corner is a
// second, unrelated kind of math -- bulge/arc trigonometry, not constraint
// relaxation -- so it lives beside the solver, not inside it. Nothing here is
// called by solveSketch(), and solveSketch() is never called from here.
//
// A curved edge is expressed the way DXF/AutoCAD express one: a "bulge" on
// the edge LEAVING a corner. bulge = tan(includedAngle / 4), where
// includedAngle is the arc's own signed sweep. 0 or absent means straight.
// That single number is enough to rebuild the arc's center and radius from
// nothing but its two endpoints -- which is exactly why SketchFeature can
// carry it as one extra field per edge instead of a separate curve type.

import type { Constraint } from './sketch-solve';

export type Point = [number, number];

/** The minimal shape reindex()/circleOf()/tessellate() need. A SketchFeature
 *  satisfies this structurally, without either file importing the other --
 *  model-types.ts imports FROM here (reindex, for addCorner), so this file
 *  must never import model-types.ts back. */
export interface SketchLike {
  points: Point[];
  shape?: 'circle';
  bulges?: Record<number, number>;
  /** Radius the student asked for on DESIGN corner n. See outlineOf(). */
  rounds?: Record<number, number>;
  constraints?: Constraint[];
}

/**
 * Rebuild an arc from the two endpoints of its chord and its bulge.
 *
 * Derivation (the identity that makes bulge useful at all): with half-chord
 * h = |b-a|/2 and half-angle t = includedAngle/4, the sagitta is h*bulge and
 * the radius is h*(bulge + 1/bulge)/2 = |b-a|*(1+bulge^2)/(4*|bulge|). The
 * center sits on the chord's perpendicular bisector, on the LEFT of a->b for
 * a positive (CCW) bulge -- verified against a hand-worked fillet: a=[25,0],
 * b=[28,9], bulge=0.720748 puts the center at exactly [25,5], radius 5.
 * Flipping the sign puts it at [28,4] instead -- outside the corner instead
 * of inside it, which is the sign-error failure this shape of bug produces.
 */
export function arcFromBulge(
  a: Point,
  b: Point,
  bulge: number
): { center: Point; radius: number; startAngle: number; endAngle: number } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.hypot(dx, dy);
  const radius = (d * (1 + bulge * bulge)) / (4 * Math.abs(bulge));
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const ux = dx / d;
  const uy = dy / d;
  // 90 degrees CCW of the chord direction a->b.
  const px = -uy;
  const py = ux;
  const half = d / 2;
  const toCentre = Math.sqrt(Math.max(0, radius * radius - half * half));
  // Past a half turn (|bulge| > 1) the centre is on the OTHER side of the
  // chord: a major arc's centre sits behind its own chord, not in front of
  // it. Without the flip, bulge 2 on a 10-unit chord builds a 106.26-degree
  // arc where tan(sweep/4) = 2 asks for 253.74, and puts the sagitta at 2.5
  // where the bulge definition (sagitta = halfChord * |bulge|) requires 20.
  // Unreachable from filletCorner(), whose sweep is always pi - interior and
  // so always under a half turn -- but reachable from a hand-written or
  // imported doc, and shared by tessellate(), splitEdge() and the overlay.
  // The generated polyArc() helper in model-codegen.ts carried the same line
  // and has the same fix.
  const sign = (bulge >= 0 ? 1 : -1) * (Math.abs(bulge) > 1 ? -1 : 1);
  const center: Point = [mx + px * toCentre * sign, my + py * toCentre * sign];
  const startAngle = Math.atan2(a[1] - center[1], a[0] - center[0]);
  const endAngle = Math.atan2(b[1] - center[1], b[0] - center[0]);
  return { center, radius, startAngle, endAngle };
}

/** The CCW-normalised sweep from startAngle to endAngle that a bulge of this
 *  sign actually means -- raw atan2 output can land on either side of zero,
 *  so a positive bulge's sweep must come out positive and a negative one's
 *  negative, regardless of which quadrant the endpoints fell in. */
function signedSweep(startAngle: number, endAngle: number, bulge: number): number {
  let sweep = endAngle - startAngle;
  if (bulge > 0 && sweep < 0) sweep += Math.PI * 2;
  if (bulge < 0 && sweep > 0) sweep -= Math.PI * 2;
  return sweep;
}

/** Reads f.shape and nothing else -- the tag IS the answer, never a distance
 *  comparison on the points. A non-circle sketch (shape absent) is null,
 *  never guessed at from having exactly two points. */
export function circleOf(f: { shape?: 'circle'; points: Point[] }): { center: Point; radius: number } | null {
  if (f.shape !== 'circle') return null;
  const [a, b] = f.points;
  if (!a || !b) return null;
  return {
    center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
    radius: Math.hypot(b[0] - a[0], b[1] - a[1]) / 2,
  };
}

/** Radians. Two edges meeting at a corner whose directions differ by less
 *  than this are one straight line as far as anything in this file is
 *  concerned. Deliberately tiny: a corner that is merely FLAT (say 179deg)
 *  really can take a large fillet, and saying otherwise would refuse work
 *  that is perfectly buildable. What this catches is exact collinearity,
 *  which is what addCorner() produces on every straight edge. */
const STRAIGHT_TOL = 1e-6;

/**
 * The real ceiling on this corner's fillet radius: the radius whose trim
 * distance (r / tan(interior/2), filletCorner()'s own formula) reaches
 * exactly half the shorter adjacent edge.
 *
 * This USED to be angle-blind -- half the shorter edge, full stop -- on the
 * theory that the corner's own angle didn't need to factor in. That was
 * wrong: trim grows much faster than radius as a corner sharpens, so a sharp
 * corner's true safe radius is far SMALLER than half its edge, and the old
 * formula let a radius through that trimmed straight past the far corner and
 * self-crossed the outline (Finding 1, sketch gauntlet round 2). At a
 * 90-degree corner tan(45deg) = 1, so this returns the same number the old
 * formula did -- verified by the existing rectangle assertion below, which a
 * fix that broke the 90-degree case would fail.
 *
 * Two whole-corner refusals live here rather than in the caller, because
 * every caller of this number treats 0 as "this corner cannot be rounded":
 *
 *   - A STRAIGHT corner (interior 180deg). This used to fall out as
 *     tan(PI/2) = Infinity, i.e. "any radius you like" -- and filletCorner()
 *     then trimmed by r/tan(PI/2) = 0 and spliced two IDENTICAL points with
 *     a zero bulge, leaving a duplicate point and a zero-length edge that
 *     made every later round of the neighbours no-op forever. Every corner
 *     addCorner() creates on a straight edge is exactly this corner, so it
 *     was not a corner case, it was the common case.
 *   - A corner with an already-CURVED edge on either side. filletCorner()'s
 *     whole construction reads the two adjacent edges as straight chords, so
 *     next to an arc it neither meets the arc tangentially nor leaves that
 *     arc's radius alone (trimming its chord while its bulge factor stays
 *     put silently rescales it). Refusing is the honest answer; see
 *     whyCannotRoundCorner() for the words.
 *
 * `bulges` is optional so a caller with only a point list still gets the
 * straight/sharp answers; pass it whenever you have it.
 */
export function maxFilletRadius(
  points: Point[], corner: number, bulges?: Record<number, number>
): number {
  const n = points.length;
  // Edge i runs points[i] -> points[i+1], so this corner's two edges are
  // `corner - 1` coming in and `corner` going out.
  if (bulges && (bulges[(corner - 1 + n) % n] || bulges[corner])) return 0;
  const prev = points[(corner - 1 + n) % n];
  const c = points[corner];
  const next = points[(corner + 1) % n];
  const lenIn = Math.hypot(c[0] - prev[0], c[1] - prev[1]);
  const lenOut = Math.hypot(next[0] - c[0], next[1] - c[1]);
  if (lenIn === 0 || lenOut === 0) return 0;
  const vIn: Point = [prev[0] - c[0], prev[1] - c[1]];
  const vOut: Point = [next[0] - c[0], next[1] - c[1]];
  const cosInterior = (vIn[0] * vOut[0] + vIn[1] * vOut[1]) / (lenIn * lenOut);
  const interior = Math.acos(Math.max(-1, Math.min(1, cosInterior)));
  if (Math.PI - interior < STRAIGHT_TOL) return 0;
  return (Math.min(lenIn, lenOut) / 2) * Math.tan(interior / 2);
}

/**
 * Plain words for why THIS corner cannot take a fillet at all, or null when
 * some positive radius would work. maxFilletRadius() returning 0 already
 * disables the slider (min === max === 0), but a caller that reaches this
 * corner anyway -- a stale value already in the field, a future caller that
 * skips the slider -- needs something to say instead of quietly building
 * nothing, the same complaint whyCannotRound() in model-types.ts exists to
 * answer for a whole feature.
 *
 * On remedies: only the two ANGLE answers name one, and the remedy they name
 * is dragging the corner, which is a real handle a student can grab --
 * sketchHandles() in lib/model-handles.ts emits a two-axis 'point' handle per
 * sketch corner and HandleOverlay.tsx draws it. The CURVED-neighbour answer
 * deliberately names no remedy: there is no un-round action in the app, so
 * "straighten that edge first" would be an instruction with nothing behind
 * it. It states the limit and stops.
 */
export function whyCannotRoundCorner(
  points: Point[], corner: number, bulges?: Record<number, number>
): string | null {
  if (maxFilletRadius(points, corner, bulges) > 0) return null;
  const n = points.length;
  if (bulges && (bulges[(corner - 1 + n) % n] || bulges[corner])) {
    return "One of the two edges at this corner is already a curve, and shCode can only round a corner where both of its edges are straight.";
  }
  const prev = points[(corner - 1 + n) % n];
  const c = points[corner];
  const next = points[(corner + 1) % n];
  const lenIn = Math.hypot(c[0] - prev[0], c[1] - prev[1]);
  const lenOut = Math.hypot(next[0] - c[0], next[1] - c[1]);
  // A zero-length edge is NOT a sharp angle -- there is no angle at all, the
  // two points are on top of each other. Saying "drag it into a wider angle"
  // here is a false diagnosis of a real state the Rules panel can produce in
  // one click (sketch gauntlet round 3, live lens). The remedy named is the
  // corner handle, which sketchHandles() really does emit for every point.
  if (lenIn === 0 || lenOut === 0) {
    return "Two corners of this sketch are sitting on top of each other, so one of the edges here has no length at all. Drag them apart first.";
  }
  if (lenIn > 0 && lenOut > 0) {
    const cosInterior = ((prev[0] - c[0]) * (next[0] - c[0]) + (prev[1] - c[1]) * (next[1] - c[1]))
      / (lenIn * lenOut);
    const interior = Math.acos(Math.max(-1, Math.min(1, cosInterior)));
    if (Math.PI - interior < STRAIGHT_TOL) {
      return "This corner is straight -- both of its edges run in one line, so there is no corner sticking out to round off. Drag the corner away from that line first.";
    }
  }
  return "This corner is too sharp to round -- its two edges nearly double back on each other. Drag it into a wider angle first.";
}

/**
 * Shift every constraint and bulge index past `insertedAt` by one.
 *
 * "Past a seam" is the one operation both callers need, because both add
 * exactly one corner and one edge at the same seam:
 *   - addCorner(f, index) splits edge `index` into two straight edges,
 *     insertedAt = index.
 *   - filletCorner(f, corner, r) deletes corner `corner` and replaces it with
 *     two trim points plus a new arc edge between them, insertedAt =
 *     corner - 1. (Corner `corner` itself, and edge `corner` -- its own
 *     outgoing edge -- both count as "past" corner-1, so they shift forward
 *     onto the new positions the split created; there is no old index that
 *     legitimately still means "the arc," because the arc never existed
 *     before this call. Its caller fills that slot in separately.)
 * A corner or edge index <= insertedAt is untouched either way.
 *
 * WHAT THIS FUNCTION IS NOT ALLOWED TO BE ASKED. It moves a bulge's KEY and
 * never its VALUE -- and a bulge's value is shape-relative, a factor of its
 * own chord (tan(sweep/4)), not an absolute radius. So it is only correct
 * while every surviving edge still spans the same two points it spanned
 * before. Hand it an operation that MOVED an edge's endpoints and that
 * edge's arc silently rescales: same factor, different chord, different
 * radius, different centre, no error and nothing on screen to notice.
 *
 * That is one bug, and it wore three faces (sketch gauntlet round 2 -> 3):
 * splitting a bulged edge halved its radius, and rounding a corner next to a
 * bulged edge shortened that arc's chord by the trim. Both are now handled
 * where the endpoints actually move -- splitEdge() below owns the split, and
 * filletCorner() refuses a curved neighbour outright -- which leaves this
 * function a pure index shift, correctly, for both callers.
 */
export function reindex<T extends SketchLike>(f: T, insertedAt: number): T {
  const shiftCorner = (c: number) => (c > insertedAt ? c + 1 : c);
  const shiftEdge = (e: number) => (e > insertedAt ? e + 1 : e);

  const constraints = f.constraints?.map((c): Constraint => {
    if (c.kind === 'lock') return { ...c, corner: shiftCorner(c.corner) };
    if (c.kind === 'equal') return { ...c, edge: shiftEdge(c.edge), other: shiftEdge(c.other) };
    // horizontal | vertical | length all carry a bare `edge`.
    return { ...c, edge: shiftEdge(c.edge) };
  });

  const bulges = f.bulges
    ? Object.fromEntries(
        Object.entries(f.bulges).map(([k, v]) => [shiftEdge(Number(k)), v])
      )
    : f.bulges;

  // `rounds` is keyed by CORNER, not edge, so it shifts on the corner rule.
  // Getting this wrong would slide a student's radius onto a neighbouring
  // corner the first time they pressed Corner -- the same silent mis-keying
  // this function's own warning above is about, one field over.
  const rounds = f.rounds
    ? Object.fromEntries(
        Object.entries(f.rounds).map(([k, v]) => [shiftCorner(Number(k)), v])
      )
    : f.rounds;

  return {
    ...f,
    ...(constraints ? { constraints } : {}),
    ...(bulges ? { bulges } : {}),
    ...(rounds ? { rounds } : {}),
  };
}

/**
 * Put one new corner halfway along edge `index`, leaving the OUTLINE exactly
 * where it was. This is addCorner()'s whole body; it lives here because the
 * hard half of it is bulge arithmetic.
 *
 * Halfway along the edge AS DRAWN, which on a curved edge is not halfway
 * along its chord:
 *
 *   - Straight edge: the chord midpoint. A point already on the line adds a
 *     corner without moving the outline a micron. It is exactly collinear,
 *     which is a real corner in the point list and NOT a roundable one --
 *     see maxFilletRadius()'s straight case. Nudging it off the line to make
 *     it roundable was the alternative and it is worse: asking for a corner
 *     would change the shape you already drew.
 *   - Curved edge: the point ON THE ARC at half its sweep, and the arc is
 *     divided into two arcs that together retrace the original curve. Each
 *     half turns through half the angle, so each half's bulge is
 *     tan(sweep/8) where the whole was tan(sweep/4) -- the half-angle
 *     identity tan(x/2) = (sqrt(1+t^2) - 1)/t with t = tan(x) gives that
 *     straight from the stored number: b' = (sqrt(1+b^2) - 1)/b.
 *
 * Before this, both halves inherited the WHOLE edge's bulge factor across
 * HALF the chord -- half the radius each, moved centres, a visibly different
 * outline, and no error anywhere. The check that catches a regression is a
 * before/after tessellate() area+perimeter comparison, not a look at the
 * bulge numbers: a wrong split still produces plausible-looking numbers.
 *
 * A circle sketch is refused (unchanged): its two points are diameter ends
 * because shape === 'circle' says so, and a third point makes that tag a lie.
 */
export function splitEdge<T extends SketchLike>(f: T, index: number): T {
  if (f.shape === 'circle') return f;
  const n = f.points.length;
  const a = f.points[index];
  const b = f.points[(index + 1) % n];
  if (!a || !b) return f;
  const bulge = f.bulges?.[index] ?? 0;

  if (!bulge) {
    const mid: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const points = [...f.points];
    points.splice(index + 1, 0, mid);
    return { ...reindex(f, index), points };
  }

  const { center, radius, startAngle, endAngle } = arcFromBulge(a, b, bulge);
  const sweep = signedSweep(startAngle, endAngle, bulge);
  const half = startAngle + sweep / 2;
  const mid: Point = [center[0] + radius * Math.cos(half), center[1] + radius * Math.sin(half)];
  const halfBulge = (Math.sqrt(1 + bulge * bulge) - 1) / bulge;

  const points = [...f.points];
  points.splice(index + 1, 0, mid);

  // reindex() shifts every OTHER edge's bulge past the seam correctly,
  // because no other edge's endpoints moved. The two it cannot know about
  // are the two halves of the edge just split, which this owns.
  const shifted = reindex(f, index);
  const bulges = { ...(shifted.bulges ?? {}), [index]: halfBulge, [index + 1]: halfBulge };
  return { ...shifted, points, bulges };
}

/**
 * Round one sharp corner into an arc: trim both adjacent edges back by the
 * tangent distance, drop the sharp corner, and insert the two trim points
 * plus a bulge for the arc between them.
 *
 * Trim distance is r / tan(interiorAngle / 2) -- the standard fillet
 * construction, verified against a non-90-degree corner on purpose (a
 * rectangle's 90-degree corners cannot tell trim-by-r apart from the correct
 * trim-by-r/tan(45deg)=r, since they are numerically identical there).
 */
export function filletCorner<T extends SketchLike>(f: T, corner: number, radius: number): T {
  const n = f.points.length;
  const prevI = (corner - 1 + n) % n;
  const nextI = (corner + 1) % n;
  const C = f.points[corner];
  const P = f.points[prevI];
  const N = f.points[nextI];

  const vIn: Point = [P[0] - C[0], P[1] - C[1]];
  const vOut: Point = [N[0] - C[0], N[1] - C[1]];
  const lenIn = Math.hypot(vIn[0], vIn[1]);
  const lenOut = Math.hypot(vOut[0], vOut[1]);
  if (lenIn === 0 || lenOut === 0) return f; // a zero-length adjacent edge: no corner here to round

  const cosInterior = (vIn[0] * vOut[0] + vIn[1] * vOut[1]) / (lenIn * lenOut);
  const interior = Math.acos(Math.max(-1, Math.min(1, cosInterior)));

  // Never trust the caller's radius past what this corner can actually take:
  // a radius beyond it trims past the far corner and self-crosses the
  // outline (Finding 1, sketch gauntlet round 2), so clamp instead of
  // splicing garbage, and refuse (return f unchanged) when even the smallest
  // positive radius has nowhere safe to go.
  //
  // Asked of maxFilletRadius() rather than recomputed inline, which is the
  // change that makes this function refuse a STRAIGHT corner and a corner
  // next to an already-curved edge: both come back as 0 there, and 0 lands
  // in the clampedRadius <= 0 refusal below. Two copies of this formula is
  // exactly how the straight-corner hole opened -- the copy here had no
  // 180-degree case because the copy there did not either.
  const safeRadius = maxFilletRadius(f.points, corner, f.bulges);
  const clampedRadius = Math.min(Math.max(0, radius), safeRadius);
  if (clampedRadius <= 0) return f;
  const trim = clampedRadius / Math.tan(interior / 2);
  // Belt under the belt, and the one invariant this function must never
  // break: the two points about to be spliced in are pointIn and pointOut,
  // both `trim` away from C along different rays. A trim of zero (or NaN)
  // makes them the same point, which is a duplicate point and a zero-length
  // edge in the outline -- and a zero-length edge is what makes lenIn === 0
  // for the neighbours, so every later round of them silently no-ops
  // forever. Relative to the edges so it means the same thing at any scale.
  if (!(trim > 1e-9 * Math.min(lenIn, lenOut))) return f;

  const pointIn: Point = [C[0] + (vIn[0] / lenIn) * trim, C[1] + (vIn[1] / lenIn) * trim];
  const pointOut: Point = [C[0] + (vOut[0] / lenOut) * trim, C[1] + (vOut[1] / lenOut) * trim];

  // Sign of the turn at C: positive (CCW) for a convex corner on a
  // CCW-wound outline. The arc's sweep is the corner's exterior angle
  // (pi - interior), signed the same way.
  const inEdge: Point = [C[0] - P[0], C[1] - P[1]];
  const outEdge: Point = [N[0] - C[0], N[1] - C[1]];
  const cross = inEdge[0] * outEdge[1] - inEdge[1] * outEdge[0];
  const sweep = Math.PI - interior;
  const bulge = (cross >= 0 ? 1 : -1) * Math.tan(sweep / 4);

  const points = [...f.points];
  points.splice(corner, 1, pointIn, pointOut);

  // The seam is right before the corner being rounded -- see reindex()'s own
  // comment for why this exact insertedAt makes ONE shared function correct
  // for both callers.
  const insertedAt = corner - 1;

  // A 'lock' on the corner being rounded away has no surviving point to
  // point at -- the corner itself is deleted, replaced by two new trim
  // points. reindex()'s generic "shift anything past insertedAt" rule
  // cannot tell that deletion apart from addCorner()'s plain insertion
  // shift, so left to it a lock here is silently reassigned to pointOut, a
  // point the student never selected (Finding 2, sketch gauntlet round 2).
  // Strip it before reindexing the rest -- every OTHER constraint still
  // needs the ordinary shift, which is why this filters rather than
  // replacing reindex() itself. The caller decides whether and how to tell
  // the student their pin is gone.
  const constraintsMinusRoundedPin = f.constraints?.filter(
    (c) => !(c.kind === 'lock' && c.corner === corner)
  );
  const reindexed = reindex({ ...f, constraints: constraintsMinusRoundedPin }, insertedAt);
  const bulges = { ...(reindexed.bulges ?? {}) };
  bulges[corner] = bulge;

  return { ...reindexed, points, bulges };
}

/**
 * The outline in plane coordinates, curves sampled into short straight runs
 * -- what the preview overlay and (conceptually) the generated geometry both
 * draw. A circle samples 48 points around its centre; a bulged edge samples
 * max(8, ceil(|sweep| / 7.5deg)), so a barely-curved edge still gets a
 * believable arc and a near-full circle does not look faceted.
 */
export function tessellate(f: SketchLike): Point[] {
  const circle = circleOf(f);
  if (circle) {
    const samples = 48;
    const out: Point[] = [];
    for (let i = 0; i < samples; i++) {
      const t = (i / samples) * Math.PI * 2;
      out.push([circle.center[0] + circle.radius * Math.cos(t), circle.center[1] + circle.radius * Math.sin(t)]);
    }
    return out;
  }

  const pts = f.points;
  const n = pts.length;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    out.push(pts[i]);
    const bulge = f.bulges?.[i];
    if (!bulge) continue;
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const { center, radius, startAngle, endAngle } = arcFromBulge(a, b, bulge);
    const sweep = signedSweep(startAngle, endAngle, bulge);
    const samples = Math.max(8, Math.ceil(Math.abs(sweep) / ((7.5 * Math.PI) / 180)));
    for (let s = 1; s < samples; s++) {
      const t = startAngle + sweep * (s / samples);
      out.push([center[0] + radius * Math.cos(t), center[1] + radius * Math.sin(t)]);
    }
  }
  return out;
}

/**
 * Rounds asked for on the DESIGN corners, and the outline they add up to.
 * Nothing else in the app may build or hold an arc endpoint.
 *
 * A sketch stores only what the student placed -- its corners, and a radius on
 * the corners they rounded -- and outlineOf() is the only code that may produce
 * or read an arc's endpoint, so no mover can hold, move, or invalidate a point
 * it did not create.
 *
 * That sentence is the whole design. Before it, a fillet baked its two trim
 * points straight into f.points, where they were indistinguishable from
 * corners the student had drawn -- so the drag handles offered one per trim
 * point, the constraint solver relaxed them like any other corner, and the
 * Rules panel listed the arc as an edge. Each of those moved a trim point
 * while the bulge factor beside it stayed put, and a bulge is a factor of ITS
 * OWN CHORD: same factor, shorter chord, smaller radius, broken tangency, no
 * error anywhere. Measured: dragging one trim point of an r=8 fillet took the
 * radius to 28.15 and opened a 33.4-degree kink at the joint; one length rule
 * on the STRAIGHT edge next door took it to 6.32 in the same click that
 * created it. Refusing each mover one at a time is a losing game -- there is
 * always a fourth. Taking the points away from them is not.
 *
 * `basis` says which design corner each outline point came from, which is what
 * lets the overlay project a derived point through a real anchor: both trim
 * points of corner k carry basis k.
 *
 * `ok: false` means the DESIGN has collapsed -- two corners on top of each
 * other, so an edge has no length and the outline has stopped being a shape.
 * Callers keep whatever they had rather than adopting it (see solveDoc()).
 * The message names no remedy on purpose: this is reached from the constraint
 * solver, from a drag and from a load, and only one of those has something to
 * undo. The caller that knows which one it is adds the remedy.
 */
export interface Outline {
  ok: boolean;
  points: Point[];
  bulges?: Record<number, number>;
  /** Parallel to `points`: the design corner each one projects from. */
  basis: number[];
  /** One per round that could not be honoured in full. `got` is what the
   *  outline actually used -- 0 when the corner took no round at all. */
  notes: Array<{ corner: number; want: number; got: number }>;
  /** Present only when ok is false. */
  why?: string;
}

/**
 * A design edge with no length at all.
 *
 * Asked of the DESIGN polygon rather than the finished outline, because that
 * is where the collapse happens (the solver moves design corners) and because
 * an arc's own chord is legitimately allowed to be tiny -- a 0.01 round on a
 * 40-unit rectangle is a real thing to ask for, and judging it by the same
 * absolute-ish tolerance would refuse it.
 *
 * Relative, so it means the same thing on a 4-unit sketch and a 400-unit one.
 * Strictly less-than: at tol = 0 a genuinely zero-length edge must still be
 * caught, which is what makes "set the tolerance to zero" a sabotage that
 * turns the check red rather than one it shrugs off.
 */
function collapsedEdge(points: Point[]): string | null {
  const n = points.length;
  if (n < 3) return null;
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (const [u, v] of points) {
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  const tol = 1e-6 * Math.max(maxU - minU, maxV - minV);
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < tol) {
      return 'That would pull two corners of this sketch on top of each other, '
        + 'leaving an edge with no length at all -- the outline would stop being '
        + 'a shape. It has been left as it was.';
    }
  }
  return null;
}

export function outlineOf(f: SketchLike): Outline {
  const identity = f.points.map((_, i) => i);

  // A circle is a TAG, not a polygon -- its two points are diameter ends, and
  // neither the round loop nor the edge gate means anything about them.
  if (f.shape === 'circle') {
    return { ok: true, points: f.points, bulges: f.bulges, basis: identity, notes: [] };
  }

  const collapsed = collapsedEdge(f.points);

  const asked = f.rounds ?? {};
  // Descending, and that is load-bearing: filletCorner() splices one extra
  // point in at `corner`, so every index ABOVE it shifts. Working downwards
  // means the corner about to be rounded still sits at its own design index
  // when its turn comes, and no bookkeeping is needed to find it.
  const corners = Object.keys(asked)
    .map(Number)
    .filter((k) => Number.isInteger(k) && k >= 0 && k < f.points.length && asked[k] > 0)
    .sort((a, b) => b - a);

  if (corners.length === 0) {
    // Legacy / imported: a doc carrying `bulges` and no `rounds` is an outline
    // somebody else already built, and it passes through untouched. This is
    // what keeps a pre-rounds saved sandbox generating exactly the polyArc it
    // always did.
    return collapsed
      ? { ok: false, points: f.points, bulges: f.bulges, basis: identity, notes: [], why: collapsed }
      : { ok: true, points: f.points, bulges: f.bulges, basis: identity, notes: [] };
  }

  let points: Point[] = f.points.map((p) => [p[0], p[1]]);
  let bulges: Record<number, number> = { ...(f.bulges ?? {}) };
  let basis = identity.slice();
  const notes: Outline['notes'] = [];

  for (const k of corners) {
    const want = asked[k];
    // Asked of the WORKING points, not the design: a neighbour rounded a
    // moment ago has already eaten part of the shared edge, so the honest
    // ceiling here is smaller than the design alone would suggest. This is
    // the number the caller reports, precisely because it is the one that
    // took the other rounds into account.
    const ceiling = maxFilletRadius(points, k, bulges);
    const got = Math.min(want, Math.max(0, ceiling));
    if (got < want - 1e-9) notes.push({ corner: k, want, got });
    if (!(got > 0)) continue;

    const before = points.length;
    const next = filletCorner({ points, bulges }, k, got);
    if (next.points.length === before) continue; // filletCorner refused
    points = next.points;
    bulges = next.bulges ?? {};
    // The one sharp corner became two trim points; both belong to it.
    basis = [...basis.slice(0, k), basis[k], basis[k], ...basis.slice(k + 1)];
  }

  return collapsed
    ? { ok: false, points, bulges, basis, notes, why: collapsed }
    : { ok: true, points, bulges, basis, notes };
}
