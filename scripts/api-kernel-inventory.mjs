// Which of the taught reSHape API a B-rep kernel could still serve.
//
// Piece 2 of the core replacement is the question "what happens to the
// scripting half when the kernel changes", and it is not a matter of taste:
// public/reshape/docs/reference.md is the taught surface, scripts/
// test-reshape.mjs runs 227 of its examples, and every name below is something
// a student has been told works. So this counts them rather than arguing.
//
//   node scripts/api-kernel-inventory.mjs
//
// The classification is by hand and it is a judgement, but a checkable one --
// each bucket says WHY, and a wrong call shows up as a name in the wrong list
// rather than as a vague worry. Re-run it after the reference changes; the
// count is read out of reference.md, so a new API name appears as UNCLASSIFIED
// rather than being silently missed.

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ref = readFileSync(path.join(root, 'public/reshape/docs/reference.md'), 'utf8');
const documented = [...new Set(
  [...ref.matchAll(/^\| `([a-zA-Z0-9_.]+)/gm)].map((m) => m[1]),
)].filter((n) => /^[a-z]/.test(n) || /^[A-Z]{2,}$/.test(n));

const BUCKETS = [
  {
    id: 'kernel-native',
    why: 'a B-rep kernel does these directly, and several of them BETTER -- a fillet on a solid is a real surface there rather than a mesh approximation',
    names: [
      'cube', 'cuboid', 'cylinder', 'cylinderElliptic', 'sphere', 'ellipsoid', 'torus',
      'roundedCuboid', 'roundedCylinder', 'roundedRectangle',
      'extrudeLinear', 'extrudeRotate', 'extrudeRectangular', 'extrudeHelical',
      'union', 'subtract', 'intersect',
      'translate', 'translateX', 'rotate', 'rotateX', 'rotateZ', 'scale', 'scaleX',
      'mirror', 'mirrorX', 'transform', 'align', 'center', 'centerX', 'sit', 'turn', 'snap',
      'offset', 'expand',
    ],
  },
  {
    id: 'twod',
    why: 'flat shapes and paths. A B-rep kernel calls them wires and faces rather than geom2, so these map, but every one of them is a rewrite rather than a rename',
    names: [
      'circle', 'ellipse', 'rectangle', 'square', 'polygon', 'star', 'triangle',
      'line', 'arc', 'path2.fromPoints', 'text', 'vectorText', 'vectorChar', 'project',
    ],
  },
  {
    id: 'measurement',
    why: 'OCCT computes all of these from the exact geometry rather than from a mesh, so they map and get more accurate',
    names: [
      'measureVolume', 'measureArea', 'measureBoundingBox', 'measureBoundingSphere',
      'measureCenter', 'measureCenterOfMass', 'measureDimensions',
      'measureAggregateArea', 'measureAggregateBoundingBox', 'measureAggregateVolume',
      'size',
    ],
  },
  {
    id: 'mesh-only',
    why: 'THE PROBLEM. These are operations on triangles and point clouds, and a B-rep kernel has no equivalent -- not a harder version, none. Each one needs a decision: reimplement on top, replace with a different idea, or withdraw from the course',
    names: [
      'hull', 'hullChain', 'hullPoints2', 'hullPoints3',
      'polyhedron', 'geodesicSphere', 'extrudeFromSlices',
      'retessellate', 'scission', 'generalize', 'flatten',
      'measureEpsilon', 'measureAggregateEpsilon',
    ],
  },
  {
    id: 'kernel-free',
    why: 'colour, parameters and plain arithmetic. Nothing here touches geometry, so a kernel swap cannot reach them',
    names: [
      'colorize', 'color', 'colorNameToRgb', 'hexToRgb', 'rgbToHex',
      'hslToRgb', 'rgbToHsl', 'hsvToRgb', 'rgbToHsv', 'hueToColorComponent',
      'checkbox', 'choice', 'slider', 'float', 'int', 'number', 'group', 'main',
      'TAU', 'insertSorted', 'fnNumberSort', 'type', 'areAllShapesTheSameType',
      'radiusToSegments', 'middleOf',
    ],
  },
];

const seen = new Map();
for (const b of BUCKETS) for (const n of b.names) seen.set(n, b.id);

const counts = Object.fromEntries(BUCKETS.map((b) => [b.id, 0]));
const unclassified = [];
for (const name of documented) {
  const b = seen.get(name);
  if (b) counts[b]++;
  else unclassified.push(name);
}

console.log('taught API names in reference.md: ' + documented.length);
console.log('');
for (const b of BUCKETS) {
  console.log(String(counts[b.id]).padStart(3) + '  ' + b.id);
  console.log('     ' + b.why);
}
if (unclassified.length) {
  console.log('');
  console.log(String(unclassified.length).padStart(3) + '  UNCLASSIFIED -- new since this inventory was written, decide where they go');
  console.log('     ' + unclassified.join(', '));
}

const blocked = BUCKETS.find((b) => b.id === 'mesh-only');
console.log('');
console.log('The load-bearing finding: ' + counts['mesh-only'] + ' names have NO B-rep equivalent.');
console.log('Of those, hull/hullChain are not merely documented -- the toolbar depends on them.');
console.log('chamferCylinder() in the generated code IS a hull of two cylinders, so Bevel');
console.log('stops working the day the kernel changes unless something replaces it first.');
console.log('');
console.log('names: ' + blocked.names.filter((n) => documented.includes(n)).join(', '));
