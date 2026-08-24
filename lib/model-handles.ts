// Where a shape's drag handles sit, in world space.
//
// No picking, no ray-casting, no gizmo meshes. We authored the primitive, so
// its faces are arithmetic: a box centred at c with size s has its +X face at
// c + [s.x/2, 0, 0]. The runner projects these points through the camera it
// already owns and hands back screen coordinates; nothing hit-tests a mesh.
//
// `scale` is how much the dimension moves per unit the handle moves. A centred
// box grows both ways at once, so its face only keeps up with the pointer if
// the width changes by twice the drag.

import { isShape, type Feature } from './model-types';

export type HandleKind = 'size' | 'move' | 'turn' | 'point';

export interface HandleSpec {
  kind: HandleKind;
  /** Generated parameter this handle drives, e.g. "box1_width". */
  param: string;
  /** Point on the shape, world space. */
  origin: [number, number, number];
  /** Unit direction the handle slides along, world space. */
  axis: [number, number, number];
  /** Second direction, for handles that move in a plane rather than a line. */
  axisV?: [number, number, number];
  /** Parameter the second direction drives. */
  paramV?: string;
  scale: number;
  label: string;
}

const AXES: Array<{ n: 'x' | 'y' | 'z'; v: [number, number, number] }> = [
  { n: 'x', v: [1, 0, 0] },
  { n: 'y', v: [0, 1, 0] },
  { n: 'z', v: [0, 0, 1] },
];

// Arrows for position, offset off the centre so they do not pile up on each
// other or sit under a size handle. WebCAD puts translate arrows on a gizmo at
// the origin of the shape; same idea, minus the rings we cannot honour yet.
function moveHandles(id: string, centre: [number, number, number], reach: number): HandleSpec[] {
  return AXES.map(({ n, v }) => ({
    kind: 'move' as const,
    param: `${id}_${n}`,
    origin: [centre[0] + v[0] * reach, centre[1] + v[1] * reach, centre[2] + v[2] * reach],
    axis: v,
    scale: 1,
    label: `move ${n}`,
  }));
}

// One handle per axis, sitting out on the circle it would sweep and sliding
// along the tangent there. Not a ring like WebCAD's gizmo -- a ring needs an
// arc projected into screen space, where a tangent is the same projection the
// other handles already use. Degrees per world unit is 180/(PI*r), so a handle
// further out turns the shape more slowly, which is what a real ring does too.
function turnHandles(id: string, centre: [number, number, number], reach: number): HandleSpec[] {
  const r = Math.max(reach, 1);
  const perAxis: Array<[('rx' | 'ry' | 'rz'), [number, number, number], [number, number, number]]> = [
    ['rx', [0, r, 0], [0, 0, 1]],
    ['ry', [0, 0, r], [1, 0, 0]],
    ['rz', [r, 0, 0], [0, 1, 0]],
  ];
  return perAxis.map(([slot, off, tangent]) => ({
    kind: 'turn' as const,
    param: `${id}_${slot}`,
    origin: [centre[0] + off[0], centre[1] + off[1], centre[2] + off[2]],
    axis: tangent,
    scale: 180 / (Math.PI * r),
    label: `turn ${slot[1]}`,
  }));
}

// Sketch corners move in two directions at once, which is the one thing the
// single-axis handles cannot express. Each corner therefore carries a second
// axis, and the drag decomposes the pointer onto both.
const PLANE_AXES: Record<string, { u: [number, number, number]; v: [number, number, number] }> = {
  xy: { u: [1, 0, 0], v: [0, 1, 0] },
  xz: { u: [1, 0, 0], v: [0, 0, 1] },
  yz: { u: [0, 1, 0], v: [0, 0, 1] },
};

export function planeAxes(plane: string) {
  return PLANE_AXES[plane] ?? PLANE_AXES.xy;
}

function sketchHandles(f: Extract<Feature, { kind: 'sketch' }>): HandleSpec[] {
  const { u, v } = planeAxes(f.plane);
  const n: [number, number, number] =
    f.plane === 'xy' ? [0, 0, 1] : f.plane === 'xz' ? [0, 1, 0] : [1, 0, 0];
  return f.points.map(([pu, pv], i) => ({
    kind: 'point' as const,
    param: `${f.id}_p${i}u`,
    paramV: `${f.id}_p${i}v`,
    origin: [
      u[0] * pu + v[0] * pv + n[0] * f.offset,
      u[1] * pu + v[1] * pv + n[1] * f.offset,
      u[2] * pu + v[2] * pv + n[2] * f.offset,
    ],
    axis: u,
    axisV: v,
    scale: 1,
    label: `corner ${i + 1}`,
  }));
}

export function handlesFor(f: Feature): HandleSpec[] {
  // A sketch gets its own two-axis corner handles; see sketchHandles.
  if (f.kind === 'sketch') return sketchHandles(f);
  if (!isShape(f)) return [];
  const [cx, cy, cz] = f.center;
  const size: HandleSpec[] = [];
  let reach: number;

  if (f.kind === 'box') {
    const [w, d, h] = f.size;
    reach = Math.max(w, d, h) * 0.75;
    size.push(
      { kind: 'size', param: `${f.id}_width`, origin: [cx + w / 2, cy, cz], axis: [1, 0, 0], scale: 2, label: 'width' },
      { kind: 'size', param: `${f.id}_depth`, origin: [cx, cy + d / 2, cz], axis: [0, 1, 0], scale: 2, label: 'depth' },
      { kind: 'size', param: `${f.id}_height`, origin: [cx, cy, cz + h / 2], axis: [0, 0, 1], scale: 2, label: 'height' },
    );
  } else if (f.kind === 'cylinder') {
    reach = Math.max(f.radius * 2, f.height) * 0.75;
    size.push(
      { kind: 'size', param: `${f.id}_radius`, origin: [cx + f.radius, cy, cz], axis: [1, 0, 0], scale: 1, label: 'radius' },
      { kind: 'size', param: `${f.id}_height`, origin: [cx, cy, cz + f.height / 2], axis: [0, 0, 1], scale: 2, label: 'height' },
    );
  } else if (f.kind === 'cone') {
    reach = Math.max(f.radius * 2, f.height) * 0.75;
    size.push(
      { kind: 'size', param: `${f.id}_radius`, origin: [cx + f.radius, cy, cz - f.height / 2], axis: [1, 0, 0], scale: 1, label: 'radius' },
      { kind: 'size', param: `${f.id}_height`, origin: [cx, cy, cz + f.height / 2], axis: [0, 0, 1], scale: 2, label: 'height' },
    );
  } else if (f.kind === 'torus') {
    reach = (f.ringRadius + f.tubeRadius) * 1.4;
    size.push(
      { kind: 'size', param: `${f.id}_ring`, origin: [cx + f.ringRadius, cy, cz], axis: [1, 0, 0], scale: 1, label: 'ring' },
      { kind: 'size', param: `${f.id}_tube`, origin: [cx + f.ringRadius, cy, cz + f.tubeRadius], axis: [0, 0, 1], scale: 1, label: 'tube' },
    );
  } else {
    reach = f.radius * 1.5;
    size.push(
      { kind: 'size', param: `${f.id}_radius`, origin: [cx + f.radius, cy, cz], axis: [1, 0, 0], scale: 1, label: 'radius' },
    );
  }

  const turn = f.kind !== 'sphere' && f.rotate
    ? turnHandles(f.id, f.center, reach * 1.25)
    : [];
  return [...size, ...moveHandles(f.id, f.center, reach), ...turn];
}
