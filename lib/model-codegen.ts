// ModelDoc -> JSCAD source. One way, always: parsing student JavaScript back
// into features is a research project that fails on the first `for` loop.
//
// Every number the doc holds is emitted as an entry in getParameterDefinitions()
// rather than as a literal inside main(). That is what lets a slider or a drag
// handle change a dimension by posting values into the running frame -- the
// source stays byte-identical while any number moves, so nothing reloads. Only
// adding, deleting or reordering a feature regenerates the file.
//
// The generated file is a legitimate parametric JSCAD script and runs unmodified
// on jscad.app.

import {
  type Feature,
  type ModelDoc,
  type Vec3,
  nameMap,
  topLevel,
} from './model-types';

export interface GeneratedParam {
  name: string;
  caption: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

const AXIS = ['width', 'depth', 'height'] as const;

function num(n: number): string {
  return Number.isFinite(n) ? String(Number(n.toFixed(6))) : '0';
}

/** Param names must survive an edit, or pushing values into a live frame
 *  would land on the wrong slot. Keyed by feature id, never by position. */
function pname(id: string, slot: string): string {
  return `${id}_${slot}`;
}

function sizeBounds(value: number): { min: number; max: number; step: number } {
  return { min: 1, max: Math.max(100, Math.ceil(value * 4)), step: 1 };
}

/** Every numeric slot in the doc, in panel order. */
export function generatedParams(doc: ModelDoc): GeneratedParam[] {
  const out: GeneratedParam[] = [];
  const names = nameMap(doc);
  doc.features.forEach((f) => {
    const label = names[f.id];
    const push = (slot: string, caption: string, value: number, b = sizeBounds(value)) =>
      out.push({ name: pname(f.id, slot), caption: `${label} ${caption}`, value, ...b });

    if (f.kind === 'box') {
      AXIS.forEach((a, ax) => push(a, a, f.size[ax]));
      pushCentre(out, f.id, label, f.center);
      if (f.round !== undefined) push('round', 'corner', f.round, { min: 0, max: 40, step: 0.5 });
    } else if (f.kind === 'cylinder') {
      push('radius', 'radius', f.radius);
      push('height', 'height', f.height);
      pushCentre(out, f.id, label, f.center);
      if (f.round !== undefined) push('round', 'corner', f.round, { min: 0, max: 40, step: 0.5 });
    } else if (f.kind === 'cone') {
      push('radius', 'radius', f.radius);
      push('height', 'height', f.height);
      pushCentre(out, f.id, label, f.center);
    } else if (f.kind === 'torus') {
      push('ring', 'ring', f.ringRadius);
      push('tube', 'tube', f.tubeRadius);
      pushCentre(out, f.id, label, f.center);
    } else if (f.kind === 'sphere') {
      push('radius', 'radius', f.radius);
      pushCentre(out, f.id, label, f.center);
    }
  });
  return out;
}

function pushCentre(out: GeneratedParam[], id: string, label: string, c: Vec3) {
  (['x', 'y', 'z'] as const).forEach((a, i) => {
    out.push({
      name: pname(id, a),
      caption: `${label} ${a}`,
      value: c[i],
      min: -500,
      max: 500,
      step: 1,
    });
  });
}

/** Live values keyed by generated param name — what gets posted to the frame. */
export function paramValues(doc: ModelDoc): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of generatedParams(doc)) out[p.name] = p.value;
  return out;
}

/**
 * Write a value the panel produced back into the doc.
 *
 * The panel talks in generated names (`b1_width`), the doc in fields. Without
 * this the two drift the moment a dimension is typed: the frame would show one
 * model and the generated code would still say another.
 */
export function applyParam(doc: ModelDoc, name: string, value: number): ModelDoc {
  const cut = name.lastIndexOf('_');
  if (cut < 0) return doc;
  const id = name.slice(0, cut);
  const slot = name.slice(cut + 1);
  let changed = false;

  const features = doc.features.map((f) => {
    if (f.id !== id) return f;
    const axis = slot === 'x' ? 0 : slot === 'y' ? 1 : slot === 'z' ? 2 : null;
    if (axis !== null && f.kind !== 'combine') {
      const center: Vec3 = [...f.center];
      center[axis] = value;
      changed = true;
      return { ...f, center };
    }
    if (f.kind === 'box') {
      const ax = AXIS.indexOf(slot as (typeof AXIS)[number]);
      if (ax === 0 || ax === 1 || ax === 2) {
        const size: Vec3 = [...f.size];
        size[ax] = value;
        changed = true;
        return { ...f, size };
      }
      if (slot === 'round') { changed = true; return { ...f, round: value }; }
    }
    if (f.kind === 'cylinder') {
      if (slot === 'radius') { changed = true; return { ...f, radius: value }; }
      if (slot === 'height') { changed = true; return { ...f, height: value }; }
      if (slot === 'round') { changed = true; return { ...f, round: value }; }
    }
    if (f.kind === 'cone') {
      if (slot === 'radius') { changed = true; return { ...f, radius: value }; }
      if (slot === 'height') { changed = true; return { ...f, height: value }; }
    }
    if (f.kind === 'torus') {
      if (slot === 'ring') { changed = true; return { ...f, ringRadius: value }; }
      if (slot === 'tube') { changed = true; return { ...f, tubeRadius: value }; }
    }
    if (f.kind === 'sphere' && slot === 'radius') {
      changed = true;
      return { ...f, radius: value };
    }
    return f;
  });

  return changed ? { ...doc, features } : doc;
}

function centreExpr(id: string): string {
  return `[p.${pname(id, 'x')}, p.${pname(id, 'y')}, p.${pname(id, 'z')}]`;
}

/** The expression that builds one feature, and which helpers it needs. */
function featureExpr(f: Feature, needs: Set<string>): string {
  const c = f.kind === 'combine' ? '' : centreExpr(f.id);

  if (f.kind === 'box') {
    const size = `[p.${pname(f.id, 'width')}, p.${pname(f.id, 'depth')}, p.${pname(f.id, 'height')}]`;
    if (!f.round) return `primitives.cuboid({ size: ${size}, center: ${c} })`;
    if (f.roundStyle === 'chamfer') {
      needs.add('chamferBox');
      return `chamferBox(${size}, ${c}, p.${pname(f.id, 'round')})`;
    }
    return `primitives.roundedCuboid({ size: ${size}, center: ${c}, roundRadius: p.${pname(f.id, 'round')} })`;
  }

  if (f.kind === 'cylinder') {
    const r = `p.${pname(f.id, 'radius')}`;
    const h = `p.${pname(f.id, 'height')}`;
    if (!f.round) return `primitives.cylinder({ radius: ${r}, height: ${h}, center: ${c} })`;
    if (f.roundStyle === 'chamfer') {
      needs.add('chamferCylinder');
      return `chamferCylinder(${r}, ${h}, ${c}, p.${pname(f.id, 'round')})`;
    }
    return `primitives.roundedCylinder({ radius: ${r}, height: ${h}, center: ${c}, roundRadius: p.${pname(f.id, 'round')} })`;
  }

  if (f.kind === 'cone') {
    // JSCAD has no cone(): a cylinder whose far end has zero radius is one.
    return `primitives.cylinderElliptic({ startRadius: [p.${pname(f.id, 'radius')}, p.${pname(f.id, 'radius')}], `
      + `endRadius: [0, 0], height: p.${pname(f.id, 'height')}, center: ${c} })`;
  }

  if (f.kind === 'torus') {
    // JSCAD takes inner/outer, the doc holds ring-centre and tube thickness --
    // which is what a student can actually picture. torus() also takes no
    // center, so it has to be moved afterwards or its position parameters would
    // be declared and never read, and the move handles would do nothing.
    needs.add('transforms');
    return `transforms.translate(${c}, primitives.torus({ innerRadius: p.${pname(f.id, 'tube')}, `
      + `outerRadius: p.${pname(f.id, 'ring')} }))`;
  }

  if (f.kind === 'sphere') {
    return `primitives.sphere({ radius: p.${pname(f.id, 'radius')}, center: ${c} })`;
  }

  const args = f.targets.join(', ');
  return `booleans.${f.op}(${args})`;
}

// JSCAD has roundedCuboid and roundedCylinder but no chamfer of any kind on a
// solid: expandGeom3 hard-throws on anything but corners:'round'. Both of these
// are exact, and both are one hull.
const HELPERS: Record<string, string> = {
  chamferBox: `// A box with all twelve edges sliced off flat.
//
// Each intersect clips the four edges running along one axis: a square turned
// 45 degrees is the region |a| + |b| <= k, and k = a/2 + b/2 - c is exactly the
// line through the two points a chamfer of leg c leaves behind.
//
// The obvious hull-of-three-inset-boxes trick does NOT work: each of those
// boxes is full size on two axes, so it reaches every edge and only the eight
// corners get cut. On a 40x40x20 box that removes 0.27% of the volume and looks
// almost right, which is worse than looking wrong.
function chamferBox(size, center, c) {
  const [x, y, z] = size
  const d = Math.SQRT2
  const long = (x + y + z) * 2
  const kx = y / 2 + z / 2 - c
  const ky = x / 2 + z / 2 - c
  const kz = x / 2 + y / 2 - c
  let s = primitives.cuboid({ size, center })
  s = booleans.intersect(s, transforms.translate(center,
    transforms.rotateX(Math.PI / 4, primitives.cuboid({ size: [long, kx * d, kx * d] }))))
  s = booleans.intersect(s, transforms.translate(center,
    transforms.rotateY(Math.PI / 4, primitives.cuboid({ size: [ky * d, long, ky * d] }))))
  s = booleans.intersect(s, transforms.translate(center,
    transforms.rotateZ(Math.PI / 4, primitives.cuboid({ size: [kz * d, kz * d, long] }))))
  return s
}`,
  chamferCylinder: `// A cylinder with both rims sliced off: the hull of a short full-width one
// and a tall narrow one.
function chamferCylinder(radius, height, center, c) {
  return hulls.hull(
    primitives.cylinder({ radius, height: height - 2 * c, center }),
    primitives.cylinder({ radius: radius - c, height, center })
  )
}`,
};

export function toJscad(doc: ModelDoc): string {
  const params = generatedParams(doc);
  const needs = new Set<string>();

  const lines: string[] = [];
  for (const f of doc.features) {
    lines.push(`  const ${f.id} = ${featureExpr(f, needs)}`);
  }

  const shown = topLevel(doc).map((f) => f.id);
  const result =
    shown.length === 0 ? null : shown.length === 1 ? shown[0] : `booleans.union(${shown.join(', ')})`;

  const modules = ['primitives', 'booleans'];
  if (needs.has('chamferCylinder')) modules.push('hulls');
  if (needs.has('chamferBox') || needs.has('transforms')) modules.push('transforms');

  const defs = params
    .map(
      (p) =>
        `    { name: '${p.name}', type: 'float', initial: ${num(p.value)}, ` +
        `min: ${num(p.min)}, max: ${num(p.max)}, step: ${num(p.step)}, caption: '${p.caption.replace(/'/g, "\\'")}' },`
    )
    .join('\n');

  const helpers = [...needs].map((n) => HELPERS[n]).join('\n\n');

  const out = [
    '// Built with the shape tools. Every dimension is a parameter below, so the',
    '// panel can change any number without touching a line of this file.',
    '',
    `const { ${modules.join(', ')} } = require('@jscad/modeling')`,
    '',
    'function getParameterDefinitions() {',
    '  return [',
    defs,
    '  ]',
    '}',
    '',
    helpers,
    helpers ? '' : null,
    'function main(p) {',
    lines.join('\n') || '  // Nothing here yet — add a shape.',
    result ? `  return ${result}` : '  return primitives.cuboid({ size: [1, 1, 1] })',
    '}',
    '',
    'module.exports = { main, getParameterDefinitions }',
  ]
    .filter((l) => l !== null && l !== undefined)
    .join('\n');

  // Blank-line bookkeeping is not worth branching over; collapse once at the end.
  return out.replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '') + '\n';
}
