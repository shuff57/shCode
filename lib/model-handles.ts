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

import type { Feature } from './model-types';

export interface HandleSpec {
  /** Generated parameter this handle drives, e.g. "box1_width". */
  param: string;
  /** Point on the shape, world space. */
  origin: [number, number, number];
  /** Unit direction the handle slides along, world space. */
  axis: [number, number, number];
  scale: number;
  label: string;
}

export function handlesFor(f: Feature): HandleSpec[] {
  if (f.kind === 'combine') return [];
  const [cx, cy, cz] = f.center;

  if (f.kind === 'box') {
    const [w, d, h] = f.size;
    return [
      { param: `${f.id}_width`, origin: [cx + w / 2, cy, cz], axis: [1, 0, 0], scale: 2, label: 'width' },
      { param: `${f.id}_depth`, origin: [cx, cy + d / 2, cz], axis: [0, 1, 0], scale: 2, label: 'depth' },
      { param: `${f.id}_height`, origin: [cx, cy, cz + h / 2], axis: [0, 0, 1], scale: 2, label: 'height' },
    ];
  }

  if (f.kind === 'cylinder') {
    return [
      { param: `${f.id}_radius`, origin: [cx + f.radius, cy, cz], axis: [1, 0, 0], scale: 1, label: 'radius' },
      { param: `${f.id}_height`, origin: [cx, cy, cz + f.height / 2], axis: [0, 0, 1], scale: 2, label: 'height' },
    ];
  }

  return [
    { param: `${f.id}_radius`, origin: [cx + f.radius, cy, cz], axis: [1, 0, 0], scale: 1, label: 'radius' },
  ];
}
