// The canonical form of a mouse-built model. JSCAD source is a one-way
// projection of this, the way Mermaid is a projection of a DiagramDoc — the
// student never hand-writes the JSON, and the generated code is never parsed
// back. Stored in lesson_drafts like a diagram, so there is no new table.
//
// An ordered feature list IS a program: each row is a statement, each number a
// value, and subtract(a, b) is not subtract(b, a). That is the whole reason the
// visual mode belongs in a CS course rather than beside one.

export type Vec3 = [number, number, number];

/** How a shape's edges are killed. JSCAD has no fillet(); see model-codegen. */
export type RoundStyle = 'fillet' | 'chamfer';

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

export type Feature =
  | BoxFeature | CylinderFeature | SphereFeature
  | ConeFeature | TorusFeature
  | SketchFeature | ExtrudeFeature | CombineFeature;

/** Anything that consumes an earlier feature rather than standing alone. */
export function isDerived(f: Feature): f is CombineFeature | ExtrudeFeature {
  return f.kind === 'combine' || f.kind === 'extrude';
}

export interface ModelDoc {
  version: 1;
  features: Feature[];
}

export const EMPTY_DOC: ModelDoc = { version: 1, features: [] };

/** A positioned primitive: has a centre, and can carry handles. */
export function isShape(
  f: Feature
): f is Exclude<Feature, CombineFeature | SketchFeature | ExtrudeFeature> {
  return f.kind !== 'combine' && f.kind !== 'sketch' && f.kind !== 'extrude';
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
    return 'Rounding works on a shape, not on a combination. Round the box before you cut the hole.';
  }
  if (f.kind === 'sketch' || f.kind === 'extrude') {
    return 'Rounding works on a shape. Round the corners of the sketch instead.';
  }
  if (f.kind === 'sphere' || f.kind === 'torus') {
    return 'That shape has no edges to round — it is curved all the way round.';
  }
  if (f.kind === 'cone') {
    return 'Rounding a cone is not supported yet.';
  }
  return null;
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

export function newExtrude(doc: ModelDoc, target: string): ExtrudeFeature {
  return { id: nextId(doc, 'pull'), kind: 'extrude', target, height: 12 };
}

/** Insert a corner halfway along the edge after `index`, which is where a
 *  student expects a new one to land when they ask for it. */
export function addCorner(f: SketchFeature, index: number): SketchFeature {
  const a = f.points[index];
  const b = f.points[(index + 1) % f.points.length];
  const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const points = [...f.points];
  points.splice(index + 1, 0, mid);
  return { ...f, points };
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
    : f.kind === 'box' ? 'Box'
    : f.kind === 'cylinder' ? 'Cylinder'
    : f.kind === 'cone' ? 'Cone'
    : f.kind === 'torus' ? 'Ring'
    : 'Sphere';
}

/**
 * Display names, counted per kind.
 *
 * Numbering by list position makes the first cylinder "Cylinder 2" whenever a
 * box precedes it, which reads as a second cylinder that does not exist.
 */
export function nameMap(doc: ModelDoc): Record<string, string> {
  const seen: Record<string, number> = {};
  const out: Record<string, string> = {};
  for (const f of doc.features) {
    const label = labelOf(f);
    seen[label] = (seen[label] ?? 0) + 1;
    out[f.id] = f.name ?? `${label} ${seen[label]}`;
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
  }
  // A bare sketch is never returned. It is a flat outline, not a solid, and
  // handing one to the renderer draws nothing -- the outline is drawn as an
  // overlay instead, so an un-extruded sketch is still visible while being
  // honestly absent from the model.
  return doc.features.filter((f) => !consumed.has(f.id) && f.kind !== 'sketch');
}
