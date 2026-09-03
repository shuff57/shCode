// ModelDoc -> OpenCascade shape. The adapter, and nothing else.
//
// This is the layer JSCAD occupies today, rewritten against a B-rep kernel. It
// is deliberately narrow: it takes a document and an initialised OCCT module
// and returns shapes. It does not generate source text, it does not touch the
// UI, and it knows nothing about naming -- that is lib/topo-name.ts and the
// piece after this one.
//
// WHY IT CAN BE MEASURED. Volume and bounding box come out of the kernel, so
// scripts/test-occt-adapter.mjs can build the same fixtures the JSCAD oracle
// holds and compare. The prediction recorded when the oracle learned the
// difference between tessellated and exact: every FLAT fixture should match to
// the digit, and every ROUND one should move toward its analytic volume by the
// gap the baseline already prints. A round fixture that does not move means
// this file is not really using the kernel; a flat one that moves is a defect.
//
// ON TYPING. The kernel's own .d.ts is 1.54 MB and is not vendored, so `Occt`
// below is a hand-written slice naming only what this file calls. That is a
// deliberate trade: a wrong name here fails loudly at the first call rather
// than silently, and the alternative is carrying a megabyte and a half of
// generated declarations for thirty functions.

import type { Feature, ModelDoc, RoundStyle, Vec3 } from './model-types';
import { nameMap } from './model-types';
import { whyNameLost } from './topo-name';
import { chamfered, drafted, edgeThrough, filleted } from './topo-history';
import { facesOf, resolveName, resolveNameAsUsedBy, resolvePrimitiveFace } from './topo-resolve';

/** The handful of OpenCascade entry points this adapter uses. Loose on
 *  purpose -- see the note above. */
export interface Occt {
  [name: string]: any;
}

/** A built shape, paired with the feature that produced it. Kept together
 *  because the next piece needs to ask "which feature made this face". */
export interface Built {
  id: string;
  shape: any;
}

/**
 * One boolean, kept alive after it has produced its shape.
 *
 * This is the reason buildDoc returns a record instead of a bare Map. A
 * `BRepAlgoAPI_*` object is not merely a function that returns a shape -- it
 * holds the history that says which input face became which output face, and
 * that history dies with the object. Discarding it, which this file did until
 * the naming work needed it, throws away the only thing that can carry a
 * student's selection across a rebuild.
 *
 * `inputs` is the feature ids that had gone in by the time this step ran. A
 * combine over three targets is two pairwise booleans, and a face of the third
 * target is only visible to the second of them, so the resolver needs to know
 * where in the chain to start asking.
 */
export interface OpRecord {
  op: any;
  inputs: string[];
}

/** One outline segment of a sketch, paired with the edge it became in the
 *  profile face. `role`/`index` come straight from segmentRoles() in
 *  lib/sketch-arc.ts, so a face can be named after the design edge or the
 *  rounded corner the student actually drew. */
export interface Segment {
  role: 'edge' | 'corner';
  index: number;
  edge: any;
}

/**
 * One sweep -- a pull or a spin -- kept alive after it has produced its shape,
 * for the same reason as OpRecord: the history lives in the operation object.
 *
 * `after` is the transform applied to the sweep's output afterwards, and it has
 * to be recorded because the faces the sweep generated are NOT faces of the
 * moved solid. `closed` marks a revolve that went all the way round and so has
 * no caps, which the kernel will not tell you -- see capOf().
 */
export interface SweepRecord {
  op: any;
  from: string;
  segments: Segment[];
  after: any | null;
  closed: boolean;
}

/** Everything a build produced: the shapes, and the operation history behind
 *  them, keyed by the feature that ran them. */
export interface BuildResult {
  shapes: Map<string, any>;
  ops: Map<string, OpRecord[]>;
  sweeps: Map<string, SweepRecord>;
  /**
   * Why a feature that IS in `shapes` is not what its document row asked
   * for -- a fillet whose radius did not fit, a draft angle too steep, an
   * edge or face name that no longer resolves. Keyed by the feature's own
   * id, sentence in words a student can act on.
   *
   * THIS FIELD AND THE PASS-THROUGH IT DESCRIBES ARE ONE BEHAVIOUR, NOT TWO.
   * When a fillet or draft is refused, `shape` falls back to the unmodified
   * source (`if (!shape) shape = src;`, in both branches below) rather than
   * staying null -- which is the right resting state ONLY because the
   * reason ends up here and is retrievable. Ship the pass-through without
   * ever reading this map in the UI and the result is a NEW instance of the
   * exact defect this fix removed: a feature that reports success (present,
   * geometry looks fine) and quietly is not what its document row says --
   * the document says "Round 1", the shape has no round, and nothing but
   * this map knows. The intended reader is a per-feature channel on that
   * feature's own timeline row (matching whyCannotRound and its siblings),
   * not the document-wide "Could not build this model" panel -- that panel
   * means the whole document failed, and this is the opposite case: the
   * document built fine, one feature just is not what it says. If you are
   * touching the caller that reads `built`, wire this in; do not carry the
   * pass-through forward on its own.
   *
   * Optional, and the callers inside this file's own loop that build a
   * `partial: BuildResult` to resolve a name against never set it -- none of
   * resolveName()/resolveNameAsUsedBy() read it, so there is nothing to
   * carry there. Only the RETURNED BuildResult from buildDoc() is ever
   * expected to have entries in it.
   *
   * The absence of an id here is not itself a claim that the feature built
   * cleanly -- a feature that was never reachable at all (its own target
   * missing) has no shape AND no refusal, same as before this field existed.
   * Currently covers the per-edge `fillet` feature and draft's single named
   * face. Body Draft (`draft` with `whole: true`) does NOT have this hole --
   * see the comment on that branch in buildDoc() for why. Whole-shape Round
   * on a primitive (BoxFeature/CylinderFeature's own `round`) is deliberately
   * NOT covered here and throws instead -- see roundedEdges()'s own comment
   * for why that one stays loud rather than falling back.
   */
  refusals?: Map<string, string>;
}

/** One outline segment and a point known to lie on it, in world coordinates.
 *  The point is how the segment is matched back to a profile edge -- see
 *  matchSegments. */
interface Mark {
  role: 'edge' | 'corner';
  index: number;
  at: any;
}

/**
 * Pair each outline segment with the edge it became in the built profile face.
 *
 * Matching by a point rather than by keeping the edges is not caution, it is
 * the only thing that works: BRepBuilderAPI_MakeWire copies and reorients the
 * edges it is given, so a reference kept from before the wire was built answers
 * Generated() with nothing. Measured on a four-sided profile: edges 1, 2 and 3
 * all came back empty while edge 0, which the builder took as-is, worked --
 * which is exactly the shape of bug that looks like a one-off.
 *
 * A segment that matches no edge, or more than one, is dropped. Its name then
 * fails to resolve, which is the honest outcome.
 */
function matchSegments(oc: Occt, face: any, marks: Mark[]): Segment[] {
  const out: Segment[] = [];
  for (const m of marks) {
    const edge = edgeThrough(oc, face, m.at);
    if (edge) out.push({ role: m.role, index: m.index, edge });
  }
  return out;
}

const DEG = Math.PI / 180;

/** Move a shape by a vector. Every primitive OCCT builds sits at the origin or
 *  grows from it, and every shape in a ModelDoc is placed by its CENTRE, so
 *  almost everything here ends in one of these. */
function moved(oc: Occt, shape: any, [x, y, z]: Vec3): any {
  if (x === 0 && y === 0 && z === 0) return shape;
  const t = new oc.gp_Trsf();
  t.SetTranslation(new oc.gp_Vec(x, y, z));
  return new oc.BRepBuilderAPI_Transform(shape, t, false).Shape();
}

/** Turn a shape about its own centre, X then Y then Z, matching what
 *  reSHape's turn() does today -- the shape is rotated where it stands rather
 *  than swung around the world origin, which is what makes turn() commute with
 *  move() and is measured in the codegen assertions. */
function turned(oc: Occt, shape: any, rotate: Vec3 | undefined, about: Vec3): any {
  if (!rotate || (rotate[0] === 0 && rotate[1] === 0 && rotate[2] === 0)) return shape;
  const axes: Array<[number, Vec3]> = [
    [rotate[0], [1, 0, 0]],
    [rotate[1], [0, 1, 0]],
    [rotate[2], [0, 0, 1]],
  ];
  let out = shape;
  for (const [deg, dir] of axes) {
    if (!deg) continue;
    const t = new oc.gp_Trsf();
    t.SetRotation(
      new oc.gp_Ax1(new oc.gp_Pnt(about[0], about[1], about[2]), new oc.gp_Dir(dir[0], dir[1], dir[2])),
      deg * DEG,
    );
    out = new oc.BRepBuilderAPI_Transform(out, t, false).Shape();
  }
  return out;
}

/**
 * A cone, built by revolving a right triangle a full turn.
 *
 * `BRepPrimAPI_MakeCone` is absent from this OCCT build -- checked, not
 * assumed. Revolving is not a workaround for a missing primitive so much as
 * what a cone IS, and it costs three edges and a revolve. The triangle lies in
 * the XZ plane with its right angle on the axis, so the swept solid is closed
 * without any extra capping.
 */
function coneOf(oc: Occt, radius: number, height: number): any {
  const p = (x: number, z: number) => new oc.gp_Pnt(x, 0, z);
  const base = p(0, 0);
  const rim = p(radius, 0);
  const apex = p(0, height);
  const wire = new oc.BRepBuilderAPI_MakeWire();
  wire.Add(new oc.BRepBuilderAPI_MakeEdge(base, rim).Edge());
  wire.Add(new oc.BRepBuilderAPI_MakeEdge(rim, apex).Edge());
  wire.Add(new oc.BRepBuilderAPI_MakeEdge(apex, base).Edge());
  // TWO arguments, and the second one is load-bearing. The one-argument
  // MakeFace(wire) resolves, in this emscripten build, to an overload that
  // wants a gp_Torus, and fails with "parameter 0 has unknown type 8gp_Torus"
  // -- an error that names neither the wire nor the face and sends you
  // hunting in the wrong place. The (wire, onlyPlane) overload is bound and
  // works. Measured 2026-09-01; the same call is what every sketch-based
  // feature will need, so it is worth knowing once.
  const face = new oc.BRepBuilderAPI_MakeFace(wire.Wire(), false).Face();
  const axis = new oc.gp_Ax1(new oc.gp_Pnt(0, 0, 0), new oc.gp_Dir(0, 0, 1));
  return new oc.BRepPrimAPI_MakeRevol(face, axis, 2 * Math.PI, true).Shape();
}

/**
 * Whole-shape Round/Bevel -- fillet or chamfer EVERY edge of a freshly built
 * primitive at once.
 *
 * THE BUG THIS CLOSES. Box and cylinder primitives carry `round`/`roundStyle`
 * (see BoxFeature/CylinderFeature in lib/model-types.ts), and this file never
 * read either field: it built the sharp primitive and stopped. `doc.features`
 * came back correctly updated, the geometry did not change, and nothing said
 * so -- a document field that looks right sitting next to a shape that is
 * simply wrong, with nothing on screen to notice, which is exactly the
 * failure lib/occt-api.ts's own KNOWN/refuseUnknown mechanism exists to
 * prevent for code mode and this file had no equivalent of for Build mode.
 *
 * NOT a second way to fillet a primitive: this mirrors roundedCuboid() in
 * lib/occt-api.ts exactly -- gather every edge, add them all to ONE
 * BRepFilletAPI_MakeFillet (or _MakeChamfer for a chamfer), Build() once.
 *
 * MEASURED, not assumed, on the cylinder case: TopExp_Explorer returns each
 * edge once per FACE that borders it, so a cylinder's two rim circles come
 * back TWICE each and its own seam line (the vertical join where the curved
 * face's periodic parameterisation closes on itself, not a real corner)
 * twice more -- six entries for three real edges. Deduped by IsSame() before
 * anything is added. The seam line is left IN rather than filtered out: it
 * has no dihedral angle to round, and measured against the kernel directly,
 * handing it to either BRepFilletAPI_MakeFillet or _MakeChamfer is a
 * harmless no-op, not an error -- filtering it out changed nothing but the
 * code's own complexity.
 *
 * BOTH styles build for BOTH primitives -- measured, not assumed, so there is
 * no "only one is buildable" case to refuse between fillet and chamfer here.
 * What DOES need a loud refusal is a radius the shape's edges cannot take
 * (BRepFilletAPI reports it two different ways, same as the single-edge
 * fillet() in lib/topo-history.ts): this throws rather than swallowing
 * either one into null, because null here would silently drop the WHOLE
 * primitive from the build, and a caught exception turned into null is
 * exactly the shape of the fillet-after-move defect fixed earlier this
 * session. lib/occt-build.ts's own callers (BrepViewport.tsx and
 * BrepViewportThree.tsx) already wrap buildDoc() in a try/catch that shows
 * e.message in the "Could not build this model" panel, so throwing here
 * reaches a student as a sentence rather than a silent sharp shape.
 */
function roundedEdges(oc: Occt, sharp: any, radius: number, style: RoundStyle, label: string): any {
  const edges: any[] = [];
  const exp = new oc.TopExp_Explorer(sharp, oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
  while (exp.More()) {
    const e = exp.Current();
    if (!edges.some((u) => u.IsSame(e))) edges.push(e.clone());
    exp.Next();
  }
  const mk = style === 'chamfer'
    ? new oc.BRepFilletAPI_MakeChamfer(sharp)
    : new oc.BRepFilletAPI_MakeFillet(sharp, oc.ChFi3d_FilletShape.ChFi3d_Rational);
  for (const e of edges) mk.Add(radius, oc.TopoDS.Edge(e));
  let failed = false;
  try {
    mk.Build(new oc.Message_ProgressRange());
    failed = !!(mk.IsDone && !mk.IsDone());
  } catch {
    failed = true;
  }
  if (failed) {
    const verb = style === 'chamfer' ? 'Chamfering' : 'Rounding';
    throw new Error(`${verb} ${label} at radius ${radius} failed -- the radius is too big for this shape's edges.`);
  }
  return mk.Shape();
}

// ---- Sketches ---------------------------------------------------------------
//
// The part of the adapter that pays off the architecture. `outlineOf()` in
// lib/sketch-arc.ts already derives the drawn outline from the design corners
// -- applying rounds, chamfers and bows, producing trim points and bulges --
// and it does not know a kernel exists. So this consumes its output rather than
// re-deriving anything, and every hour spent on rounds and chamfers over the
// last weeks carries across untouched. That is what it means for ModelDoc to be
// the seam.

/**
 * Where a sketch's (u, v) lands in the world, and which way an extrude goes.
 *
 * These are READ OFF the built solid, not derived from the plane names --
 * because JSCAD does not extrude along a normal. `extrudeOnPlane` pulls the
 * profile along +Z and then TURNS the solid, and the turns it picked decide
 * both the axis mapping and the direction:
 *
 *   xz: rotateX(+90) sends +Y to +Z and +Z to -Y
 *   yz: rotateY(-90) sends +X to +Z and +Z to -X
 *
 * So on xz the sweep runs toward -Y, and on yz the sketch's u lands on +Z
 * while v lands on +Y -- transposed from what the plane's name suggests.
 * Confirmed against the oracle's measured bounding boxes rather than argued:
 * sketch-on-yz-offset spans [[-2,0,0],[10,25,40]], which is only possible if
 * u is the 40 on Z and v is the 25 on Y.
 *
 * `dir` is the sweep direction as a multiple of the normal.
 */
const PLANE_AXES: Record<string, { u: Vec3; v: Vec3; n: Vec3; dir: number }> = {
  xy: { u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], dir: 1 },
  xz: { u: [1, 0, 0], v: [0, 0, 1], n: [0, 1, 0], dir: -1 },
  yz: { u: [0, 1, 0], v: [0, 0, 1], n: [1, 0, 0], dir: 1 },
};

/** A sketch point in plane coordinates, placed in the world. Mirrors the
 *  `world()` helper in lib/model-handles.ts exactly -- if these two ever
 *  disagree, the drag handles stop landing on the shape. */
function onPlane(oc: Occt, plane: string, offset: number, pu: number, pv: number): any {
  const a = PLANE_AXES[plane] ?? PLANE_AXES.xy;
  return new oc.gp_Pnt(
    a.u[0] * pu + a.v[0] * pv + a.n[0] * offset,
    a.u[1] * pu + a.v[1] * pv + a.n[1] * offset,
    a.u[2] * pu + a.v[2] * pv + a.n[2] * offset,
  );
}

/**
 * The sketch's outline as a closed wire.
 *
 * A circle is its own case: `shape: 'circle'` means the two stored points are
 * the ends of a diameter, not a two-corner polygon, and a real circular edge is
 * both simpler and exact where a sampled ring would not be.
 *
 * A bulged edge becomes a genuine arc. `arcFromBulge()` gives the centre,
 * radius and angles; the arc is then built through three points, which is the
 * one arc constructor bound in this build and is stable when the sweep is
 * nearly flat.
 */
function sketchWire(oc: Occt, arc: any, f: any, marks?: Mark[]): any {
  const plane = f.plane ?? 'xy';
  const offset = f.offset ?? 0;
  const at = (p: number[]) => onPlane(oc, plane, offset, p[0], p[1]);

  const circle = arc.circleOf(f);
  if (circle) {
    const a = PLANE_AXES[plane] ?? PLANE_AXES.xy;
    const centre = at(circle.center);
    const axis = new oc.gp_Ax2(centre, new oc.gp_Dir(a.n[0], a.n[1], a.n[2]));
    const edge = new oc.BRepBuilderAPI_MakeEdge(new oc.gp_Circ(axis, circle.radius)).Edge();
    const w = new oc.BRepBuilderAPI_MakeWire();
    w.Add(edge);
    // A circle is one closed edge, so it is design edge 0 and there is nothing
    // else it could be. Any point on the rim identifies it.
    marks?.push({ role: 'edge', index: 0, at: at([circle.center[0] + circle.radius, circle.center[1]]) });
    return w.Wire();
  }

  const outline = arc.outlineOf(f);
  if (!outline.ok) return null;
  const pts: number[][] = outline.points;
  const bulges: Record<number, number> = outline.bulges ?? {};
  const n = pts.length;
  if (n < 3) return null;
  const roles = arc.segmentRoles(outline.basis);

  const w = new oc.BRepBuilderAPI_MakeWire();
  for (let i = 0; i < n; i++) {
    const a2 = pts[i];
    const b2 = pts[(i + 1) % n];
    const g = bulges[i];
    if (!g) {
      w.Add(new oc.BRepBuilderAPI_MakeEdge(at(a2), at(b2)).Edge());
      marks?.push({ ...roles[i], at: at([(a2[0] + b2[0]) / 2, (a2[1] + b2[1]) / 2]) });
      continue;
    }
    const { center, radius, startAngle, endAngle } = arc.arcFromBulge(a2, b2, g);
    let sweep = endAngle - startAngle;
    if (g > 0 && sweep < 0) sweep += Math.PI * 2;
    if (g < 0 && sweep > 0) sweep -= Math.PI * 2;
    const mid = startAngle + sweep / 2;
    const through = [center[0] + radius * Math.cos(mid), center[1] + radius * Math.sin(mid)];
    const made = new oc.GC_MakeArcOfCircle(at(a2), at(through), at(b2));
    w.Add(new oc.BRepBuilderAPI_MakeEdge(made.Value()).Edge());
    // The arc's own midpoint, not the chord's -- a bowed edge's chord midpoint
    // is not on the edge at all.
    marks?.push({ ...roles[i], at: at(through) });
  }
  return w.Wire();
}

/**
 * The profile for a REVOLVE, which is not the same thing as the sketch lying
 * on its plane.
 *
 * Spin reads a sketch as (radius, height): the outline's across is how far
 * out from the axis, and its up is how far along it. The axis is the plane's
 * normal. So the profile is laid in the plane spanned by the sketch's U
 * direction and that normal -- a plane CONTAINING the axis -- rather than on
 * the sketch plane itself, which is perpendicular to it.
 *
 * On the ground plane this is exactly what extrudeRotate does unaided, which
 * is why xy is the one of the three that does not move when Spin learns about
 * planes at all.
 */
function revolveProfileFace(oc: Occt, arc: any, f: any, marks?: Mark[]): any {
  const a = PLANE_AXES[f.plane ?? 'xy'] ?? PLANE_AXES.xy;
  const outline = arc.outlineOf(f);
  if (!outline.ok) return null;
  const pts: number[][] = outline.points;
  const n = pts.length;
  if (n < 3) return null;
  const roles = arc.segmentRoles(outline.basis);
  const at = (p: number[]) => new oc.gp_Pnt(
    a.u[0] * p[0] + a.n[0] * p[1],
    a.u[1] * p[0] + a.n[1] * p[1],
    a.u[2] * p[0] + a.n[2] * p[1],
  );
  const w = new oc.BRepBuilderAPI_MakeWire();
  for (let i = 0; i < n; i++) {
    const b = pts[(i + 1) % n];
    w.Add(new oc.BRepBuilderAPI_MakeEdge(at(pts[i]), at(b)).Edge());
    marks?.push({ ...roles[i], at: at([(pts[i][0] + b[0]) / 2, (pts[i][1] + b[1]) / 2]) });
  }
  // Straight segments only: this profile ignores `bulges`, so a bowed sketch
  // spins as a polygon. That is a pre-existing gap in Spin rather than one the
  // naming work introduces, and it is why the marks here are chord midpoints
  // where sketchWire uses arc midpoints.
  return new oc.BRepBuilderAPI_MakeFace(w.Wire(), false).Face();
}

/** The sketch as a flat face, ready to be pulled or spun. */
function sketchFace(oc: Occt, arc: any, f: any, marks?: Mark[]): any {
  const wire = sketchWire(oc, arc, f, marks);
  if (!wire) return null;
  // (wire, onlyPlane) -- the single-argument overload binds to gp_Torus in this
  // build. See the note on coneOf().
  return new oc.BRepBuilderAPI_MakeFace(wire, false).Face();
}

/** One primitive, centred where the feature says. */
function primitiveOf(oc: Occt, f: Feature): any {
  switch (f.kind) {
    case 'box': {
      const [w, d, h] = f.size;
      // MakeBox grows from the origin corner; a ModelDoc box is centred.
      let raw = new oc.BRepPrimAPI_MakeBox(w, d, h).Shape();
      // Whole-shape Round/Bevel, applied to the SHARP, still-at-the-origin
      // box -- before centring, so the centring translate below still uses
      // the box's own nominal (unrounded) w/d/h, which is what keeps a
      // rounded box's nominal footprint centred exactly where an unrounded
      // one would be, same as the per-edge FilletFeature and JSCAD's
      // roundedCuboid both already do.
      if (f.round) raw = roundedEdges(oc, raw, f.round, f.roundStyle ?? 'fillet', `box ${f.id} (${w}x${d}x${h})`);
      return turned(oc, moved(oc, raw, [-w / 2, -d / 2, -h / 2]), f.rotate, [0, 0, 0]);
    }
    case 'cylinder': {
      let raw = new oc.BRepPrimAPI_MakeCylinder(f.radius, f.height).Shape();
      if (f.round) {
        raw = roundedEdges(oc, raw, f.round, f.roundStyle ?? 'fillet', `cylinder ${f.id} (radius ${f.radius}, height ${f.height})`);
      }
      return turned(oc, moved(oc, raw, [0, 0, -f.height / 2]), f.rotate, [0, 0, 0]);
    }
    case 'cone': {
      const raw = coneOf(oc, f.radius, f.height);
      return turned(oc, moved(oc, raw, [0, 0, -f.height / 2]), f.rotate, [0, 0, 0]);
    }
    case 'sphere':
      // Already centred on the origin, so there is nothing to correct.
      return new oc.BRepPrimAPI_MakeSphere(f.radius).Shape();
    case 'torus':
      return turned(oc, new oc.BRepPrimAPI_MakeTorus(f.ringRadius, f.tubeRadius).Shape(),
        f.rotate, [0, 0, 0]);
    default:
      return null;
  }
}

/** Build every feature in the document, in order, returning them by id.
 *  Anything this slice does not handle yet comes back absent rather than
 *  throwing, so a partial adapter can still be measured on what it does do. */
/** `arc` is lib/sketch-arc.ts, passed in rather than imported so this file
 *  can be compiled and measured on its own. It is the outline authority --
 *  rounds, chamfers and bows are all already derived there, correctly, by
 *  code that predates the kernel and does not know about it. */
export function buildDoc(oc: Occt, doc: ModelDoc, arc?: any): BuildResult {
  const built = new Map<string, any>();
  const ops = new Map<string, OpRecord[]>();
  const sweeps = new Map<string, SweepRecord>();
  // Half A of the silent-fillet-refusal fix: something has to notice a
  // refusal and say why, in the words this repo already uses elsewhere
  // (whyNotOnJscad, whyCannotRound, whyCannotRoundCorner). These three are
  // exactly what whyNameLost() itself needs and nothing more -- computed
  // once here because they only depend on `doc`, not on anything built so
  // far, and every fillet in the loop below can share them.
  const refusals = new Map<string, string>();
  const names = nameMap(doc);
  const label = (id: string): string => names[id] ?? id;
  const featureExists = (id: string): boolean => doc.features.some((x) => x.id === id);
  const sketchEdgeCount = (id: string): number | null => {
    const sk = doc.features.find((x) => x.id === id);
    // A closed outline has as many design edges as design corners -- see the
    // same rule in whyNameLost()'s own doc comment in lib/topo-name.ts.
    return sk && sk.kind === 'sketch' ? sk.points.length : null;
  };
  /** Filled by the sketch branch, read by the extrude branch. The profile face
   *  is built once and only once -- rebuilding it to get the marks would be two
   *  copies of the same derivation, free to drift apart. */
  const sketchMarks = new Map<string, Mark[]>();
  /** Run one boolean and keep it. Build() is called explicitly rather than
   *  relying on the two-argument constructor to do it, because the history maps
   *  are what this is for and an explicitly built operation is the shape that
   *  was measured to fill them. */
  const boolean = (kind: string, a: any, b: any, feature: string, inputs: string[]) => {
    const op = new oc[kind](a, b);
    op.Build(new oc.Message_ProgressRange());
    const list = ops.get(feature) ?? [];
    list.push({ op, inputs });
    ops.set(feature, list);
    return op.Shape();
  };
  for (const f of doc.features) {
    let shape: any = null;
    if (f.kind === 'box' || f.kind === 'cylinder' || f.kind === 'cone'
        || f.kind === 'sphere' || f.kind === 'torus') {
      shape = primitiveOf(oc, f);
      if (shape) shape = moved(oc, shape, f.center);
    } else if (f.kind === 'combine') {
      const live = f.targets.filter((id) => built.get(id));
      if (live.length >= 2) {
        const kind = f.op === 'union' ? 'BRepAlgoAPI_Fuse'
          : f.op === 'subtract' ? 'BRepAlgoAPI_Cut' : 'BRepAlgoAPI_Common';
        // Written as a loop rather than a reduce so each pairwise step can
        // record which ids had gone in by the time it ran -- see OpRecord.
        shape = built.get(live[0]);
        for (let i = 1; i < live.length; i++) {
          shape = boolean(kind, shape, built.get(live[i]), f.id, live.slice(0, i + 1));
        }
      }
    } else if (f.kind === 'sketch') {
      // A sketch is kept as a FACE, not a solid. Nothing renders it on its
      // own -- an extrude or a revolve consumes it -- which is the same rule
      // the JSCAD path follows and why a bare sketch is not returned as the
      // model.
      if (arc) {
        const marks: Mark[] = [];
        shape = sketchFace(oc, arc, f, marks);
        if (shape) sketchMarks.set(f.id, marks);
      }
    } else if (f.kind === 'extrude') {
      const face = built.get(f.target);
      const src = doc.features.find((x) => x.id === f.target);
      if (face && src && src.kind === 'sketch') {
        const a = PLANE_AXES[src.plane ?? 'xy'] ?? PLANE_AXES.xy;
        const h = f.height * a.dir;
        const v = new oc.gp_Vec(a.n[0] * h, a.n[1] * h, a.n[2] * h);
        const op = new oc.BRepPrimAPI_MakePrism(face, v, false, true);
        shape = op.Shape();
        sweeps.set(f.id, {
          op,
          from: src.id,
          segments: matchSegments(oc, face, sketchMarks.get(src.id) ?? []),
          after: null,
          closed: false,
        });
      }
    } else if (f.kind === 'revolve') {
      const src = doc.features.find((x) => x.id === f.target);
      if (arc && src && src.kind === 'sketch') {
        const a = PLANE_AXES[src.plane ?? 'xy'] ?? PLANE_AXES.xy;
        const marks: Mark[] = [];
        const face = revolveProfileFace(oc, arc, src, marks);
        if (face) {
          // About the plane NORMAL, which is the axis the profile was laid
          // against -- see revolveProfileFace.
          const axis = new oc.gp_Ax1(
            new oc.gp_Pnt(0, 0, 0),
            new oc.gp_Dir(a.n[0], a.n[1], a.n[2]),
          );
          const op = new oc.BRepPrimAPI_MakeRevol(face, axis, (f.angle * Math.PI) / 180, true);
          const spun = op.Shape();
          const off = src.offset ?? 0;
          // The offset translation is recorded, not just applied: the faces
          // this revolve generated belong to the UNMOVED solid, and handing one
          // back without moving it too gives a face floating where the part
          // used to be. See placed() in lib/topo-history.ts.
          let after: any = null;
          if (off !== 0) {
            after = new oc.gp_Trsf();
            after.SetTranslation(new oc.gp_Vec(a.n[0] * off, a.n[1] * off, a.n[2] * off));
          }
          shape = after ? new oc.BRepBuilderAPI_Transform(spun, after, false).Shape() : spun;
          sweeps.set(f.id, {
            op,
            from: src.id,
            segments: matchSegments(oc, face, marks),
            after,
            closed: Math.abs(f.angle) >= 360 - 1e-9,
          });
        }
      }
    } else if (f.kind === 'blend') {
      // A REAL loft. On the JSCAD side this is extrudeFromSlices with two
      // hand-resampled rings and a winding fix; here the kernel skins between
      // two wires and the resampling problem does not exist.
      const [loId, hiId] = f.targets;
      const lo = doc.features.find((x) => x.id === loId);
      const hi = doc.features.find((x) => x.id === hiId);
      if (arc && lo && hi && lo.kind === 'sketch' && hi.kind === 'sketch') {
        const through = new oc.BRepOffsetAPI_ThruSections(true, false, 1e-6);
        through.AddWire(sketchWire(oc, arc, lo));
        through.AddWire(sketchWire(oc, arc, hi));
        through.Build(new oc.Message_ProgressRange());
        shape = through.Shape();
      }
    } else if (f.kind === 'fillet') {
      // The payoff of the naming work, and the tool .gauntlet/parity.json
      // refused as needing "face or edge selection on a B-rep". The edge is
      // resolved from its NAME -- the pair of faces it lies between -- against
      // the shape as built so far, so widening the part finds the same edge
      // rather than the same index.
      const src = built.get(f.target);
      const partial: BuildResult = { shapes: built, ops, sweeps };
      // resolveNameAsUsedBy, not resolveName: f.edge may be named against an
      // earlier feature (the box) than f.target actually is (a moved copy of
      // it). See the 'move' branch below for why that gap existed and how
      // it is closed.
      const edge = src ? resolveNameAsUsedBy(oc, f.edge, partial, f.target) : null;
      // Was: a null edge, or a size the edge cannot take, left `shape` null
      // and the feature silently absent -- "the caller's to report", except
      // no caller ever did (grepped: whyNameLost() is referenced in five
      // comments and called from zero components or lib files). The
      // catastrophe this produced: topLevel() in lib/model-types.ts marks
      // `f.target` consumed PURELY STRUCTURALLY, with no idea whether the
      // fillet actually built, so a refused fillet took its own target out
      // of the running while contributing nothing itself -- a part with one
      // too-large radius vanished from the viewport with no explanation.
      //
      // TWO DIFFERENT REFUSALS, two different sentences, on purpose: naming
      // a lost face when the real problem is a size that does not fit would
      // send a student looking for a face that is still there.
      if (src) {
        if (edge) {
          shape = f.style === 'chamfer'
            ? chamfered(oc, src, edge, f.size)
            : filleted(oc, src, edge, f.size);
          if (!shape) {
            // The name resolved to a real edge; the KERNEL refused the
            // operation on it (radius/distance too big for that edge). Not
            // a lost name -- whyNameLost() would be the wrong sentence here.
            const verb = f.style === 'chamfer' ? 'Chamfering' : 'Rounding';
            refusals.set(
              f.id,
              `${verb} ${label(f.id)} at ${f.size} would not fit its edge -- `
                + `${label(f.id)} is shown without it.`,
            );
          }
        } else {
          // The NAME itself is lost -- a feature or sketch edge it pointed
          // at is gone. whyNameLost() already knows the words for this; it
          // was simply never called.
          const why = whyNameLost(f.edge, featureExists, sketchEdgeCount, label);
          refusals.set(
            f.id,
            why ?? `${label(f.id)}'s edge could not be found -- ${label(f.id)} is shown without it.`,
          );
        }
        // Half B: do not take the target down with a refused feature. The
        // student's actual part -- unrounded, but present -- is a strictly
        // better resting state than an empty viewport, and it is what makes
        // the sentence above land somewhere: a reason attached to a shape
        // nobody can see helps nobody. This is the fillet feature's OWN
        // built.shapes entry, so it is exactly what topLevel() already
        // expects to find there -- no change needed in lib/model-types.ts.
        if (!shape) shape = src;
      }
    } else if (f.kind === 'draft') {
      const src = built.get(f.target);
      const axis: Vec3 = f.pull === 'x' ? [1, 0, 0] : f.pull === 'y' ? [0, 1, 0] : [0, 0, 1];
      const rad = (f.angle * Math.PI) / 180;
      if (src && f.whole) {
        // Body Draft: every face except the two the pull points at. Exact for
        // the axis-aligned primitives; see DraftFeature's note on the limit.
        // Applied one at a time rather than in a single DraftAngle so that a
        // face which refuses -- a curved wall, a face already at the angle --
        // costs that face and not the whole feature.
        let cur = src;
        const caps = [
          resolvePrimitiveFace(oc, src, f.pull === 'x' ? '+x' : f.pull === 'y' ? '+y' : '+z'),
          resolvePrimitiveFace(oc, src, f.pull === 'x' ? '-x' : f.pull === 'y' ? '-y' : '-z'),
        ];
        for (const face of facesOf(oc, src)) {
          if (caps.some((c) => c && c.IsSame(face))) continue;
          const next = drafted(oc, cur, face, axis, rad, f.neutral);
          if (next) cur = next;
        }
        shape = cur;
      } else if (src && f.face) {
        const partial: BuildResult = { shapes: built, ops, sweeps };
        // Same reason as the fillet branch above: f.face may be named
        // against an earlier feature than f.target.
        const face = resolveNameAsUsedBy(oc, f.face, partial, f.target);
        // The identical silent-refusal hole as the fillet branch above, and
        // the identical fix, reusing every helper built for it -- see this
        // file's own header note on the `refusals` field for why the two
        // halves (reporting, pass-through) are one behaviour and must ship
        // together. The ONE thing that must differ is the wording: a draft
        // has no edge, it has an ANGLE on a FACE, and reusing the fillet's
        // "would not fit its edge" sentence with the number swapped would
        // send a student looking for an edge that was never involved.
        //
        // Body Draft (the `whole` branch above) does NOT have this hole: it
        // resolves no name at all, and it can never produce a null shape --
        // it starts at `src` and only ever advances on a face that succeeds,
        // so a refused face just costs that face, which is already this
        // file's own documented design for it.
        if (face) {
          shape = drafted(oc, src, face, axis, rad, f.neutral);
          if (!shape) {
            refusals.set(
              f.id,
              `Tilting ${label(f.id)} at ${f.angle} degrees would not fit -- ${label(f.id)} is shown without it.`,
            );
          }
        } else {
          const why = whyNameLost(f.face, featureExists, sketchEdgeCount, label);
          refusals.set(
            f.id,
            why ?? `${label(f.id)}'s face could not be found -- ${label(f.id)} is shown without it.`,
          );
        }
        if (!shape) shape = src;
      }
    } else if (f.kind === 'move') {
      // Recorded as an OpRecord, exactly like the booleans below, rather than
      // just calling moved() and forgetting it happened.
      //
      // WHY THIS MATTERS. A name is a path through history, not a position
      // in the result -- topo-name.ts's whole premise. `move` used to be
      // invisible to that history: it called moved() and threw the transform
      // away, so a name written against the shape BEFORE a move (an edge
      // picked, then the part relocated) resolved against the PRE-move
      // shape. Handing that stale edge to BRepFilletAPI.Add() on the MOVED
      // solid does not find a wrong edge -- it finds no edge at all and
      // throws a bare `WebAssembly.Exception {}`, which refusable() in
      // topo-history.ts turns into null exactly the way an oversized fillet
      // radius does. The feature then silently disappears from the build:
      // no entry in `built`, no error, the student's round just gone.
      //
      // MEASURED, not assumed: `BRepBuilderAPI_Transform` -- unlike a bare
      // translation done by hand -- implements the same ModifyShape history
      // interface a boolean does. IsDeleted()/Modified() answer for it the
      // same way faceFate() already expects, on faces AND edges alike, so
      // recording it here needs no new machinery -- pushThrough() in
      // topo-resolve.ts (via resolveNameAsUsedBy) already knows what to do
      // with an OpRecord. Confirmed against the kernel directly: an edge at
      // world (0,0,10) on an unmoved box comes back from Modified() at world
      // (10,0,10) after a translate-by-10, and handing THAT edge to a fillet
      // on the moved shape succeeds where the stale one threw.
      const src = built.get(f.target);
      if (src) {
        const t = new oc.gp_Trsf();
        t.SetTranslation(new oc.gp_Vec(f.offset[0], f.offset[1], f.offset[2]));
        const op = new oc.BRepBuilderAPI_Transform(src, t, false);
        const list = ops.get(f.id) ?? [];
        list.push({ op, inputs: [f.target] });
        ops.set(f.id, list);
        shape = op.Shape();
      }
    } else if (f.kind === 'mirror') {
      const src = built.get(f.target);
      if (src) {
        const axis = f.plane === 'yz' ? 0 : f.plane === 'xz' ? 1 : 2;
        const normal: Vec3 = [0, 0, 0];
        normal[axis] = 1;
        // NOT the world origin. reSHape mirrors through the part's own face
        // -- whichever of its two faces on this axis sits nearer to zero --
        // so the copy lands touching the part instead of being flung across
        // the origin. That is a documented behavioural contract of the app
        // (see mirrorThroughFace in lib/model-codegen.ts) and the adapter
        // owes it. Mirroring through the origin instead gave the right
        // VOLUME and a bounding box 40 units wrong, which is exactly the
        // shape of bug that passes a careless check.
        const b = measureShape(oc, src);
        const lo = b.bbox[0][axis];
        const hi = b.bbox[1][axis];
        const at = Math.abs(lo) <= Math.abs(hi) ? lo : hi;
        const through: Vec3 = [0, 0, 0];
        through[axis] = at;
        const t = new oc.gp_Trsf();
        t.SetMirror(new oc.gp_Ax2(
          new oc.gp_Pnt(through[0], through[1], through[2]),
          new oc.gp_Dir(normal[0], normal[1], normal[2]),
        ));
        const flipped = new oc.BRepBuilderAPI_Transform(src, t, false).Shape();
        // reSHape's Mirror keeps the original and adds its reflection, which is
        // what makes it useful for symmetry rather than a flip. It is a real
        // boolean, so its history is recorded like any other -- a face of the
        // mirrored part has to be nameable too.
        shape = boolean('BRepAlgoAPI_Fuse', src, flipped, f.id, [f.target]);
      }
    }
    if (shape) built.set(f.id, shape);
  }
  return { shapes: built, ops, sweeps, refusals };
}

/** Volume and bounding box, straight from the kernel. Exact for curved
 *  surfaces, which is the whole reason for this exercise. */
export function measureShape(oc: Occt, shape: any): { volume: number; bbox: number[][] } {
  const g = new oc.GProp_GProps();
  oc.BRepGProp.VolumeProperties(shape, g, 1e-7, false, false);
  const box = new oc.Bnd_Box();
  oc.BRepBndLib.Add(shape, box, true);
  const lo = box.CornerMin();
  const hi = box.CornerMax();
  const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
  return {
    volume: r4(g.Mass()),
    bbox: [[r4(lo.X()), r4(lo.Y()), r4(lo.Z())], [r4(hi.X()), r4(hi.Y()), r4(hi.Z())]],
  };
}
