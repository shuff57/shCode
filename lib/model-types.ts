// The canonical form of a mouse-built model. JSCAD source is a one-way
// projection of this, the way Mermaid is a projection of a DiagramDoc — the
// student never hand-writes the JSON, and the generated code is never parsed
// back. Stored in lesson_drafts like a diagram, so there is no new table.
//
// An ordered feature list IS a program: each row is a statement, each number a
// value, and subtract(a, b) is not subtract(b, a). That is the whole reason the
// visual mode belongs in a CS course rather than beside one.

import type { Constraint as SketchConstraint } from './sketch-solve';
import { reindex } from './sketch-arc';

/** Re-exported so a caller needs one import to work with a sketch. */
export type { Constraint as SketchConstraint } from './sketch-solve';

export type Vec3 = [number, number, number];

/** How a shape's edges are killed. JSCAD has no fillet(); see model-codegen. */
export type RoundStyle = 'fillet' | 'chamfer';

/** A single world axis, spelled out rather than as a Vec3 direction — a
 *  student picks "which way", not three numbers, for a bore or a spin. */
export type Axis3 = 'x' | 'y' | 'z';

export interface BoxFeature {
  id: string;
  kind: 'box';
  name?: string;
  size: Vec3;
  center: Vec3;
  /** Degrees about x, y, z. Absent means unrotated, and keeps the code simple. */
  rotate?: Vec3;
  /** Edge radius. 0 or absent leaves the edges sharp. */
  round?: number;
  roundStyle?: RoundStyle;
}

export interface CylinderFeature {
  id: string;
  kind: 'cylinder';
  name?: string;
  radius: number;
  height: number;
  center: Vec3;
  rotate?: Vec3;
  round?: number;
  roundStyle?: RoundStyle;
}

export interface SphereFeature {
  id: string;
  kind: 'sphere';
  name?: string;
  radius: number;
  center: Vec3;
}

export interface ConeFeature {
  id: string;
  kind: 'cone';
  name?: string;
  radius: number;
  height: number;
  center: Vec3;
  rotate?: Vec3;
}

export interface TorusFeature {
  id: string;
  kind: 'torus';
  name?: string;
  /** Distance from the centre of the ring to the centre of the tube. */
  ringRadius: number;
  /** Thickness of the tube itself. */
  tubeRadius: number;
  center: Vec3;
  rotate?: Vec3;
}

/** Which flat plane a sketch is drawn on. Extrusion runs perpendicular to it. */
export type SketchPlane = 'xy' | 'xz' | 'yz';

/** A closed outline, drawn flat. Not a solid until something extrudes it. */
export interface SketchFeature {
  id: string;
  kind: 'sketch';
  name?: string;
  plane: SketchPlane;
  /** How far the plane sits from the origin along its own normal. */
  offset: number;
  /** Corners in plane coordinates, in order. The outline always closes. */
  points: Array<[number, number]>;
  /**
   * How the outline is read. Absent = a straight-edged polyline, which is
   * every sketch saved before this field existed. 'circle' = exactly two
   * points, which are the ends of a diameter.
   *
   * This is a TAG, not an inference. The two-point-plus-bulges form was
   * considered and rejected: it made "is this a circle" a float comparison
   * repeated at three call sites with nothing tying them together.
   */
  shape?: 'circle';
  /**
   * Bulge of the edge LEAVING corner n (edge n = corner n -> corner n+1,
   * wrapping -- the same convention edgeCorners() in sketch-solve.ts already
   * uses). tan(includedAngle / 4). 0 or a missing key is a straight edge.
   * Never written when shape === 'circle': the tag is the only source of
   * truth there, so the two cannot disagree. See lib/sketch-arc.ts.
   */
  bulges?: Record<number, number>;
  /** Rules the corners must obey. Absent means free-hand. */
  constraints?: SketchConstraint[];
}

export interface ExtrudeFeature {
  id: string;
  kind: 'extrude';
  name?: string;
  /** The sketch this pulls into a solid. */
  target: string;
  height: number;
}

export interface CombineFeature {
  id: string;
  kind: 'combine';
  name?: string;
  op: 'union' | 'subtract' | 'intersect';
  /** Ids of earlier features. For subtract, the first is the body. */
  targets: string[];
}

/** A solid of revolution. shCAD already exposes revolve() in code mode; this
 *  is the Build-mode equivalent, spinning a sketch around the world Z axis. */
export interface RevolveFeature {
  id: string;
  kind: 'revolve';
  name?: string;
  /** The sketch this spins into a solid — same restriction extrude has. */
  target: string;
  /** Degrees to sweep. 360 is a full solid; less leaves a pie-slice gap. */
  angle: number;
}

/**
 * A mirrored copy of an earlier feature across one of the three base planes.
 *
 * Mirror keeps the original standing: like Onshape's default (merge scope
 * off), the source feature stays visible and the mirrored copy is added
 * alongside it, rather than replacing it. See topLevel() for where that is
 * enforced — a mirror's target is deliberately never marked consumed.
 */
export interface MirrorFeature {
  id: string;
  kind: 'mirror';
  name?: string;
  target: string;
  plane: SketchPlane;
}

/**
 * Repeated copies of an earlier feature — a linear row or a ring around an
 * axis. `count` includes the original, so count 1 is a no-op pattern.
 *
 * Unlike every other feature, a pattern's generated code is not one
 * expression: model-codegen emits it as a real `for` loop, because a pattern
 * IS a loop and hiding that behind a helper call would throw away the point.
 */
export interface PatternFeature {
  id: string;
  kind: 'pattern';
  name?: string;
  target: string;
  mode: 'linear' | 'circular';
  /** Total instances, original included. */
  count: number;
  /** linear only: how far each successive copy shifts. */
  step?: Vec3;
  /** circular only: which world axis the copies orbit. */
  axis?: Axis3;
  /** circular only: degrees the whole ring of copies spans. Spacing between
   *  instances is totalAngle / count, so 360 wraps without a doubled instance
   *  at the seam. */
  totalAngle?: number;
}

/**
 * A cylindrical hole bored into an earlier solid. Sugar over cylinder +
 * subtract — the model tree shows one row for it, not a separate tool body
 * plus a separate cut, even though the generated line does exactly that.
 */
export interface HoleFeature {
  id: string;
  kind: 'hole';
  name?: string;
  /** The solid the hole is cut into. */
  target: string;
  diameter: number;
  depth: number;
  /** Where the hole's mouth sits, as an offset from `target`'s own
   *  bounding-box centre -- not an absolute world position. [0, 0, 0]
   *  means "dead centre on the target," wherever the target actually is;
   *  see centerOn() in model-codegen.ts. */
  center: Vec3;
  /** Which way the drill points. 'z' bores straight down, matching a hole
   *  placed on a flat top face without any tilt. */
  axis: Axis3;
  /**
   * Four bores instead of one, placed symmetrically around `center` -- half
   * the corner-to-corner spacing on each of the two axes the drill does not
   * point along. Cut from `target` in a single subtract (real JSCAD accepts
   * more than one shape to remove at once), so a bolt pattern is one feature
   * row with guaranteed-matching offsets on every side, not four separate
   * holes a student eyeballed into place one at a time.
   */
  corners?: { dx: number; dy: number };
}

/**
 * A hollowed-out copy of an earlier solid: wall thickness in, solid body out.
 *
 * NOT a true shell. A true shell offsets every face inward by the same
 * distance, so the wall is exactly `thickness` everywhere. This scales a copy
 * of the whole body inward around its own bounding-box centre by a fraction
 * computed from that box, which means a long thin part gets a thin wall on
 * its long axis and a thick one on its short axis, and a curved body (a ball,
 * a tube) is not uniformly thin at all. The vendored JSCAD bundle has no
 * boolean offset operation, which is the only thing that would do this
 * honestly — see the `shellOp` comment in model-codegen.ts.
 */
export interface ShellFeature {
  id: string;
  kind: 'shell';
  name?: string;
  target: string;
  thickness: number;
}

/**
 * Move or copy an earlier feature by a vector — the move/copy half of
 * Onshape's Transform tool; the rotate half already ships as Turn.
 *
 * `copy: true` leaves the original in place and adds a translated duplicate.
 * `copy: false` relocates the original — the target is consumed and only the
 * moved feature is shown. See topLevel().
 */
export interface MoveFeature {
  id: string;
  kind: 'move';
  name?: string;
  target: string;
  offset: Vec3;
  copy: boolean;
}

export type Feature =
  | BoxFeature | CylinderFeature | SphereFeature
  | ConeFeature | TorusFeature
  | SketchFeature | ExtrudeFeature | CombineFeature
  | RevolveFeature | MirrorFeature | PatternFeature
  | HoleFeature | ShellFeature | MoveFeature;

/**
 * Ids of earlier features this one is built from directly.
 *
 * Structural, not a kind list: a feature depends on whatever its own
 * `targets` or `target` field names. The reorder guard in ModelEditor.tsx
 * calls this instead of checking `f.kind === 'combine'` by name, so a future
 * derived kind is covered automatically as long as it uses one of these two
 * field names for its dependency -- the same way every derived kind already
 * does -- rather than needing a human to remember to add it to a list.
 */
export function dependsOn(f: Feature): string[] {
  if ('targets' in f) return f.targets;
  if ('target' in f) return [f.target];
  return [];
}

/** Anything that consumes an earlier feature rather than standing alone. */
export function isDerived(
  f: Feature
): f is CombineFeature | ExtrudeFeature | RevolveFeature | MirrorFeature
  | PatternFeature | HoleFeature | ShellFeature | MoveFeature {
  return (
    f.kind === 'combine' || f.kind === 'extrude' || f.kind === 'revolve' ||
    f.kind === 'mirror' || f.kind === 'pattern' || f.kind === 'hole' ||
    f.kind === 'shell' || f.kind === 'move'
  );
}

export interface ModelDoc {
  version: 1;
  features: Feature[];
}

export const EMPTY_DOC: ModelDoc = { version: 1, features: [] };

/** A positioned primitive: has a centre, and can carry handles. Listed
 *  positively rather than by exclusion — every feature added since the six
 *  derived kinds below has needed to be left OUT of this, not in it. */
export function isShape(
  f: Feature
): f is BoxFeature | CylinderFeature | SphereFeature | ConeFeature | TorusFeature {
  return (
    f.kind === 'box' || f.kind === 'cylinder' || f.kind === 'sphere' ||
    f.kind === 'cone' || f.kind === 'torus'
  );
}

/** Only a primitive can be rounded — see canRound() for why a combine cannot. */
export function isRoundable(f: Feature): f is BoxFeature | CylinderFeature {
  return f.kind === 'box' || f.kind === 'cylinder';
}

/**
 * Why the fillet/chamfer tool refuses, or null when it does not.
 *
 * JSCAD solids are polygon soups with no topology, so there is no edge to pick
 * and no B-rep kernel to blend it. What there IS: rounded primitives, and hull
 * tricks that chamfer one. Both need the shape itself, before anything was cut
 * out of it. Refusing here and saying so is better than a fillet button that
 * quietly does nothing on half the tree -- and it teaches the thing the feature
 * list exists to teach, which is that order changes the result.
 */
export function whyCannotRound(f: Feature): string | null {
  if (f.kind === 'combine') {
    // The remedy has to name what actually happened: cutting is the only
    // combine that removes material, so "before you cut it" is backwards
    // advice for a Join or an Overlap, where nothing was cut at all.
    if (f.op === 'subtract') {
      return 'Rounding works on a shape, not a combination. Round the shape before you cut it.';
    }
    const verb = f.op === 'union' ? 'join' : 'overlap';
    return `Rounding works on a shape, not a combination. Round the shapes before you ${verb} them.`;
  }
  if (f.kind === 'sketch') {
    // A circle sketch has no Rules panel -- ModelEditor.tsx only renders
    // SketchConstraints (the panel that carries Round a corner) when
    // shape !== 'circle', because a circle has no corners for that panel's
    // per-edge rows to describe. Naming that remedy for a circle anyway
    // points the student at a control they cannot reach.
    //
    // This message has now been wrong three times, each time narrower: first
    // it named a corner-rounding tool that did not exist; then it named the
    // Rules panel, which a circle never renders; then it said to pull the
    // circle into a solid and round THAT, which isRoundable() refuses for
    // anything but a box or a cylinder. Three generations of naming a
    // remedy that cannot be reached. So this one names none: it states what
    // is true about a circle and stops.
    if (f.shape === 'circle') {
      return 'A circle has no corners to round — it is already round the whole way. Rounding is for shapes with edges, like a box.';
    }
    // A real remedy now exists -- Round a corner in the Rules panel, below
    // the sketch's own edge table -- so this names it rather than the older
    // sentence claiming no such tool existed, which stopped being true the
    // day that panel shipped.
    return 'Rounding works on a solid shape, not a flat sketch. To round a corner here, use Round a corner in the Rules panel.';
  }
  if (f.kind === 'extrude' || f.kind === 'revolve') {
    const past = f.kind === 'extrude' ? 'pulled' : 'spun';
    const bare = f.kind === 'extrude' ? 'pull' : 'spin';
    // Conditional on purpose: this function is handed one feature and cannot
    // see whether the sketch behind it has corners at all. A circle-sourced
    // pull has none, so an unconditional "go round its corners" would be the
    // same false remedy again, one level up.
    return `Rounding works on a shape you build with a tool like Box or Cylinder, not one ${past} from a sketch. If its sketch has corners, use Round a corner in the Rules panel before you ${bare} it.`;
  }
  if (f.kind === 'sphere' || f.kind === 'torus') {
    return 'That shape has no edges to round — it is curved all the way round.';
  }
  if (f.kind === 'cone') {
    return 'Rounding a cone is not supported yet.';
  }
  // These four fell through to the null below until this pass: isRoundable()
  // was already the real gate (only a box or cylinder has a round/roundStyle
  // field to write), but nothing here said so first -- so the Round button
  // lit up as available, the click landed on the silent `if (!isRoundable(f))
  // return;` guard in ModelEditor's round(), and nothing happened. No error,
  // no model change, no explanation. Same defect species as a control that
  // produces a result nobody asked for: a control that claims to work and
  // silently doesn't is just the other side of that coin.
  if (f.kind === 'hole') {
    return 'Rounding works on the shape, not the hole cut into it. Round the shape before you drill it.';
  }
  if (f.kind === 'shell') {
    return 'Rounding works on a shape, not a hollowed-out one. Round the shape before you hollow it out.';
  }
  if (f.kind === 'mirror') {
    return 'Rounding works on the original shape, not a mirrored copy. Round it before you mirror it.';
  }
  if (f.kind === 'pattern') {
    return 'Rounding works on the original shape, not a repeated copy. Round it before you repeat it.';
  }
  if (f.kind === 'move') {
    // Copy leaves the original standing right there in the list -- telling a
    // student to round "before you move it" when nothing moved (the row even
    // says "(copy)") points them at a step that already happened to a shape
    // that is still available to round directly.
    return f.copy
      ? 'Rounding works on the original shape, not a copy made by Move. Round it before you copy it.'
      : 'Rounding works on the original shape, not a moved copy. Round it before you move it.';
  }
  return null;
}

/**
 * Why Repeat Around would do nothing visible, or null when it would work.
 *
 * A circular pattern orbits a world axis. A shape whose middle sits ON that
 * axis has no radius to sweep, so every copy lands exactly on the original
 * and the union is the shape you started with -- a control that reports
 * success and changes nothing. Refusing up front is better than a feature row
 * that claims six copies exist.
 *
 * Only answerable for a plain primitive, whose centre this file knows. A
 * derived feature's position lives in the generated geometry, not the doc, so
 * this returns null and lets it through rather than guessing.
 */
export function whyCannotOrbit(f: Feature, axis: 'x' | 'y' | 'z'): string | null {
  if (!isShape(f)) return null;
  const [x, y, z] = f.center;
  const offAxis = axis === 'x' ? Math.hypot(y, z)
    : axis === 'y' ? Math.hypot(x, z)
    : Math.hypot(x, y);
  if (offAxis > 0.01) return null;
  return 'Repeat Around spins copies about the middle of the world, so a shape sitting in the middle has nothing to spin around — every copy would land on top of the first. Move it away from the middle first.';
}

/** A sphere looks identical however it is turned, so offering the control
 *  would only teach that some buttons do nothing. */
export function canRotate(
  f: Feature
): f is BoxFeature | CylinderFeature | ConeFeature | TorusFeature {
  return f.kind === 'box' || f.kind === 'cylinder' || f.kind === 'cone' || f.kind === 'torus';
}

/** Largest round that still leaves a shape. Past this JSCAD throws. */
export function maxRound(f: BoxFeature | CylinderFeature): number {
  const smallest =
    f.kind === 'box'
      ? Math.min(f.size[0], f.size[1], f.size[2])
      : Math.min(f.radius * 2, f.height);
  return Math.max(0, smallest / 2 - 0.01);
}

/** Ids are short because they become variable names in the generated code. */
export function nextId(doc: ModelDoc, prefix: string): string {
  const taken = new Set(doc.features.map((f) => f.id));
  for (let n = 1; ; n++) {
    const id = `${prefix}${n}`;
    if (!taken.has(id)) return id;
  }
}

export type ShapeKind = 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus';

/** A rectangle to start from. An empty canvas with no corners gives a student
 *  nothing to grab, and every real sketch begins by editing a shape anyway. */
export function newSketch(doc: ModelDoc, plane: SketchPlane = 'xy'): SketchFeature {
  return {
    id: nextId(doc, 'sk'),
    kind: 'sketch',
    plane,
    offset: 0,
    points: [[0, 0], [40, 0], [40, 25], [0, 25]],
  };
}

/** A circle, drawn as the two ends of a diameter -- see SketchFeature.shape.
 *  Not a rectangle-with-round-corners and not four points: the tag is the
 *  only thing that makes it a circle, so the data says so directly. */
export function newCircleSketch(doc: ModelDoc, plane: SketchPlane = 'xy'): SketchFeature {
  return {
    id: nextId(doc, 'sk'),
    kind: 'sketch',
    plane,
    offset: 0,
    points: [[-10, 0], [10, 0]],
    shape: 'circle',
  };
}

export function newExtrude(doc: ModelDoc, target: string): ExtrudeFeature {
  return { id: nextId(doc, 'pull'), kind: 'extrude', target, height: 12 };
}

export function newRevolve(doc: ModelDoc, target: string): RevolveFeature {
  return { id: nextId(doc, 'rev'), kind: 'revolve', target, angle: 360 };
}

// No default plane -- Onshape makes the mirror plane a required field and
// refuses to complete the feature without one, precisely because there is no
// plane that is silently "probably right." A caller that has not asked the
// student which way to flip has no business creating this feature yet.
export function newMirror(
  doc: ModelDoc, target: string, plane: SketchPlane
): MirrorFeature {
  return { id: nextId(doc, 'mir'), kind: 'mirror', target, plane };
}

export function newPattern(
  doc: ModelDoc, target: string, mode: 'linear' | 'circular' = 'linear'
): PatternFeature {
  const id = nextId(doc, 'pat');
  return mode === 'linear'
    ? { id, kind: 'pattern', target, mode, count: 3, step: [30, 0, 0] }
    : { id, kind: 'pattern', target, mode, count: 6, axis: 'z', totalAngle: 360 };
}

/** center: [0, 0, 0] is not world zero -- see HoleFeature.center. It is "no
 *  offset," so codegen (centerOn() in model-codegen.ts) reads it against
 *  the TARGET's own bounding-box centre at build time, wherever the target
 *  actually sits. A doc-level default has no target geometry to ask, which
 *  is exactly why the interpretation lives in codegen and not here. */
export function newHole(doc: ModelDoc, target: string): HoleFeature {
  return {
    id: nextId(doc, 'hole'), kind: 'hole', target,
    diameter: 6, depth: 10, center: [0, 0, 0], axis: 'z',
  };
}

/** Same hole, drilled at all four corners of a rectangle at once -- see
 *  HoleFeature.corners. The starting spacing is a guess the Dimensions panel
 *  makes exact; only ever offered while boring straight down, which is the
 *  bolt-pattern case this exists for. */
export function newHoleCorners(doc: ModelDoc, target: string): HoleFeature {
  return {
    id: nextId(doc, 'hole'), kind: 'hole', target,
    diameter: 6, depth: 10, center: [0, 0, 0], axis: 'z',
    corners: { dx: 15, dy: 10 },
  };
}

export function newShell(doc: ModelDoc, target: string): ShellFeature {
  return { id: nextId(doc, 'shell'), kind: 'shell', target, thickness: 2 };
}

export function newMove(doc: ModelDoc, target: string, copy = false): MoveFeature {
  return { id: nextId(doc, 'move'), kind: 'move', target, offset: [20, 0, 0], copy };
}

/** Insert a corner halfway along the edge after `index`, which is where a
 *  student expects a new one to land when they ask for it. A circle sketch
 *  is refused as a no-op: its two points are diameter ends, read that way
 *  ONLY because shape === 'circle' says so (see SketchFeature.shape), and
 *  splicing a third point in would leave that tag pointing at a pair of
 *  points that are no longer the diameter (Finding 3, sketch gauntlet round
 *  2). ModelEditor.tsx's corner() already refuses before calling this, with
 *  a message the student sees -- this is the belt under that belt. */
export function addCorner(f: SketchFeature, index: number): SketchFeature {
  if (f.shape === 'circle') return f;
  const a = f.points[index];
  const b = f.points[(index + 1) % f.points.length];
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const points = [...f.points];
  points.splice(index + 1, 0, mid);
  // Reindex constraints and bulges through the same seam filletCorner() uses
  // in lib/sketch-arc.ts -- fixes a bug that predates this build: a
  // constraint used to go on pointing at its OLD corner/edge number even
  // after the splice moved that number to a different point.
  return { ...reindex(f, index), points };
}

export function newShape(doc: ModelDoc, kind: ShapeKind): Feature {
  if (kind === 'box') {
    return { id: nextId(doc, 'box'), kind, size: [40, 40, 20], center: [0, 0, 0] };
  }
  if (kind === 'cylinder') {
    return { id: nextId(doc, 'cyl'), kind, radius: 10, height: 40, center: [0, 0, 0] };
  }
  if (kind === 'cone') {
    return { id: nextId(doc, 'cone'), kind, radius: 12, height: 30, center: [0, 0, 0] };
  }
  if (kind === 'torus') {
    return { id: nextId(doc, 'ring'), kind, ringRadius: 14, tubeRadius: 4, center: [0, 0, 0] };
  }
  return { id: nextId(doc, 'ball'), kind, radius: 15, center: [0, 0, 0] };
}

function labelOf(f: Feature): string {
  if (f.kind === 'combine') {
    return f.op === 'union' ? 'Join' : f.op === 'subtract' ? 'Cut' : 'Overlap';
  }
  return f.kind === 'sketch' ? 'Sketch'
    : f.kind === 'extrude' ? 'Pull'
    : f.kind === 'revolve' ? 'Spin'
    : f.kind === 'mirror' ? 'Mirror'
    : f.kind === 'pattern' ? 'Repeat'
    : f.kind === 'hole' ? 'Hole'
    : f.kind === 'shell' ? 'Hollow'
    : f.kind === 'move' ? 'Move'
    : f.kind === 'box' ? 'Box'
    : f.kind === 'cylinder' ? 'Cylinder'
    : f.kind === 'cone' ? 'Cone'
    : f.kind === 'torus' ? 'Ring'
    : 'Sphere';
}

/** The numeric suffix nextId() stamped into an id at creation time (`box1` ->
 *  1). Two features of the same kind never share this number while both are
 *  alive, and -- unlike array position -- it does not change when the
 *  feature list is reordered, so it is a stable proxy for "which one was
 *  built first" even after the student drags rows around. */
function creationOrder(id: string): number {
  const digits = /\d+$/.exec(id);
  return digits ? parseInt(digits[0], 10) : 0;
}

/**
 * Display names, counted per kind.
 *
 * Numbering by list position made the first cylinder "Cylinder 2" whenever a
 * box preceded it (fixed by grouping per label), and separately renamed
 * every same-kind feature whenever the list was reordered, because the
 * count was re-derived from current array order on every render. Sorting
 * each label's group by creationOrder(id) before numbering fixes both: the
 * order fed to the counter no longer depends on where the row currently
 * sits, only on when it was built.
 */
export function nameMap(doc: ModelDoc): Record<string, string> {
  const byLabel = new Map<string, Feature[]>();
  for (const f of doc.features) {
    const label = labelOf(f);
    const group = byLabel.get(label);
    if (group) group.push(f);
    else byLabel.set(label, [f]);
  }
  const out: Record<string, string> = {};
  for (const [label, group] of byLabel) {
    const ordered = [...group].sort((a, b) => creationOrder(a.id) - creationOrder(b.id));
    ordered.forEach((f, i) => {
      out[f.id] = f.name ?? `${label} ${i + 1}`;
    });
  }
  return out;
}

export function defaultName(f: Feature, doc: ModelDoc): string {
  return nameMap(doc)[f.id] ?? labelOf(f);
}

/** Features nothing else consumes — what the model actually shows. */
export function topLevel(doc: ModelDoc): Feature[] {
  const consumed = new Set<string>();
  for (const f of doc.features) {
    if (f.kind === 'combine') f.targets.forEach((t) => consumed.add(t));
    if (f.kind === 'extrude') consumed.add(f.target);
    if (f.kind === 'revolve') consumed.add(f.target);
    if (f.kind === 'pattern') consumed.add(f.target);
    if (f.kind === 'hole') consumed.add(f.target);
    if (f.kind === 'shell') consumed.add(f.target);
    if (f.kind === 'move' && !f.copy) consumed.add(f.target);
    // A mirror's target is deliberately never consumed here — see
    // MirrorFeature's doc comment. The source stays visible and the mirrored
    // copy is a second, independent top-level shape.
  }
  // A bare sketch is never returned. It is a flat outline, not a solid, and
  // handing one to the renderer draws nothing -- the outline is drawn as an
  // overlay instead, so an un-extruded sketch is still visible while being
  // honestly absent from the model.
  return doc.features.filter((f) => !consumed.has(f.id) && f.kind !== 'sketch');
}
