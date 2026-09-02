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

import type { Feature, ModelDoc, Vec3 } from './model-types';

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
function sketchWire(oc: Occt, arc: any, f: any): any {
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
    return w.Wire();
  }

  const outline = arc.outlineOf(f);
  if (!outline.ok) return null;
  const pts: number[][] = outline.points;
  const bulges: Record<number, number> = outline.bulges ?? {};
  const n = pts.length;
  if (n < 3) return null;

  const w = new oc.BRepBuilderAPI_MakeWire();
  for (let i = 0; i < n; i++) {
    const a2 = pts[i];
    const b2 = pts[(i + 1) % n];
    const g = bulges[i];
    if (!g) {
      w.Add(new oc.BRepBuilderAPI_MakeEdge(at(a2), at(b2)).Edge());
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
  }
  return w.Wire();
}

/** The sketch as a flat face, ready to be pulled or spun. */
function sketchFace(oc: Occt, arc: any, f: any): any {
  const wire = sketchWire(oc, arc, f);
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
      const raw = new oc.BRepPrimAPI_MakeBox(w, d, h).Shape();
      return turned(oc, moved(oc, raw, [-w / 2, -d / 2, -h / 2]), f.rotate, [0, 0, 0]);
    }
    case 'cylinder': {
      const raw = new oc.BRepPrimAPI_MakeCylinder(f.radius, f.height).Shape();
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
export function buildDoc(oc: Occt, doc: ModelDoc, arc?: any): Map<string, any> {
  const built = new Map<string, any>();
  for (const f of doc.features) {
    let shape: any = null;
    if (f.kind === 'box' || f.kind === 'cylinder' || f.kind === 'cone'
        || f.kind === 'sphere' || f.kind === 'torus') {
      shape = primitiveOf(oc, f);
      if (shape) shape = moved(oc, shape, f.center);
    } else if (f.kind === 'combine') {
      const parts = f.targets.map((id) => built.get(id)).filter(Boolean);
      if (parts.length >= 2) {
        shape = parts.reduce((a, b) => {
          const op = f.op === 'union' ? 'BRepAlgoAPI_Fuse'
            : f.op === 'subtract' ? 'BRepAlgoAPI_Cut' : 'BRepAlgoAPI_Common';
          return new oc[op](a, b).Shape();
        });
      }
    } else if (f.kind === 'sketch') {
      // A sketch is kept as a FACE, not a solid. Nothing renders it on its
      // own -- an extrude or a revolve consumes it -- which is the same rule
      // the JSCAD path follows and why a bare sketch is not returned as the
      // model.
      if (arc) shape = sketchFace(oc, arc, f);
    } else if (f.kind === 'extrude') {
      const face = built.get(f.target);
      const src = doc.features.find((x) => x.id === f.target);
      if (face && src && src.kind === 'sketch') {
        const a = PLANE_AXES[src.plane ?? 'xy'] ?? PLANE_AXES.xy;
        const h = f.height * a.dir;
        const v = new oc.gp_Vec(a.n[0] * h, a.n[1] * h, a.n[2] * h);
        shape = new oc.BRepPrimAPI_MakePrism(face, v, false, true).Shape();
      }
    } else if (f.kind === 'revolve') {
      const face = built.get(f.target);
      const src = doc.features.find((x) => x.id === f.target);
      if (face && src && src.kind === 'sketch') {
        const a = PLANE_AXES[src.plane ?? 'xy'] ?? PLANE_AXES.xy;
        // Spun about the plane's own U axis through the origin, matching what
        // extrudeRotate does on the JSCAD side.
        const axis = new oc.gp_Ax1(
          new oc.gp_Pnt(0, 0, 0),
          new oc.gp_Dir(a.u[0], a.u[1], a.u[2]),
        );
        shape = new oc.BRepPrimAPI_MakeRevol(face, axis, (f.angle * Math.PI) / 180, true).Shape();
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
    } else if (f.kind === 'move') {
      const src = built.get(f.target);
      if (src) shape = moved(oc, src, f.offset);
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
        // what makes it useful for symmetry rather than a flip.
        shape = new oc.BRepAlgoAPI_Fuse(src, flipped).Shape();
      }
    }
    if (shape) built.set(f.id, shape);
  }
  return built;
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
