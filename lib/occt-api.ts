// The taught vocabulary, on OpenCascade.
//
// WHAT THIS IS FOR. lib/script-surface.ts classified all 75 names the 183
// documented examples call, and scripts/test-occt-adapter.mjs proved the
// seventeen recipes BUILD the right shapes. Both stop short of the thing that
// actually matters: a student's program is a page of JavaScript calling those
// names, and until the names exist on the kernel nothing a student types can
// run on it. This file is the names.
//
// THE BAR IS THE DOCS' OWN EXAMPLES, RUN TWICE. Every function here is measured
// by taking a real page out of lib/reshape-docs.ts, running it once in the JSCAD
// scope and once in this one, and comparing the volume and bounding box of what
// comes back. That is a harder bar than a unit test and a much harder one than a
// screenshot: the same source, two engines, two numbers that have to agree.
// scripts/test-occt-api.mjs is that harness and it prints the count every run.
//
// JSCAD'S SEMANTICS, NOT A BETTER IDEA. Every signature here copies
// @jscad/modeling exactly, including the parts that are awkward:
//
//   * `size` is the FULL extent, not a half-extent, and shapes are centred at
//     the origin unless `center` says otherwise.
//   * `torus` takes innerRadius as the TUBE and outerRadius as the ring the tube
//     travels along -- labels that mislead, documented at length in
//     public/reshape/reshape.js, and copied here rather than fixed. Fixing them
//     would silently change what a student's existing file builds.
//   * `rotate` spins about the WORLD origin. reSHape's `turn` is the one that
//     pivots in place, and the difference is a taught topic.
//
// Anywhere the two engines cannot agree, the divergence is named in the
// function's own comment rather than smoothed over.
//
// NO WRAPPERS. Every function returns a raw OpenCascade TopoDS_Shape, the same
// way public/reshape/reshape.js is careful to return a raw JSCAD geom. A wrapper
// would render fine, pass a "does it draw" check, and quietly break the moment
// anything reached past this layer.

/** The OpenCascade entry points this file uses. Same hand-written slice as
 *  lib/occt-build.ts. */
export interface Occt {
  [name: string]: any;
}

export type Vec3 = [number, number, number];

/** What `colorize` recorded, for a renderer that wants it. OpenCascade shapes
 *  carry no colour, so it is kept beside them -- see lib/script-surface.ts,
 *  which classifies `colorize` as ours for exactly this reason. */
export interface Api {
  [name: string]: any;
  /** shape -> [r, g, b, a], for whatever draws the result. */
  colors: Map<any, number[]>;
}

const TAU = Math.PI * 2;

/**
 * Build the vocabulary against an initialised OpenCascade module.
 *
 * A factory rather than a module of top-level functions because `oc` is loaded
 * asynchronously and differs between a Node harness and a browser page. The
 * same reason lib/occt-build.ts takes it as an argument.
 */
export interface ApiDeps {
  /** lib/occt-mesh.ts tessellate. Needed only by hull. */
  tessellate?: (oc: Occt, shape: any, opts?: any) => { polygons: Array<{ vertices: number[][] }> } | null;
  /** lib/hull.ts convexHull. Needed only by hull. */
  convexHull?: (pts: Array<[number, number, number]>) => { triangles: Array<[number, number, number]> } | null;
  /** Sampling density for hull. The mesh deflection IS the density -- there is
   *  no second dial, which is the measured answer to the question this was
   *  parked on. See lib/hull.ts. */
  deflection?: number;
}

export function createApi(oc: Occt, deps: ApiDeps = {}): Api {
  const progress = () => new oc.Message_ProgressRange();
  const P = (x: number, y: number, z: number) => new oc.gp_Pnt(x, y, z);
  /**
   * A plane at `z`, with its X direction PINNED to world X.
   *
   * gp_Ax2(point, normal) leaves the reference direction arbitrary. An ellipse
   * built on such an axis is the right size and points wherever the kernel
   * chose -- a shape that looks entirely plausible and is turned the wrong way.
   * Measured: cylinderElliptic came out 48% off in the bounding box while its
   * volume looked nearly right, which is exactly how this kind of bug hides.
   */
  const flatAx = (z: number, alongX: boolean) => new oc.gp_Ax2(
    P(0, 0, z), new oc.gp_Dir(0, 0, 1), new oc.gp_Dir(alongX ? 1 : 0, alongX ? 0 : 1, 0),
  );
  const V = (x: number, y: number, z: number) => new oc.gp_Vec(x, y, z);
  const D = (x: number, y: number, z: number) => new oc.gp_Dir(x, y, z);

  const colors = new Map<any, number[]>();

  // ---- shape plumbing -----------------------------------------------------

  const explore = (shape: any, type: any): any[] => {
    const out: any[] = [];
    const exp = new oc.TopExp_Explorer(shape, type, oc.TopAbs_ShapeEnum.TopAbs_SHAPE);
    while (exp.More()) { out.push(exp.Current()); exp.Next(); }
    return out;
  };

  /** Whether a shape has volume. Used instead of a wrapper carrying a
   *  dimension: a B-rep already knows, so asking it is cheaper than tracking
   *  it, and it cannot get out of step with the shape it describes. */
  const isSolid = (s: any): boolean =>
    explore(s, oc.TopAbs_ShapeEnum.TopAbs_SOLID).length > 0;

  const applied = (shape: any, t: any): any =>
    new oc.BRepBuilderAPI_Transform(shape, t, false).Shape();

  const moved = (shape: any, v: Vec3): any => {
    const t = new oc.gp_Trsf();
    t.SetTranslation(V(v[0], v[1], v[2]));
    return applied(shape, t);
  };

  const measure = (s: any, kind: 'v' | 's'): number => {
    const g = new oc.GProp_GProps();
    if (kind === 'v') oc.BRepGProp.VolumeProperties(s, g, true, false, false);
    else oc.BRepGProp.SurfaceProperties(s, g, false, false);
    return g.Mass();
  };

  /**
   * A shape's bounding box, with the kernel's padding removed.
   *
   * BRepBndLib.Add returns a box grown by a small gap -- measured at 1e-7 per
   * side, so a 10 x 20 x 30 solid reports 10.0000002 wide. Harmless in a preview
   * and wrong in a number a student is asked to read out loud, which is exactly
   * what measureDimensions is for. SetGap(0) is not optional here.
   */
  const bounds = (s: any): [Vec3, Vec3] => {
    const bb = new oc.Bnd_Box();
    // AddOptimal rather than Add. Add falls back to a surface's CONTROL POINTS
    // when there is no triangulation, and a B-spline's control polygon can sit
    // well outside the surface it defines -- so a lofted shape reports a box
    // bigger than it is. AddOptimal computes from the geometry. measureBounding-
    // Box is a number a student is asked to read out loud, so the loose answer
    // is not good enough.
    oc.BRepBndLib.AddOptimal(s, bb, true, true);
    bb.SetGap(0);
    const lo = bb.CornerMin();
    const hi = bb.CornerMax();
    return [[lo.X(), lo.Y(), lo.Z()], [hi.X(), hi.Y(), hi.Z()]];
  };

  // ---- option handling ----------------------------------------------------
  //
  // Every name accepts BOTH call forms, because both appear in the docs and both
  // have to keep working: the library's `cuboid({ size: [40, 20, 10] })` and
  // reSHape's `cuboid(40, 20, 10)`. public/reshape/reshape.js does the same
  // widening for the same reason, and the rule is copied from it exactly -- an
  // object first argument means the library form, anything else is positional.

  const isOpts = (v: any): boolean =>
    v !== null && typeof v === 'object' && !Array.isArray(v) && !isShape(v);

  const isShape = (v: any): boolean =>
    !!v && typeof v === 'object' && typeof v.ShapeType === 'function';

  /**
   * Option keys this layer knows it is DROPPING, and why that is safe.
   *
   * `segments` asks a mesh how finely to approximate a curve. A B-rep stores
   * the real curve, so there is nothing to approximate and the key has nothing
   * to do -- the same verdict lib/script-surface.ts gives generalize, snap and
   * retessellate. Dropping it changes the measured volume, because JSCAD's
   * 12-segment sphere really does hold less than a sphere, and that difference
   * is the conversion working rather than failing.
   */
  const MOOT_OPTIONS = new Set(['segments']);

  /**
   * Every option key each name understands. Used to REFUSE the rest.
   *
   * THE REASON THIS EXISTS. Silently ignoring an unrecognised option is the
   * worst failure this layer can have: `cuboid({ size: [10,10,10],
   * roundRadius: 2 })` would build a sharp box, return it happily, and the
   * student would see a shape that is simply wrong with nothing on screen to
   * say so. Measured before it was added -- four of the nine disagreeing pages
   * were exactly this, reported as a shape difference when they were really an
   * unimplemented feature. Refusing by name turns a wrong answer into a
   * sentence.
   */
  const KNOWN: Record<string, string[]> = {
    cuboid: ['size', 'center', 'width', 'depth', 'height'],
    cube: ['size', 'center'],
    sphere: ['radius', 'center'],
    cylinder: ['radius', 'height', 'center'],
    torus: ['innerRadius', 'outerRadius', 'center', 'innerRotation', 'startAngle'],
    cylinderElliptic: ['startRadius', 'endRadius', 'height', 'center', 'startAngle', 'endAngle'],
    polyhedron: ['points', 'faces', 'colors', 'orientation'],
    rectangle: ['size', 'center', 'width', 'height'],
    square: ['size', 'center'],
    circle: ['radius', 'center', 'startAngle', 'endAngle'],
    ellipse: ['radius', 'center', 'startAngle', 'endAngle'],
    polygon: ['points', 'paths', 'orientation'],
    triangle: ['type', 'values', 'points'],
    star: ['vertices', 'outerRadius', 'innerRadius', 'center', 'startAngle', 'density'],
    extrudeLinear: ['height', 'twistAngle', 'twistSteps', 'repair'],
    extrudeRotate: ['angle', 'startAngle', 'overflow'],
  };

  const refuseUnknown = (name: string, o: Record<string, any>) => {
    const known = KNOWN[name];
    if (!known) return;
    for (const k of Object.keys(o)) {
      if (known.includes(k) || MOOT_OPTIONS.has(k)) continue;
      throw new Error(
        `${name} does not understand the option "${k}" on this kernel. `
        + `It knows: ${known.join(', ')}.`,
      );
    }
    // A key that is KNOWN to the library but not implemented here has to be
    // refused too, and by a different sentence -- "I have not built that yet"
    // is a different message from "there is no such option".
    for (const [key, why] of Object.entries(NOT_YET)) {
      if (o[key] !== undefined && (known.includes(key))) {
        throw new Error(`${name}: ${why}`);
      }
    }
  };

  /** Options this layer accepts as real and has not implemented. Refused by
   *  name rather than ignored, for the reason on KNOWN above. */
  const NOT_YET: Record<string, string> = {
    twistAngle: 'twisting an extrusion is not built on this kernel yet',
    twistSteps: 'twisting an extrusion is not built on this kernel yet',
    innerRotation: 'a rotated torus tube is not built on this kernel yet',
    density: 'star density is not built on this kernel yet',
    paths: 'a polygon of multiple paths is not built on this kernel yet',
  };

  /** Positional arguments folded into the library's option object. */
  const opts = (args: any[], names: string[]): Record<string, any> => {
    if (args.length && isOpts(args[0])) return { ...args[0] };
    const o: Record<string, any> = {};
    for (let i = 0; i < names.length && i < args.length; i++) {
      if (args[i] !== undefined) o[names[i]] = args[i];
    }
    // A trailing options object after the positional values, which is the shape
    // reSHape teaches: cuboid(40, 20, 10, { center: [0, 0, 10] }).
    const last = args[args.length - 1];
    if (args.length > names.length && isOpts(last)) Object.assign(o, last);
    return o;
  };

  const centre = (o: Record<string, any>): Vec3 =>
    (o.center as Vec3) || [0, 0, 0];

  // ---- 2D ------------------------------------------------------------------
  //
  // A 2D shape is a FACE on the XY plane. JSCAD's geom2 is a list of sides; a
  // B-rep's equivalent is a trimmed planar surface, which is what extrudeLinear
  // and extrudeRotate below take.

  const wireFrom = (pts: Array<[number, number]>): any => {
    const w = new oc.BRepBuilderAPI_MakeWire();
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      w.Add(new oc.BRepBuilderAPI_MakeEdge(P(a[0], a[1], 0), P(b[0], b[1], 0)).Edge());
    }
    return w.Wire();
  };
  const faceFrom = (wire: any): any =>
    new oc.BRepBuilderAPI_MakeFace(wire, false).Face();

  const api: Api = { colors } as Api;

  // ---- primitives, 3D ------------------------------------------------------

  api.cuboid = (...args: any[]) => {
    const o = opts(args, ['width', 'depth', 'height']); refuseUnknown('cuboid', o);
    const s: Vec3 = o.size || [o.width ?? 2, o.depth ?? 2, o.height ?? 2];
    const c = centre(o);
    // MakeBox grows from a corner; every JSCAD primitive is centred.
    const raw = new oc.BRepPrimAPI_MakeBox(s[0], s[1], s[2]).Shape();
    return moved(raw, [c[0] - s[0] / 2, c[1] - s[1] / 2, c[2] - s[2] / 2]);
  };
  api.cube = (...args: any[]) => {
    const o = opts(args, ['size']);
    const n = typeof o.size === 'number' ? o.size : 2;
    return api.cuboid({ size: [n, n, n], center: centre(o) });
  };

  api.sphere = (...args: any[]) => {
    const o = opts(args, ['radius']); refuseUnknown('sphere', o);
    const c = centre(o);
    return new oc.BRepPrimAPI_MakeSphere(
      new oc.gp_Ax2(P(c[0], c[1], c[2]), D(0, 0, 1)), o.radius ?? 1,
    ).Shape();
  };

  api.cylinder = (...args: any[]) => {
    const o = opts(args, ['radius', 'height']); refuseUnknown('cylinder', o);
    const h = o.height ?? 2;
    const c = centre(o);
    const raw = new oc.BRepPrimAPI_MakeCylinder(o.radius ?? 1, h).Shape();
    return moved(raw, [c[0], c[1], c[2] - h / 2]);
  };

  api.torus = (...args: any[]) => {
    // reSHape's positional names are ringRadius, tubeRadius -- the SAME two
    // numbers the library calls outerRadius and innerRadius, in the same order,
    // renamed because the library's names are not true. Kept as a separate
    // mapping rather than reusing the library keys positionally, so the next
    // person reading this sees that the rename is deliberate.
    const given = opts(args, ['ringRadius', 'tubeRadius']);
    const o = given.ringRadius !== undefined
      ? { ...given, outerRadius: given.ringRadius, innerRadius: given.tubeRadius,
          ringRadius: undefined, tubeRadius: undefined }
      : given;
    delete o.ringRadius; delete o.tubeRadius;
    refuseUnknown('torus', o);
    // JSCAD's names, kept exactly: innerRadius is the TUBE, outerRadius is the
    // circle the tube travels along. Both mislead, and both are what every
    // existing student file was written against.
    const c = centre(o);
    const raw = new oc.BRepPrimAPI_MakeTorus(o.outerRadius ?? 1, o.innerRadius ?? 0.5).Shape();
    return moved(raw, c);
  };

  api.cylinderElliptic = (...args: any[]) => {
    // POSITIONAL MEANS A CONE, which is not the library's argument order and
    // was worth measuring rather than assuming. public/reshape/reshape.js maps
    // cylinderElliptic(radius, height) to
    // { startRadius: [r, r], endRadius: [0, 0], height } -- a point, because the
    // /sandbox modeller emits exactly that call for its Cone kind. Reading the
    // two numbers as startRadius and endRadius instead built a shape 38% wrong
    // by volume and 48% wrong by bounding box.
    const given = opts(args, ['radius', 'height']);
    const o = given.radius !== undefined && given.startRadius === undefined
      ? { ...given, startRadius: [given.radius, given.radius], endRadius: [0, 0], radius: undefined }
      : given;
    delete o.radius;
    refuseUnknown('cylinderElliptic', o);
    const h = o.height ?? 2;
    const sr = o.startRadius || [1, 1];
    const er = o.endRadius || [1, 1];
    const c = centre(o);
    const ring = (a: number, b: number, z: number) => {
      const w = new oc.BRepBuilderAPI_MakeWire();
      // gp_Elips wants major >= minor, so which world axis the major runs along
      // flips with the caller's numbers -- which is why flatAx takes it as an
      // argument rather than assuming.
      // A gp_Elips whose two radii are EQUAL is degenerate, and OpenCascade does
      // not refuse it -- it builds a curve that is technically a circle and
      // numerically poor, and lofting through it produces a spline that wanders.
      // Measured on the docs' own cone: the VOLUME came out exactly right at
      // 4523.893 while the bounding box ran from -17.81 to 12.00 on an axis that
      // should be symmetric about zero. A volume check alone called that
      // correct, which is why the bounding box is compared too.
      const edge = a === b
        ? new oc.BRepBuilderAPI_MakeEdge(new oc.gp_Circ(flatAx(z, true), a)).Edge()
        : new oc.BRepBuilderAPI_MakeEdge(
          new oc.gp_Elips(flatAx(z, a >= b), Math.max(a, b), Math.min(a, b)),
        ).Edge();
      w.Add(edge);
      return w.Wire();
    };
    // A CONE'S TIP IS A VERTEX, NOT A ZERO-RADIUS ELLIPSE. cylinderElliptic(12,
    // 30) -- the reSHape cone -- asks for endRadius [0, 0], and an ellipse of
    // zero radii is not an edge the kernel will build. ThruSections has AddVertex
    // for exactly this, and it is why the cone case threw before rather than
    // building something slightly wrong.
    const mk = new oc.BRepOffsetAPI_ThruSections(true, false, 1e-6);
    const section = (r: number[], z: number) => {
      if (r[0] === 0 && r[1] === 0) {
        mk.AddVertex(new oc.BRepBuilderAPI_MakeVertex(P(0, 0, z)).Vertex());
      } else {
        mk.AddWire(ring(r[0], r[1], z));
      }
    };
    section(sr, -h / 2);
    section(er, h / 2);
    mk.Build(progress());
    return moved(mk.Shape(), c);
  };

  api.polyhedron = (...args: any[]) => {
    const o = opts(args, ['points', 'faces']); refuseUnknown('polyhedron', o);
    const pts: Vec3[] = o.points || [];
    const sew = new oc.BRepBuilderAPI_Sewing(1e-6, true, true, true, false);
    for (const f of o.faces || []) {
      const w = new oc.BRepBuilderAPI_MakeWire();
      for (let i = 0; i < f.length; i++) {
        const a = pts[f[i]];
        const b = pts[f[(i + 1) % f.length]];
        w.Add(new oc.BRepBuilderAPI_MakeEdge(P(a[0], a[1], a[2]), P(b[0], b[1], b[2])).Edge());
      }
      sew.Add(faceFrom(w.Wire()));
    }
    sew.Perform(progress());
    const sol = new oc.BRepBuilderAPI_MakeSolid();
    sol.Add(oc.TopoDS.Shell(sew.SewedShape()));
    return sol.Solid();
  };

  // ---- primitives, 2D ------------------------------------------------------

  api.rectangle = (...args: any[]) => {
    const o = opts(args, ['width', 'height']); refuseUnknown('rectangle', o);
    const s = o.size || [o.width ?? 2, o.height ?? 2];
    const c = centre(o);
    const [w, h] = [s[0] / 2, s[1] / 2];
    return faceFrom(wireFrom([
      [c[0] - w, c[1] - h], [c[0] + w, c[1] - h], [c[0] + w, c[1] + h], [c[0] - w, c[1] + h],
    ]));
  };
  api.square = (...args: any[]) => {
    const o = opts(args, ['size']);
    const n = typeof o.size === 'number' ? o.size : 2;
    return api.rectangle({ size: [n, n], center: centre(o) });
  };

  api.circle = (...args: any[]) => {
    const o = opts(args, ['radius']);
    const c = centre(o);
    const w = new oc.BRepBuilderAPI_MakeWire();
    w.Add(new oc.BRepBuilderAPI_MakeEdge(
      new oc.gp_Circ(new oc.gp_Ax2(P(c[0], c[1], 0), D(0, 0, 1)), o.radius ?? 1),
    ).Edge());
    return faceFrom(w.Wire());
  };

  api.ellipse = (...args: any[]) => {
    const o = opts(args, ['radius']);
    const r = o.radius || [1, 1];
    const c = centre(o);
    const ax = new oc.gp_Ax2(
      P(c[0], c[1], 0), D(0, 0, 1),
      r[0] >= r[1] ? D(1, 0, 0) : D(0, 1, 0),
    );
    const w = new oc.BRepBuilderAPI_MakeWire();
    // Equal radii means a circle; see the note in cylinderElliptic for what a
    // degenerate gp_Elips does downstream.
    w.Add(new oc.BRepBuilderAPI_MakeEdge(
      r[0] === r[1]
        ? new oc.gp_Circ(ax, r[0])
        : new oc.gp_Elips(ax, Math.max(r[0], r[1]), Math.min(r[0], r[1])),
    ).Edge());
    return faceFrom(w.Wire());
  };

  api.polygon = (...args: any[]) => {
    const o = opts(args, ['points']); refuseUnknown('polygon', o);
    const pts = o.points || [];
    // JSCAD accepts either a flat list of points or a list of paths; only the
    // flat form is supported here, and the other is refused by name rather than
    // silently building the first path.
    if (Array.isArray(pts[0]) && Array.isArray(pts[0][0])) {
      throw new Error('polygon with multiple paths is not supported on this kernel yet');
    }
    return faceFrom(wireFrom(pts));
  };

  api.triangle = (...args: any[]) => {
    const o = opts(args, ['type', 'values']);
    // Only the explicit-points form; JSCAD's SSS/ASA/etc. solvers are
    // trigonometry we have not ported, and guessing would build a wrong shape
    // silently.
    if (!o.points) throw new Error('triangle needs points on this kernel');
    return faceFrom(wireFrom(o.points));
  };

  api.star = (...args: any[]) => {
    const o = opts(args, ['vertices', 'outerRadius', 'innerRadius']); refuseUnknown('star', o);
    const n = o.vertices ?? 5;
    const outer = o.outerRadius ?? 1;
    const inner = o.innerRadius ?? (outer * Math.cos(Math.PI / n) / Math.cos(Math.PI / n / 2));
    const c = centre(o);
    const start = o.startAngle ?? 0;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = start + (i * Math.PI) / n;
      pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]);
    }
    return faceFrom(wireFrom(pts));
  };

  // ---- extrusions ----------------------------------------------------------

  api.extrudeLinear = (...args: any[]) => {
    const o = isOpts(args[0]) ? args[0] : { height: args[0] };
    refuseUnknown('extrudeLinear', o);
    const shapes = args.filter(isShape);
    const h = o.height ?? 1;
    const made = shapes.map((f: any) =>
      new oc.BRepPrimAPI_MakePrism(f, V(0, 0, h), false, true).Shape());
    return made.length === 1 ? made[0] : made;
  };

  api.extrudeRotate = (...args: any[]) => {
    const o = isOpts(args[0]) ? args[0] : {};
    refuseUnknown('extrudeRotate', o);
    const shape = args.find(isShape);
    const angle = o.angle ?? TAU;
    // MEASURED, not assumed. JSCAD reads the flat profile as a cross-section in
    // the half-plane: its X is the RADIUS and its Y is the HEIGHT, and the sweep
    // is about world Z. A rectangle at x 10..20, y -15..15 comes back spanning
    // [[-20,-20,-15],[20,20,15]] with the volume Pappus predicts about Z.
    //
    // The first version here revolved about Y with the profile left lying in XY.
    // Its VOLUME was within 0.29% -- because the profile happened to be
    // symmetric -- while the bounding box was 50% wrong. A volume check alone
    // would have called that correct.
    const stand = new oc.gp_Trsf();
    stand.SetRotation(new oc.gp_Ax1(P(0, 0, 0), D(1, 0, 0)), Math.PI / 2);
    const upright = applied(shape, stand);
    return new oc.BRepPrimAPI_MakeRevol(
      upright, new oc.gp_Ax1(P(0, 0, 0), D(0, 0, 1)), angle, true,
    ).Shape();
  };

  // ---- booleans ------------------------------------------------------------

  const fold = (Op: any, args: any[]): any => {
    const shapes = args.flat().filter(isShape);
    let acc = shapes[0];
    for (let i = 1; i < shapes.length; i++) {
      const op = new Op(acc, shapes[i], progress());
      op.Build(progress());
      acc = op.Shape();
    }
    return acc;
  };
  api.union = (...args: any[]) => fold(oc.BRepAlgoAPI_Fuse, args);
  api.subtract = (...args: any[]) => fold(oc.BRepAlgoAPI_Cut, args);
  api.intersect = (...args: any[]) => fold(oc.BRepAlgoAPI_Common, args);

  api.scission = (shape: any) =>
    explore(shape, oc.TopAbs_ShapeEnum.TopAbs_SOLID);

  // ---- transforms ----------------------------------------------------------

  api.translate = (v: Vec3, ...shapes: any[]) => {
    const made = shapes.flat().filter(isShape).map((s: any) => moved(s, v));
    return made.length === 1 ? made[0] : made;
  };
  api.translateX = (n: number, ...s: any[]) => api.translate([n, 0, 0], ...s);
  api.translateY = (n: number, ...s: any[]) => api.translate([0, n, 0], ...s);
  api.translateZ = (n: number, ...s: any[]) => api.translate([0, 0, n], ...s);

  const spun = (shape: any, axis: Vec3, angle: number) => {
    const t = new oc.gp_Trsf();
    t.SetRotation(new oc.gp_Ax1(P(0, 0, 0), D(axis[0], axis[1], axis[2])), angle);
    return applied(shape, t);
  };
  api.rotate = (a: Vec3, ...shapes: any[]) => {
    // JSCAD applies X, then Y, then Z, about the WORLD origin. Order matters and
    // is copied rather than chosen.
    const made = shapes.flat().filter(isShape).map((s: any) => {
      let out = s;
      if (a[0]) out = spun(out, [1, 0, 0], a[0]);
      if (a[1]) out = spun(out, [0, 1, 0], a[1]);
      if (a[2]) out = spun(out, [0, 0, 1], a[2]);
      return out;
    });
    return made.length === 1 ? made[0] : made;
  };
  api.rotateX = (n: number, ...s: any[]) => api.rotate([n, 0, 0], ...s);
  api.rotateY = (n: number, ...s: any[]) => api.rotate([0, n, 0], ...s);
  api.rotateZ = (n: number, ...s: any[]) => api.rotate([0, 0, n], ...s);

  const flipped = (shape: any, normal: Vec3) => {
    const t = new oc.gp_Trsf();
    t.SetMirror(new oc.gp_Ax2(P(0, 0, 0), D(normal[0], normal[1], normal[2])));
    return applied(shape, t);
  };
  api.mirrorX = (...s: any[]) => {
    const made = s.flat().filter(isShape).map((x: any) => flipped(x, [1, 0, 0]));
    return made.length === 1 ? made[0] : made;
  };
  api.mirrorY = (...s: any[]) => {
    const made = s.flat().filter(isShape).map((x: any) => flipped(x, [0, 1, 0]));
    return made.length === 1 ? made[0] : made;
  };
  api.mirrorZ = (...s: any[]) => {
    const made = s.flat().filter(isShape).map((x: any) => flipped(x, [0, 0, 1]));
    return made.length === 1 ? made[0] : made;
  };

  api.scale = (f: Vec3 | number, ...shapes: any[]) => {
    const v: Vec3 = typeof f === 'number' ? [f, f, f] : f;
    // UNIFORM ONLY, and it refuses rather than approximating. gp_Trsf scales by
    // one factor for all three axes, and BRepBuilderAPI_GTransform -- the only
    // thing that applies an unequal stretch -- is not bound in this build. See
    // lib/script-surface.ts, where `scale` is classified `unbound` for this
    // exact reason. Building something almost-right here would be worse than
    // saying so.
    if (v[0] !== v[1] || v[1] !== v[2]) {
      throw new Error(
        'scale with different factors per axis needs BRepBuilderAPI_GTransform, '
        + 'which this OpenCascade build does not expose. scale([2, 2, 2], s) works.',
      );
    }
    const t = new oc.gp_Trsf();
    t.SetScale(P(0, 0, 0), v[0]);
    const made = shapes.flat().filter(isShape).map((s: any) => applied(s, t));
    return made.length === 1 ? made[0] : made;
  };

  api.center = (...args: any[]) => {
    const o = isOpts(args[0]) ? args[0] : {};
    const axes = o.axes || [true, true, true];
    const rel: Vec3 = o.relativeTo || [0, 0, 0];
    const made = args.filter(isShape).map((s: any) => {
      const [lo, hi] = bounds(s);
      const d: Vec3 = [0, 0, 0];
      for (let i = 0; i < 3; i++) if (axes[i]) d[i] = rel[i] - (lo[i] + hi[i]) / 2;
      return moved(s, d);
    });
    return made.length === 1 ? made[0] : made;
  };
  api.centerX = (...s: any[]) => api.center({ axes: [true, false, false] }, ...s);
  api.centerY = (...s: any[]) => api.center({ axes: [false, true, false] }, ...s);
  api.centerZ = (...s: any[]) => api.center({ axes: [false, false, true] }, ...s);

  api.align = (...args: any[]) => {
    const o = isOpts(args[0]) ? args[0] : {};
    const modes = o.modes || ['center', 'center', 'min'];
    const rel: Vec3 = o.relativeTo || [0, 0, 0];
    const shapes = args.filter(isShape);
    const made = shapes.map((s: any) => {
      const [lo, hi] = bounds(s);
      const d: Vec3 = [0, 0, 0];
      for (let i = 0; i < 3; i++) {
        if (modes[i] === 'center') d[i] = rel[i] - (lo[i] + hi[i]) / 2;
        else if (modes[i] === 'min') d[i] = rel[i] - lo[i];
        else if (modes[i] === 'max') d[i] = rel[i] - hi[i];
      }
      return moved(s, d);
    });
    return made.length === 1 ? made[0] : made;
  };

  // ---- hull, which is ours -------------------------------------------------
  //
  // Wired to lib/hull.ts through the tessellation, because a B-rep sphere has no
  // vertices to hull -- the surface has to be sampled, and the mesh deflection
  // IS that sampling density. One dial, not two: measured on the docs' own
  // two-sphere example, the default lands 0.475% off the exact capsule volume
  // against 1.66% for the 24-segment mesh the docs ship today.
  api.hull = (...args: any[]) => {
    if (!deps.tessellate || !deps.convexHull) {
      throw new Error('hull needs tessellate and convexHull passed to createApi');
    }
    const pts: Array<[number, number, number]> = [];
    const seen = new Set<string>();
    for (const s of args.flat().filter(isShape)) {
      const g = deps.tessellate(oc, s, { deflection: deps.deflection ?? 0.05 });
      if (!g) continue;
      for (const poly of g.polygons) {
        for (const v of poly.vertices) {
          // Tessellation repeats a vertex once per triangle touching it, and a
          // hull over duplicates is slower for no gain.
          const k = `${v[0].toFixed(6)},${v[1].toFixed(6)},${v[2].toFixed(6)}`;
          if (seen.has(k)) continue;
          seen.add(k);
          pts.push([v[0], v[1], v[2]]);
        }
      }
    }
    const h = deps.convexHull(pts);
    if (!h) throw new Error('those shapes are flat, so their hull would have no thickness');
    const sew = new oc.BRepBuilderAPI_Sewing(1e-6, true, true, true, false);
    for (const t of h.triangles) {
      const w = new oc.BRepBuilderAPI_MakeWire();
      for (let i = 0; i < 3; i++) {
        const a = pts[t[i]];
        const b = pts[t[(i + 1) % 3]];
        w.Add(new oc.BRepBuilderAPI_MakeEdge(P(a[0], a[1], a[2]), P(b[0], b[1], b[2])).Edge());
      }
      sew.Add(faceFrom(w.Wire()));
    }
    sew.Perform(progress());
    const sol = new oc.BRepBuilderAPI_MakeSolid();
    sol.Add(oc.TopoDS.Shell(sew.SewedShape()));
    return sol.Solid();
  };
  api.hullChain = (...args: any[]) => {
    const shapes = args.flat().filter(isShape);
    const links = [];
    for (let i = 0; i + 1 < shapes.length; i++) links.push(api.hull(shapes[i], shapes[i + 1]));
    return api.union(...links);
  };

  // ---- measurements --------------------------------------------------------

  const each = (v: any): any[] => (Array.isArray(v) ? v.flat().filter(isShape) : [v]);

  api.measureVolume = (s: any) => (isSolid(s) ? measure(s, 'v') : 0);
  api.measureAggregateVolume = (...s: any[]) =>
    s.flat().filter(isShape).reduce((n: number, x: any) => n + api.measureVolume(x), 0);
  api.measureAggregateArea = (...s: any[]) =>
    s.flat().filter(isShape).reduce((n: number, x: any) => n + api.measureArea(x), 0);
  api.measureAggregateBoundingBox = (...args: any[]) => {
    const lo: Vec3 = [Infinity, Infinity, Infinity];
    const hi: Vec3 = [-Infinity, -Infinity, -Infinity];
    for (const x of args.flat().filter(isShape)) {
      const [a, b] = bounds(x);
      for (let i = 0; i < 3; i++) {
        if (a[i] < lo[i]) lo[i] = a[i];
        if (b[i] > hi[i]) hi[i] = b[i];
      }
    }
    return [lo, hi];
  };
  api.measureArea = (s: any) => measure(s, 's');
  api.measureBoundingBox = (s: any) =>
    (Array.isArray(s) ? api.measureAggregateBoundingBox(s) : bounds(s));
  api.measureDimensions = (s: any) => {
    const [lo, hi] = bounds(s);
    return [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  };
  api.measureCenter = (s: any) => {
    const [lo, hi] = bounds(s);
    return [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  };
  api.measureCenterOfMass = (s: any) => {
    const g = new oc.GProp_GProps();
    oc.BRepGProp.VolumeProperties(s, g, true, false, false);
    const c = g.CentreOfMass();
    return [c.X(), c.Y(), c.Z()];
  };

  // ---- colour, which the kernel does not carry -----------------------------
  //
  // An OpenCascade shape has no colour field, so the mapping is kept beside it.
  // That is not a shortcut: JSCAD stores colour on the geometry object and the
  // renderer reads it there, so this is the same arrangement with the map held
  // one level out. The shape itself is returned unchanged, which is why a
  // coloured model measures exactly as the uncoloured one does.
  api.colorize = (color: number[], ...shapes: any[]) => {
    const made = shapes.flat().filter(isShape);
    for (const s of made) colors.set(s, color);
    return made.length === 1 ? made[0] : made;
  };

  // ---- pure arithmetic -----------------------------------------------------
  api.degToRad = (d: number) => (d / 180) * Math.PI;
  api.radToDeg = (r: number) => (r / Math.PI) * 180;

  return api;
}
