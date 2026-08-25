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
import { maxFilletRadius, outlineOf } from './sketch-arc';
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
      // One slider per corner the student rounded. Emitted from `rounds`, the
      // request -- so the radius is a live parameter the frame can be handed
      // without regenerating the source, exactly like every other dimension.
      // Before this the radius existed only baked into a bulge literal, which
      // is why nothing anywhere in the app could show a student what it was.
      for (const [key, want] of Object.entries(f.rounds ?? {})) {
        const k = Number(key);
        if (!Number.isInteger(k) || k < 0 || k >= f.points.length || !(want > 0)) continue;
        const ceiling = maxFilletRadius(f.points, k, f.bulges);
        out.push({
          name: pname(f.id, `r${k}`),
          caption: `${label} corner ${k + 1} round`,
          value: want,
          min: 0,
          // The ceiling can sit BELOW what is currently stored (another round
          // on the shared edge, or a corner the solver has since sharpened).
          // Clamping the slider's max below its own value would snap the
          // radius down the first time the panel rendered, silently -- which
          // is the shape of bug this whole round exists to stop.
          max: Math.max(ceiling, want),
          step: 0.5,
        });
      }
      push('offset', 'offset', f.offset, { min: -500, max: 500, step: 1 });
    } else if (f.kind === 'extrude') {
      push('height', 'height', f.height);
    } else if (f.kind === 'revolve') {
      push('angle', 'angle', f.angle, { min: 1, max: 360, step: 1 });
    } else if (f.kind === 'pattern') {
      push('count', 'count', f.count, { min: 1, max: 24, step: 1 });
      if (f.mode === 'circular') {
        push('totalangle', 'angle', f.totalAngle ?? 360, { min: 1, max: 360, step: 1 });
      } else {
        const step = f.step ?? [0, 0, 0];
        push('stepx', 'step x', step[0], { min: -500, max: 500, step: 1 });
        push('stepy', 'step y', step[1], { min: -500, max: 500, step: 1 });
        push('stepz', 'step z', step[2], { min: -500, max: 500, step: 1 });
      }
    } else if (f.kind === 'hole') {
      push('diameter', 'diameter', f.diameter);
      push('depth', 'depth', f.depth);
      pushCentre(out, f.id, label, f.center);
      // Same across/up vocabulary the sketch corners use -- the two axes the
      // drill does not point along, named the way this file already names them.
      if (f.corners) {
        push('dx', 'corner spacing across', f.corners.dx, { min: 0.5, max: 250, step: 0.5 });
        push('dy', 'corner spacing up', f.corners.dy, { min: 0.5, max: 250, step: 0.5 });
      }
    } else if (f.kind === 'shell') {
      push('thickness', 'wall', f.thickness, { min: 0.5, max: 40, step: 0.5 });
    } else if (f.kind === 'move') {
      pushCentre(out, f.id, label, f.offset);
    }
    // mirror carries no numeric slot -- its only input is a plane choice.
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
      // r<n>: the radius asked for on DESIGN corner n. Writes the request,
      // never geometry -- outlineOf() turns it into trim points and a bulge
      // wherever the outline is needed, so a drag on this handle cannot leave
      // a stale arc endpoint behind for another mover to find.
      const r = /^r(\d+)$/.exec(slot);
      if (r) {
        const k = Number(r[1]);
        if (k >= 0 && k < f.points.length) {
          const rounds = { ...(f.rounds ?? {}) };
          // Dragged to nothing is un-rounded, not rounded-by-zero: a zero left
          // in the map would keep emitting a dead slider and a dead handle.
          if (value > 0) rounds[k] = value;
          else delete rounds[k];
          changed = true;
          return { ...f, rounds };
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
    if (f.kind === 'revolve' && slot === 'angle') {
      changed = true;
      return { ...f, angle: value };
    }
    if (f.kind === 'pattern') {
      if (slot === 'count') { changed = true; return { ...f, count: Math.max(1, Math.round(value)) }; }
      if (slot === 'totalangle') { changed = true; return { ...f, totalAngle: value }; }
      const stepAx = slot === 'stepx' ? 0 : slot === 'stepy' ? 1 : slot === 'stepz' ? 2 : null;
      if (stepAx !== null) {
        const step: Vec3 = f.step ? [...f.step] : [0, 0, 0];
        step[stepAx] = value;
        changed = true;
        return { ...f, step };
      }
    }
    if (f.kind === 'hole') {
      if (slot === 'diameter') { changed = true; return { ...f, diameter: value }; }
      if (slot === 'depth') { changed = true; return { ...f, depth: value }; }
      const holeAx = slot === 'x' ? 0 : slot === 'y' ? 1 : slot === 'z' ? 2 : null;
      if (holeAx !== null) {
        const center: Vec3 = [...f.center];
        center[holeAx] = value;
        changed = true;
        return { ...f, center };
      }
      if (f.corners && (slot === 'dx' || slot === 'dy')) {
        changed = true;
        return { ...f, corners: { ...f.corners, [slot]: value } };
      }
    }
    if (f.kind === 'shell' && slot === 'thickness') {
      changed = true;
      return { ...f, thickness: value };
    }
    if (f.kind === 'move') {
      const moveAx = slot === 'x' ? 0 : slot === 'y' ? 1 : slot === 'z' ? 2 : null;
      if (moveAx !== null) {
        const offset: Vec3 = [...f.offset];
        offset[moveAx] = value;
        changed = true;
        return { ...f, offset };
      }
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
    // The solver is happy to satisfy a rule by collapsing an edge to nothing:
    // one Up toggle on a horizontal edge of a fresh rectangle drives both its
    // corners to the same point, residual 0, over-constrained false, no
    // message -- and Pull then extrudes the degenerate outline into a solid
    // (M3). residual cannot catch it, because the collapse is what SATISFIES
    // the rule. So the gate is geometric: if the solved design is no longer a
    // shape, keep the one that was.
    //
    // Refusing here rather than at the toggle is deliberate -- solveDoc runs
    // on EVERY doc adoption, so a load, an undo and a drag are covered by the
    // same line. The toggle says so out loud (ModelEditor.setConstraints);
    // this is the belt under that belt, and stays silent.
    if (!outlineOf({ ...f, points }).ok) return f;
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
    // A circle is TAGGED, not inferred -- circleOf() in sketch-arc.ts is the
    // only other place that reads f.shape, and this is where the tag turns
    // into geometry. Two points is a diameter here, never "the outline";
    // poly() on two points would draw a degenerate line, not a circle.
    if (f.shape === 'circle' && f.points.length === 2) {
      needs.add('discAcross');
      const a = `[p.${pname(f.id, 'p0u')}, p.${pname(f.id, 'p0v')}]`;
      const b = `[p.${pname(f.id, 'p1u')}, p.${pname(f.id, 'p1v')}]`;
      return `discAcross(${a}, ${b})`;
    }
    const pts = f.points
      .map((_, n) => `[p.${pname(f.id, `p${n}u`)}, p.${pname(f.id, `p${n}v`)}]`)
      .join(', ');
    const legacyBulges = Object.entries(f.bulges ?? {}).filter(([, v]) => v);
    const legacyLiteral = '{' + legacyBulges.map(([k, v]) => `${k}: ${num(v)}`).join(', ') + '}';

    // A rounded sketch emits its DESIGN corners as parameters and its radii as
    // parameters, and lets roundPoly() derive the trim points at build time.
    //
    // The alternative -- deriving them here and emitting the trim points as
    // literals -- was the trap: the corner parameters would then be referenced
    // by nothing, so dragging a corner would post a value the running frame
    // ignores, and the shape would freeze mid-drag and only catch up when the
    // doc was regenerated on release. Same reason every other dimension in
    // this file is a parameter rather than a number.
    const roundEntries = Object.entries(f.rounds ?? {}).filter(
      ([k, v]) => v > 0 && Number.isInteger(Number(k))
        && Number(k) >= 0 && Number(k) < f.points.length
    );
    if (roundEntries.length > 0) {
      needs.add('roundPoly');
      needs.add('polyArc');
      const rounds = '{'
        + roundEntries.map(([k]) => `${k}: p.${pname(f.id, `r${k}`)}`).join(', ')
        + '}';
      // The third argument carries any LEGACY arc the doc already had, keyed
      // by design edge. Dropping it would silently flatten an imported curve
      // the moment a student rounded some unrelated corner of the same sketch.
      return `roundPoly([${pts}], ${rounds}, ${legacyLiteral})`;
    }

    // Bulges with no rounds are a legacy or imported outline: somebody else
    // built those arcs, so they stay literal and pass straight through. There
    // is no radius to hand a drag handle here -- the doc never recorded one.
    const bulgeEntries = legacyBulges;
    if (bulgeEntries.length > 0) {
      needs.add('polyArc');
      return `polyArc([${pts}], ${legacyLiteral})`;
    }
    // Byte-identical to every doc saved before shape/bulges existed -- see
    // check-sketch-compat.mjs, which pins exactly this.
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

  if (f.kind === 'revolve') {
    // revolve() (shCAD) refuses an `angle` option by name -- see REAL_EXTRAS
    // in simple.js -- and hands the student the real call instead. Build mode
    // exposes that exact angle as a dial, so it has to be the real call too:
    // extrudeRotate sweeps the profile around the world Z axis, taking the
    // profile's own x as the radius, same as revolve(profile) would for the
    // full-circle case.
    needs.add('extrusions');
    return `extrusions.extrudeRotate({ angle: p.${pname(f.id, 'angle')} * Math.PI / 180 }, ${f.target})`;
  }

  if (f.kind === 'mirror') {
    // Real transforms.mirror, not a shCAD name -- see the header banner:
    // mirror is already short and reads as English, so shCAD ships it bare.
    //
    // The plane goes through the TARGET'S OWN bounding box, never bare world
    // zero -- see mirrorThroughFace(). A shape built at the origin (a
    // primitive centred there, or a sketch starting at its own corner, which
    // is the common case) already has a face sitting at zero, so this picks
    // that exact face and nothing changes. A shape the Move tool relocated no
    // longer has any face near zero, so the plane moves with it instead of
    // mirroring the part into empty space where it used to be.
    needs.add('transforms');
    needs.add('mirrorThroughFace');
    const normal = f.plane === 'xy' ? '[0, 0, 1]' : f.plane === 'xz' ? '[0, 1, 0]' : '[1, 0, 0]';
    const axis = f.plane === 'xy' ? 2 : f.plane === 'xz' ? 1 : 0;
    return `mirrorThroughFace(${f.target}, ${normal}, ${axis})`;
  }

  if (f.kind === 'hole') {
    // Sugar over tube (shCAD's cylinder) + subtract, folded into one line so
    // the feature list shows one row rather than a tool body plus a cut.
    needs.add('transforms');
    const r = `p.${pname(f.id, 'diameter')} / 2`;
    const depth = `p.${pname(f.id, 'depth')}`;
    const bore = `tube(${r}, ${depth})`;
    // tube() extrudes along Z; boring along x or y means tilting the bit 90
    // degrees before it is moved into place.
    const tilted = f.axis === 'x' ? `transforms.rotateY(Math.PI / 2, ${bore})`
      : f.axis === 'y' ? `transforms.rotateX(Math.PI / 2, ${bore})`
      : bore;
    // center/corners are entered as an offset from the TARGET's own middle,
    // never an absolute world position -- see centerOn() below, same
    // reasoning mirrorThroughFace() already applies to a plane. newHole()'s
    // default of [0, 0, 0] means "no offset," so an un-touched hole still
    // lands dead center on whatever the target's own bounding box says,
    // wherever Move has since put it -- not at world zero.
    needs.add('centerOn');
    needs.add('centerOf');
    if (f.corners) {
      // Four bores subtracted from the SAME target in one call -- real
      // booleans.subtract takes every shape to remove at once. Patterning a
      // hole the way Repeat patterns a shape would instead duplicate the
      // whole target and union the copies, which is the wrong operation
      // entirely: it multiplies the plate, not the bore. This keeps the
      // plate singular and only repeats the cut, so the four corners are
      // pulled from the same two numbers instead of four separate positions.
      const cx = `p.${pname(f.id, 'x')}`;
      const cy = `p.${pname(f.id, 'y')}`;
      const cz = `p.${pname(f.id, 'z')}`;
      const dx = `p.${pname(f.id, 'dx')}`;
      const dy = `p.${pname(f.id, 'dy')}`;
      needs.add('cornerBores');
      return `booleans.subtract(${f.target}, `
        + `cornerBores(${f.target}, [${cx}, ${cy}, ${cz}], ${dx}, ${dy}, ${tilted}))`;
    }
    return `booleans.subtract(${f.target}, `
      + `transforms.translate(centerOn(${f.target}, ${centreExpr(f.id)}), ${tilted}))`;
  }

  if (f.kind === 'shell') {
    needs.add('shellOp');
    needs.add('transforms');
    return `shellOp(${f.target}, p.${pname(f.id, 'thickness')})`;
  }

  if (f.kind === 'move') {
    needs.add('transforms');
    return `transforms.translate(${centreExpr(f.id)}, ${f.target})`;
  }

  if (f.kind === 'pattern') {
    // toJscad() special-cases pattern features through patternLines() before
    // ever calling featureExpr() -- a pattern's statement is a `for` loop,
    // not a single expression. Reaching this means that guard was skipped.
    throw new Error('pattern features are emitted by patternLines(), not featureExpr()');
  }

  const args = f.targets.join(', ');
  return `booleans.${f.op}(${args})`;
}

/**
 * A pattern is a for-loop -- literally, in the emitted source, not hidden
 * behind a helper call. That is the highest-value teaching moment on the
 * whole toolbar, so it is the one feature whose statement is not
 * `const id = <expr>`: it is several lines, ending in that assignment.
 *
 * A pattern targeting a hole is a special case -- see holePatternLines()
 * below -- because a HoleFeature's value is "the block with the hole cut
 * into it," not "the hole." Feeding that through the engine here would
 * translate-and-union COPIES OF THE WHOLE BLOCK.
 */
function patternLines(
  f: Extract<Feature, { kind: 'pattern' }>,
  needs: Set<string>,
  byId: Map<string, Feature>
): string[] {
  needs.add('transforms');
  const target = byId.get(f.target);
  if (target && target.kind === 'hole') return holePatternLines(f, target, needs);

  const parts = `${f.id}_parts`;
  const count = `p.${pname(f.id, 'count')}`;
  const lines: string[] = [];
  lines.push(`  const ${parts} = []`);
  if (f.mode === 'circular') {
    // Repeat Around orbits the WORLD axis, not the target's own middle.
    //
    // This was briefly changed to pivot on centerOf(target), by analogy with
    // mirrorThroughFace(). The analogy is wrong and the result was a silent
    // no-op: a cylinder spun about its own centre produces N copies of itself
    // in the same place, and the union of those is one cylinder. Scattering
    // into a ring is not the bug -- it is what a circular pattern IS, and it
    // is how a student draws a bolt circle. holePatternLines() below had it
    // right all along: pivot on the plate, orbit the bore.
    //
    // The real footgun is the other one: a shape sitting ON the axis has
    // nothing to orbit, so every copy lands on top of the original. That is
    // refused up front in ModelEditor's repeat(), where the centre is known.
  }
  lines.push(`  for (let i = 0; i < ${count}; i++) {`);
  if (f.mode === 'circular') {
    const angle = `p.${pname(f.id, 'totalangle')} / ${count} * i * Math.PI / 180`;
    const spin = f.axis === 'x' ? '[a, 0, 0]' : f.axis === 'y' ? '[0, a, 0]' : '[0, 0, a]';
    lines.push(`    const a = ${angle}`);
    lines.push(`    ${parts}.push(transforms.rotate(${spin}, ${f.target}))`);
  } else {
    lines.push(`    const x = p.${pname(f.id, 'stepx')} * i`);
    lines.push(`    const y = p.${pname(f.id, 'stepy')} * i`);
    lines.push(`    const z = p.${pname(f.id, 'stepz')} * i`);
    lines.push(`    ${parts}.push(transforms.translate([x, y, z], ${f.target}))`);
  }
  lines.push('  }');
  lines.push(`  const ${f.id} = booleans.union(${parts})`);
  return lines;
}

/**
 * Repeating a hole must repeat the BORE, not the block it was cut from.
 * Verified live: select a single 6mm bore in a 40x40x20 box and click
 * Repeat, and the feature list reads "Hole 1 x 3" while the old engine
 * (above) translated and unioned three copies of hole1's own value -- which
 * is the WHOLE block with one hole in it, per HoleFeature's doc comment. The
 * copies overlap enough that each one's hole gets filled back in by its
 * neighbour's solid material, so the 3D view shows the box tripled into a
 * solid bar with no holes surviving at all.
 *
 * The fix builds every bore instance -- one per pattern step, times one per
 * corner if this is a Four Corners hole -- and subtracts them ALL from the
 * hole's own target in a single call. Same move the `corners` branch of
 * featureExpr() already makes for four bores at once, generalized to N.
 */
function holePatternLines(
  f: Extract<Feature, { kind: 'pattern' }>,
  h: Extract<Feature, { kind: 'hole' }>,
  needs: Set<string>
): string[] {
  const parts = `${f.id}_bores`;
  const count = `p.${pname(f.id, 'count')}`;
  const r = `p.${pname(h.id, 'diameter')} / 2`;
  const depth = `p.${pname(h.id, 'depth')}`;
  const bore = `tube(${r}, ${depth})`;
  const tilted = h.axis === 'x' ? `transforms.rotateY(Math.PI / 2, ${bore})`
    : h.axis === 'y' ? `transforms.rotateX(Math.PI / 2, ${bore})`
    : bore;
  const cx = `p.${pname(h.id, 'x')}`;
  const cy = `p.${pname(h.id, 'y')}`;
  const cz = `p.${pname(h.id, 'z')}`;

  // The hole's stored x/y/z is an offset from the PLATE's own middle (see
  // centerOn() below), not an absolute position -- computed once, since
  // h.target does not move between copies.
  needs.add('centerOn');
  needs.add('centerOf');
  const center = `${f.id}_center`;
  const lines: string[] = [];
  lines.push(`  const ${center} = centerOn(${h.target}, [${cx}, ${cy}, ${cz}])`);

  // One base position per bore this hole already cuts -- one for a plain
  // hole, four for a Four Corners hole (mirrors featureExpr's `corners`
  // branch). Each gets offset or orbited by the pattern below in turn.
  type Coord = { x: string; y: string; z: string };
  const bases: Coord[] = h.corners
    ? (() => {
        const dx = `p.${pname(h.id, 'dx')}`;
        const dy = `p.${pname(h.id, 'dy')}`;
        const at = (sx: '-' | '+', sy: '-' | '+'): Coord =>
          ({ x: `${center}[0] ${sx} ${dx}`, y: `${center}[1] ${sy} ${dy}`, z: `${center}[2]` });
        return [at('-', '-'), at('+', '-'), at('-', '+'), at('+', '+')];
      })()
    : [{ x: `${center}[0]`, y: `${center}[1]`, z: `${center}[2]` }];

  lines.push(`  const ${parts} = []`);
  if (f.mode === 'circular') {
    // Orbit around the PLATE's own middle (centerOf(h.target)), not around
    // the hole's own (possibly off-centre) position -- computed once,
    // outside the loop, since h.target does not move between copies.
    // Ambiguous on paper -- "spin around the target" could mean either
    // point -- but a bolt circle is drilled off-axis on purpose and spun
    // around the part's own axis to ring the holes; pivoting on the hole's
    // own point would just spin an off-axis dot around itself and go
    // nowhere. This is the reading a student clicking "Repeat Around" on a
    // single corner hole expects.
    needs.add('rotateAbout');
    lines.push(`  const ${f.id}_pivot = centerOf(${h.target})`);
  }
  lines.push(`  for (let i = 0; i < ${count}; i++) {`);
  if (f.mode === 'circular') {
    const angle = `p.${pname(f.id, 'totalangle')} / ${count} * i * Math.PI / 180`;
    const spin = f.axis === 'x' ? '[a, 0, 0]' : f.axis === 'y' ? '[0, a, 0]' : '[0, 0, a]';
    lines.push(`    const a = ${angle}`);
    bases.forEach((base) => {
      lines.push(
        `    ${parts}.push(rotateAbout(${f.id}_pivot, ${spin}, `
          + `transforms.translate([${base.x}, ${base.y}, ${base.z}], ${tilted})))`
      );
    });
  } else {
    lines.push(`    const x = p.${pname(f.id, 'stepx')} * i`);
    lines.push(`    const y = p.${pname(f.id, 'stepy')} * i`);
    lines.push(`    const z = p.${pname(f.id, 'stepz')} * i`);
    bases.forEach((base) => {
      lines.push(
        `    ${parts}.push(transforms.translate([${base.x} + x, ${base.y} + y, ${base.z} + z], ${tilted}))`
      );
    });
  }
  lines.push('  }');
  lines.push(`  const ${f.id} = booleans.subtract(${h.target}, ${parts})`);
  return lines;
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
// The three rotates below turn a coordinate frame, not a shape: each prism is
// built at the origin and tilted about it to become a 45-degree cutter. turn()
// pivots about a shape's own middle and would put every cutter somewhere else.
// "turn for shapes, rotate for frames" -- this is the frames case.
function chamferBox(size, center, c) {
  const [x, y, z] = size
  const d = Math.SQRT2
  const long = (x + y + z) * 2
  const kx = y / 2 + z / 2 - c
  const ky = x / 2 + z / 2 - c
  const kz = x / 2 + y / 2 - c
  let s = box(x, y, z, { center })
  s = booleans.intersect(s, transforms.translate(center,
    transforms.rotateX(Math.PI / 4, box(long, kx * d, kx * d))))
  s = booleans.intersect(s, transforms.translate(center,
    transforms.rotateY(Math.PI / 4, box(ky * d, long, ky * d))))
  s = booleans.intersect(s, transforms.translate(center,
    transforms.rotateZ(Math.PI / 4, box(kz * d, kz * d, long))))
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
    tube(radius, height - 2 * c, { center }),
    tube(radius - c, height, { center })
  )
}`,
  shellOp: `// A hollow copy of a solid, approximated: scale a copy of the body inward
// around its own bounding-box centre, and subtract it. This is NOT a true
// shell -- a true shell offsets every FACE inward by the same distance, so
// the wall reads as exactly "thickness" everywhere. Scaling shrinks a
// bounding box by the same FRACTION on every axis instead, so a long thin
// part gets a thin wall on its long axis and a thick one on its short axis,
// and a curved body (a ball, a tube) is not uniformly thin at all. The
// vendored JSCAD bundle has no boolean offset, which is the only operation
// that would do this honestly.
function shellOp(shape, thickness) {
  const box = measurements.measureBoundingBox(shape)
  const size = [box[1][0] - box[0][0], box[1][1] - box[0][1], box[1][2] - box[0][2]]
  const mid = [(box[0][0] + box[1][0]) / 2, (box[0][1] + box[1][1]) / 2, (box[0][2] + box[1][2]) / 2]
  const factor = size.map((s) => Math.max(0, (s - 2 * thickness) / s))
  const inner = transforms.translate(mid, transforms.scale(factor,
    transforms.translate([-mid[0], -mid[1], -mid[2]], shape)))
  return booleans.subtract(shape, inner)
}`,
  mirrorThroughFace: `// Mirror through a face of the part itself, not empty space at world
// zero. JSCAD solids have no picker for "this face" -- the closest honest
// stand-in is the part's own bounding box, so the plane passes through
// whichever of its two faces on this axis sits nearer to zero. A shape
// built at the origin -- a primitive centred there, or a sketch that starts
// at its own corner, the common case -- already has a face AT zero, so this
// picks that exact same face and nothing changes. A shape the Move tool
// relocated no longer has a face anywhere near zero, so the plane moves
// with it: the mirrored copy lands touching the part, not reflected through
// a point the part has since left behind.
function mirrorThroughFace(shape, normal, axis) {
  const box = measurements.measureBoundingBox(shape)
  const near = Math.abs(box[0][axis]) <= Math.abs(box[1][axis]) ? box[0][axis] : box[1][axis]
  const origin = [0, 0, 0]
  origin[axis] = near
  return transforms.mirror({ normal, origin }, shape)
}`,
  centerOf: `// The middle of a shape's own bounding box -- the same "ask the target
// where it is" move mirrorThroughFace() makes for a face, generalized to a
// point. Every feature below that needs to know where its target sits
// (a hole with no offset entered, a circular pattern's pivot) goes through
// here rather than assuming world zero.
function centerOf(shape) {
  const box = measurements.measureBoundingBox(shape)
  return [(box[0][0] + box[1][0]) / 2, (box[0][1] + box[1][1]) / 2, (box[0][2] + box[1][2]) / 2]
}`,
  centerOn: `// A hole with no offset entered should land on the TARGET's own middle,
// not on world zero -- see centerOf(). The Dimensions panel's x/y/z is
// added on top, so dragging it still works exactly as before; it is now a
// nudge away from center instead of an absolute world position.
function centerOn(shape, offset) {
  const c = centerOf(shape)
  return [c[0] + offset[0], c[1] + offset[1], c[2] + offset[2]]
}`,
  cornerBores: `// Four bores measured from ONE target-relative center -- see centerOn()
// -- rather than four separate absolute positions.
function cornerBores(shape, offset, dx, dy, bit) {
  const c = centerOn(shape, offset)
  return [
    transforms.translate([c[0] - dx, c[1] - dy, c[2]], bit),
    transforms.translate([c[0] + dx, c[1] - dy, c[2]], bit),
    transforms.translate([c[0] - dx, c[1] + dy, c[2]], bit),
    transforms.translate([c[0] + dx, c[1] + dy, c[2]], bit),
  ]
}`,
  rotateAbout: `// Spin around a given pivot point rather than world zero -- the rotation
// counterpart to mirrorThroughFace()'s plane. transforms.rotate always
// turns around the origin, so this moves the pivot there first, rotates,
// and moves it back.
function rotateAbout(pivot, spin, shape) {
  const back = [-pivot[0], -pivot[1], -pivot[2]]
  return transforms.translate(pivot, transforms.rotate(spin, transforms.translate(back, shape)))
}`,
  discAcross: `// A circle drawn as its two ends: the corners are a diameter, not a line
// -- see SketchFeature.shape. The tag is the only source of truth for "is
// this a circle," so this never has to guess from the point count.
function discAcross(a, b) {
  return disc(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2,
              { center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] })
}`,
  polyArc: `// A closed outline whose edges can bend. bulges[i], if present and
// nonzero, curves the edge LEAVING corner i into an arc instead of a
// straight line -- 0 or a missing key is a straight edge, same as poly().
// bulge is tan(includedAngle / 4), the same convention lib/sketch-arc.ts
// uses to build the corner's trim points in the first place.
function polyArc(corners, bulges) {
  const out = []
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % corners.length]
    out.push(a)
    const g = bulges[i]
    if (!g) continue
    const dx = b[0] - a[0], dy = b[1] - a[1]
    const d = Math.hypot(dx, dy)
    const r = d * (1 + g * g) / (4 * Math.abs(g))
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2
    const ux = dx / d, uy = dy / d
    const px = -uy, py = ux
    const h = Math.sqrt(Math.max(0, r * r - (d / 2) * (d / 2)))
    // Past a half turn (|bulge| > 1) the centre is on the OTHER side of the
    // chord -- a major arc's centre sits behind its own chord. Without the
    // flip, bulge 2 on a 10-unit chord builds a 106-degree arc where 253.7
    // was asked for, sagitta 2.5 instead of 20. See arcFromBulge() in
    // lib/sketch-arc.ts, which carried the identical error.
    const sign = (g >= 0 ? 1 : -1) * (Math.abs(g) > 1 ? -1 : 1)
    const cx = mx + px * h * sign, cy = my + py * h * sign
    const a0 = Math.atan2(a[1] - cy, a[0] - cx)
    const a1 = Math.atan2(b[1] - cy, b[0] - cx)
    let sweep = a1 - a0
    if (g > 0 && sweep < 0) sweep += Math.PI * 2
    if (g < 0 && sweep > 0) sweep -= Math.PI * 2
    const n = Math.max(8, Math.ceil(Math.abs(sweep) / (7.5 * Math.PI / 180)))
    for (let s = 1; s < n; s++) {
      const t = a0 + sweep * (s / n)
      out.push([cx + r * Math.cos(t), cy + r * Math.sin(t)])
    }
  }
  return geometries.geom2.fromPoints(out)
}`,
  roundPoly: `// A closed outline whose corners can be rounded. The first argument is the
// DESIGN corners -- the points the student placed -- and rounds[k] is the
// radius asked for on corner k. The two trim points and the arc between them
// are DERIVED here, every build, and stored nowhere.
//
// That split is the point. A trim point that lives in the corner list is
// indistinguishable from a corner somebody drew, so every tool that moves a
// corner moves it too -- while the bulge beside it, which is a factor of its
// own chord and not a radius, stays put. Same factor, shorter chord, smaller
// radius, broken tangency, no error. Deriving instead means there is nothing
// left behind to move.
//
// The third argument carries any arc the doc already had (an imported
// outline), keyed by design edge. A corner next to one is left sharp,
// because this construction reads both adjacent edges as straight chords.
function roundPoly(corners, rounds, bulges) {
  let pts = corners.map(function (p) { return [p[0], p[1]] })
  let curves = Object.assign({}, bulges || {})
  // Descending, and that is load-bearing: rounding corner k splices one extra
  // point in at k, so every index above it shifts. Working downwards means
  // each corner is still at its own index when its turn comes.
  const asked = Object.keys(rounds).map(Number)
    .filter(function (k) { return rounds[k] > 0 })
    .sort(function (a, b) { return b - a })
  for (let i = 0; i < asked.length; i++) {
    const k = asked[i]
    const n = pts.length
    const prev = (k - 1 + n) % n
    if (curves[prev] || curves[k]) continue
    const P = pts[prev], C = pts[k], N = pts[(k + 1) % n]
    const vIn = [P[0] - C[0], P[1] - C[1]]
    const vOut = [N[0] - C[0], N[1] - C[1]]
    const lenIn = Math.hypot(vIn[0], vIn[1])
    const lenOut = Math.hypot(vOut[0], vOut[1])
    if (lenIn === 0 || lenOut === 0) continue
    const cosI = (vIn[0] * vOut[0] + vIn[1] * vOut[1]) / (lenIn * lenOut)
    const interior = Math.acos(Math.max(-1, Math.min(1, cosI)))
    if (Math.PI - interior < 1e-6) continue
    const half = Math.tan(interior / 2)
    // Clamped to what the corner can actually take -- trim grows much faster
    // than radius as a corner sharpens, and an unclamped trim runs past the
    // far corner and self-crosses the outline.
    const r = Math.min(rounds[k], (Math.min(lenIn, lenOut) / 2) * half)
    if (!(r > 0)) continue
    const trim = r / half
    if (!(trim > 1e-9 * Math.min(lenIn, lenOut))) continue
    const cross = (C[0] - P[0]) * (N[1] - C[1]) - (C[1] - P[1]) * (N[0] - C[0])
    const g = (cross >= 0 ? 1 : -1) * Math.tan((Math.PI - interior) / 4)
    const shifted = {}
    const keys = Object.keys(curves)
    for (let j = 0; j < keys.length; j++) {
      const e = Number(keys[j])
      shifted[e > k - 1 ? e + 1 : e] = curves[keys[j]]
    }
    shifted[k] = g
    curves = shifted
    pts = pts.slice(0, k).concat([
      [C[0] + (vIn[0] / lenIn) * trim, C[1] + (vIn[1] / lenIn) * trim],
      [C[0] + (vOut[0] / lenOut) * trim, C[1] + (vOut[1] / lenOut) * trim],
    ], pts.slice(k + 1))
  }
  return polyArc(pts, curves)
}`,
};

export function toJscad(doc: ModelDoc): string {
  const params = generatedParams(doc);
  const needs = new Set<string>();

  const byId = new Map(doc.features.map((f) => [f.id, f]));
  const lines: string[] = [];
  for (const f of doc.features) {
    if (f.kind === 'pattern') {
      lines.push(...patternLines(f, needs, byId));
      continue;
    }
    lines.push(`  const ${f.id} = ${featureExpr(f, needs, byId)}`);
  }

  const shown = topLevel(doc).map((f) => f.id);
  const result =
    shown.length === 0 ? null : shown.length === 1 ? shown[0] : `booleans.union(${shown.join(', ')})`;

  const modules = ['primitives', 'booleans'];
  if (needs.has('chamferCylinder')) modules.push('hulls');
  if (needs.has('extrudeOnPlane')) modules.push('extrusions', 'transforms');
  if (
    (needs.has('shellOp') || needs.has('mirrorThroughFace') || needs.has('centerOf'))
    && !modules.includes('measurements')
  ) {
    modules.push('measurements');
  }
  if ((needs.has('chamferBox') || needs.has('transforms')) && !modules.includes('transforms')) {
    modules.push('transforms');
  }
  if (needs.has('extrusions') && !modules.includes('extrusions')) modules.push('extrusions');
  // polyArc closes its sampled points into a geom2 by hand -- discAcross needs
  // no raw jscad import at all, it only calls the shCAD global disc().
  if (needs.has('polyArc') && !modules.includes('geometries')) modules.push('geometries');

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
