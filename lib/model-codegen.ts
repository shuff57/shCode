// ModelDoc -> JSCAD source. One way, always: parsing student JavaScript back
// into features is a research project that fails on the first `for` loop.
//
// Every number the doc holds is emitted as an entry in getParameterDefinitions()
// rather than as a literal inside main(). That is what lets a slider or a drag
// handle change a dimension by posting values into the running frame -- the
// source stays byte-identical while any number moves, so nothing reloads. Only
// adding, deleting or reordering a feature regenerates the file.
//
// It emits shCAD spellings -- box, tube, ball, extrude, turn -- which are
// globals installed by public/jscad/simple.js, so a student reads the same names
// the lessons teach rather than a second dialect alongside them.
//
// THE COST, stated because it used to be a selling point: the generated file no
// longer runs unmodified on jscad.app. Those names exist only in our runner.
// Every shape it emits now has a shCAD spelling. Booleans and translate stay
// JSCAD deliberately -- they are already short and array-first and have no
// shCAD twin by design -- and `ring` takes no options, so a positioned ring is
// a translate around one rather than an argument to it.

import { solveSketch, type Point } from './sketch-solve';
import {
  type Feature,
  type ModelDoc,
  type Vec3,
  canRotate,
  isShape,
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
      pushTurn(out, f.id, label, f.rotate);
    } else if (f.kind === 'cylinder') {
      push('radius', 'radius', f.radius);
      push('height', 'height', f.height);
      pushCentre(out, f.id, label, f.center);
      if (f.round !== undefined) push('round', 'corner', f.round, { min: 0, max: 40, step: 0.5 });
      pushTurn(out, f.id, label, f.rotate);
    } else if (f.kind === 'cone') {
      push('radius', 'radius', f.radius);
      push('height', 'height', f.height);
      pushCentre(out, f.id, label, f.center);
      pushTurn(out, f.id, label, f.rotate);
    } else if (f.kind === 'torus') {
      push('ring', 'ring', f.ringRadius);
      push('tube', 'tube', f.tubeRadius);
      pushCentre(out, f.id, label, f.center);
    } else if (f.kind === 'sphere') {
      push('radius', 'radius', f.radius);
      pushCentre(out, f.id, label, f.center);
    } else if (f.kind === 'sketch') {
      // Two per corner. A sketch with a dozen corners is a long panel, which is
      // why the corners are dragged rather than typed most of the time.
      f.points.forEach(([u, v], n) => {
        out.push({ name: pname(f.id, `p${n}u`), caption: `${label} corner ${n + 1} across`, value: u, min: -500, max: 500, step: 1 });
        out.push({ name: pname(f.id, `p${n}v`), caption: `${label} corner ${n + 1} up`, value: v, min: -500, max: 500, step: 1 });
      });
      push('offset', 'offset', f.offset, { min: -500, max: 500, step: 1 });
    } else if (f.kind === 'extrude') {
      push('height', 'height', f.height);
    }
  });
  return out;
}

// Only when the shape has actually been given a rotation, so an unrotated model
// does not carry three dead angle rows per shape.
function pushTurn(out: GeneratedParam[], id: string, label: string, r?: Vec3) {
  if (!r) return;
  (['rx', 'ry', 'rz'] as const).forEach((a, i) => {
    out.push({
      name: pname(id, a),
      caption: `${label} turn ${a[1]}`,
      value: r[i],
      min: -180,
      max: 180,
      step: 5,
    });
  });
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
    const turn = slot === 'rx' ? 0 : slot === 'ry' ? 1 : slot === 'rz' ? 2 : null;
    // A sphere has no rotate field, which is the type system saying the same
    // thing canRotate() does: turning it would change nothing to look at.
    if (turn !== null && canRotate(f) && f.rotate) {
      const rotate: Vec3 = [f.rotate[0], f.rotate[1], f.rotate[2]];
      rotate[turn] = value;
      changed = true;
      return { ...f, rotate };
    }
    const axis = slot === 'x' ? 0 : slot === 'y' ? 1 : slot === 'z' ? 2 : null;
    if (axis !== null && isShape(f)) {
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
    if (f.kind === 'sketch') {
      // slot is p<n>u or p<n>v
      const m = /^p(\d+)([uv])$/.exec(slot);
      if (m) {
        const n = Number(m[1]);
        if (n >= 0 && n < f.points.length) {
          const points = f.points.map((pt, i) =>
            i === n
              ? (m[2] === 'u' ? [value, pt[1]] : [pt[0], value]) as [number, number]
              : pt
          );
          changed = true;
          return { ...f, points };
        }
      }
      if (slot === 'offset') { changed = true; return { ...f, offset: value }; }
    }
    if (f.kind === 'extrude' && slot === 'height') {
      changed = true;
      return { ...f, height: value };
    }
    if (f.kind === 'sphere' && slot === 'radius') {
      changed = true;
      return { ...f, radius: value };
    }
    return f;
  });

  return changed ? { ...doc, features } : doc;
}

/**
 * Make every constrained sketch in a doc obey its own rules.
 *
 * Applied wherever a doc is adopted, so "the points satisfy the constraints as
 * far as they can" is an invariant of the doc rather than something each caller
 * has to remember. Solving at the call site instead meant a caller holding a
 * stale copy could solve the wrong points and write the result back -- which is
 * exactly how a typed corner value went missing the moment a rule was applied.
 */
export function solveDoc(doc: ModelDoc): ModelDoc {
  let changed = false;
  const features = doc.features.map((f) => {
    if (f.kind !== 'sketch' || !f.constraints || f.constraints.length === 0) return f;
    const solved = solveSketch(f.points.map((p) => [p[0], p[1]]), f.constraints);
    if (solved.residual === 0 && solved.iterations === 0) return f;
    const points = solved.points.map((p) => [p[0], p[1]] as [number, number]);
    if (points.every((p, i) => p[0] === f.points[i][0] && p[1] === f.points[i][1])) return f;
    changed = true;
    return { ...f, points };
  });
  return changed ? { ...doc, features } : doc;
}

/**
 * Run a corner change past the sketch's constraints.
 *
 * Returns every corner parameter the solver ended up moving, not just the one
 * that was dragged — a constrained edge moves its far end too, and the frame
 * has to be told about both or the model and the outline disagree.
 *
 * The dragged corners are pinned, so the solver moves everything else to meet
 * them. Without that the pointer fights the constraint and the corner crawls.
 */
export function solveSketchDrag(
  doc: ModelDoc,
  changed: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = { ...changed };

  for (const f of doc.features) {
    if (f.kind !== 'sketch' || !f.constraints || f.constraints.length === 0) continue;

    const pinned: number[] = [];
    const pts: Point[] = f.points.map((p) => [p[0], p[1]]);
    let touched = false;

    for (const [name, value] of Object.entries(changed)) {
      if (!name.startsWith(`${f.id}_p`)) continue;
      const m = /^p(\d+)([uv])$/.exec(name.slice(f.id.length + 1));
      if (!m) continue;
      const n = Number(m[1]);
      if (n < 0 || n >= pts.length) continue;
      pts[n][m[2] === 'u' ? 0 : 1] = value;
      pinned.push(n);
      touched = true;
    }
    if (!touched) continue;

    const solved = solveSketch(pts, f.constraints, pinned);
    solved.points.forEach((p, n) => {
      if (Math.abs(p[0] - f.points[n][0]) > 1e-9) out[pname(f.id, `p${n}u`)] = p[0];
      if (Math.abs(p[1] - f.points[n][1]) > 1e-9) out[pname(f.id, `p${n}v`)] = p[1];
    });
  }

  return out;
}

function centreExpr(id: string): string {
  return `[p.${pname(id, 'x')}, p.${pname(id, 'y')}, p.${pname(id, 'z')}]`;
}

/** The expression that builds one feature, and which helpers it needs. */
function featureExpr(f: Feature, needs: Set<string>, byId: Map<string, Feature>): string {
  // shCAD's turn() measures the shape's own middle, brings it to the origin,
  // rotates, and puts it back -- so it commutes with translate and the shape is
  // simply built where it belongs. Measured on a 40x20x10 box moved to x=50 and
  // turned 90: turn lands on [[40,-20,-5],[60,20,5]], identical to the
  // build-at-origin-then-translate order this used to emit, and NOT on the
  // [[-10,30,-5],[10,70,5]] that raw rotate-after-translate gives.
  //
  // The scaffolding that ordering required was never wrong -- it is newly
  // redundant, because turn now does that work inside itself.
  const turned = canRotate(f) && f.rotate !== undefined;
  const c = !isShape(f) ? '' : centreExpr(f.id);

  const place = (expr: string) => {
    if (!turned) return expr;
    // Degrees, and turn takes all three axes as an array.
    const d = (a: string) => `p.${pname(f.id, a)}`;
    return `turn([${d('rx')}, ${d('ry')}, ${d('rz')}], ${expr})`;
  };

  if (f.kind === 'box') {
    const size = `[p.${pname(f.id, 'width')}, p.${pname(f.id, 'depth')}, p.${pname(f.id, 'height')}]`;
    // shCAD takes plain numbers; the { size: [...] } spelling belongs to cuboid
    // and box() throws on it deliberately, so there is one way to write each.
    const dims = `p.${pname(f.id, 'width')}, p.${pname(f.id, 'depth')}, p.${pname(f.id, 'height')}`;
    if (!f.round) return place(`box(${dims}, { center: ${c} })`);
    if (f.roundStyle === 'chamfer') {
      needs.add('chamferBox');
      return place(`chamferBox(${size}, ${c}, p.${pname(f.id, 'round')})`);
    }
    return place(`box(${dims}, { center: ${c}, roundRadius: p.${pname(f.id, 'round')} })`);
  }

  if (f.kind === 'cylinder') {
    const r = `p.${pname(f.id, 'radius')}`;
    const h = `p.${pname(f.id, 'height')}`;
    if (!f.round) return place(`tube(${r}, ${h}, { center: ${c} })`);
    if (f.roundStyle === 'chamfer') {
      needs.add('chamferCylinder');
      return place(`chamferCylinder(${r}, ${h}, ${c}, p.${pname(f.id, 'round')})`);
    }
    return place(`tube(${r}, ${h}, { center: ${c}, roundRadius: p.${pname(f.id, 'round')} })`);
  }

  if (f.kind === 'cone') {
    // JSCAD has no cone(): a cylinder whose far end has zero radius is one.
    return place(`cone(p.${pname(f.id, 'radius')}, p.${pname(f.id, 'height')}, { center: ${c} })`);
  }

  if (f.kind === 'torus') {
    // JSCAD takes inner/outer, the doc holds ring-centre and tube thickness --
    // which is what a student can actually picture. torus() also takes no
    // center, so it has to be moved afterwards or its position parameters would
    // be declared and never read, and the move handles would do nothing.
    needs.add('transforms');
    // ring() refuses an options object, and rightly: torus accepts `center` and
    // silently drops it. So the position has to be a translate around the ring,
    // not an argument to it.
    const donut = `ring(p.${pname(f.id, 'ring')}, p.${pname(f.id, 'tube')})`;
    return turned ? place(`transforms.translate(${c}, ${donut})`)
                  : `transforms.translate(${c}, ${donut})`;
  }

  if (f.kind === 'sphere') {
    return place(`ball(p.${pname(f.id, 'radius')}, { center: ${c} })`);
  }

  if (f.kind === 'sketch') {
    const pts = f.points
      .map((_, n) => `[p.${pname(f.id, `p${n}u`)}, p.${pname(f.id, `p${n}v`)}]`)
      .join(', ');
    return `poly([${pts}])`;
  }

  if (f.kind === 'extrude') {
    // extrudeLinear always pulls along +Z from the XY plane, so a sketch on
    // another plane is built flat and the SOLID is turned afterwards. Turning
    // the flat outline first is not an option -- a geom2 has no third axis to
    // turn into.
    const sketch = byId.get(f.target);
    const plane = sketch && sketch.kind === 'sketch' ? sketch.plane : 'xy';
    needs.add('extrudeOnPlane');
    return `extrudeOnPlane(${f.target}, p.${pname(f.id, 'height')}, `
      + `'${plane}', p.${pname(f.target, 'offset')})`;
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
  extrudeOnPlane: `// Pull a flat outline into a solid, on one of the three planes.
//
// extrudeLinear only ever pulls along +Z from XY, so a sketch meant for another
// plane is extruded flat first and the SOLID turned afterwards. Turning the
// outline first is not possible -- a geom2 has no third axis to turn into.
function extrudeOnPlane(sketch, height, plane, offset) {
  const solid = extrude(height, sketch)
  if (plane === 'xz') return transforms.translate([0, offset, 0], transforms.rotateX(Math.PI / 2, solid))
  if (plane === 'yz') return transforms.translate([offset, 0, 0], transforms.rotateY(-Math.PI / 2, solid))
  return transforms.translate([0, 0, offset], solid)
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

  const byId = new Map(doc.features.map((f) => [f.id, f]));
  const lines: string[] = [];
  for (const f of doc.features) {
    lines.push(`  const ${f.id} = ${featureExpr(f, needs, byId)}`);
  }

  const shown = topLevel(doc).map((f) => f.id);
  const result =
    shown.length === 0 ? null : shown.length === 1 ? shown[0] : `booleans.union(${shown.join(', ')})`;

  const modules = ['primitives', 'booleans'];
  if (needs.has('chamferCylinder')) modules.push('hulls');
  if (needs.has('extrudeOnPlane')) modules.push('extrusions', 'transforms');
  if ((needs.has('chamferBox') || needs.has('transforms')) && !modules.includes('transforms')) {
    modules.push('transforms');
  }

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
    result ? `  return ${result}` : '  return box(1, 1, 1)',
    '}',
    '',
    'module.exports = { main, getParameterDefinitions }',
  ]
    .filter((l) => l !== null && l !== undefined)
    .join('\n');

  // Blank-line bookkeeping is not worth branching over; collapse once at the end.
  return out.replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '') + '\n';
}
