// ---------------------------------------------------------------------------
// jscad-portable.mjs — turn an shCAD program into a program that runs on
// https://jscad.app/.
//
// WHY THIS EXISTS
// curriculum-plan.md names jscad.app as the Q3–Q4 environment ("no install
// required"). shCAD is additive, so the real API is all still there — nothing
// was renamed and nothing was wrapped. What is missing is the direction of
// travel: a file written in shCode does not run on jscad.app, and until now the
// only answer was "retype it, one name at a time, off the graduation table".
//
// A shCAD program fails there for TWO independent reasons, and a converter that
// fixes only the first still does not run:
//
//   1. shCAD names.        box(40, 20, 10)  ->  primitives.cuboid({ size: [40, 20, 10] })
//   2. the runner's shim.  translate(...)   ->  transforms.translate(...)
//
// The second one is easy to forget because it is invisible in shCode: the shim
// in runner.html installs 124 bare names, so `translate` and `subtract` and
// `measureVolume` all just work. On jscad.app they do not exist. EQUIVALENTS'
// own revolve row is the proof that both halves are needed in one line —
// revolve(translate([10, 0, 0], rect(4, 10))) is an shCAD name wrapped around a
// bare real one. Convert only the shCAD half and jscad.app says
// "translate is not defined".
//
// So the output is: a derived `require` header, the converted body, a
// `module.exports` if the file had none, and — only when the program turns
// something — one small local helper (see turn, below).
//
// WHERE THE RULES COME FROM, AND WHY THEY CANNOT DRIFT
// scripts/jscad-simple-checks.mjs already holds EQUIVALENTS: pairs of arrow
// functions, one shCAD and one real, asserted every run to build IDENTICAL
// geometry. That table is the corpus this converter is proved against, and the
// bridge between "functions" and "text" is Function.prototype.toString():
//
//   e.shcad.toString()  ->  "(w) => w.box(20, 20, 20, { roundRadius: 3, segments: 16 })"
//   e.real.toString()   ->  "(j) => j.primitives.roundedCuboid({ size: [20, 20, 20], roundRadius: 3, segments: 16 })"
//
// Strip the arrow head and the `w.` / `j.` prefixes and both halves are exactly
// the text the converter must read and must write — the real halves are already
// written module-qualified, which IS the portable spelling. There is no second
// table of strings anywhere, so there is nothing to drift. Four checks come off
// each row (text, geometry, negative control, header), and three interlocks
// mean a new shCAD name cannot land without a rule and a rule cannot land
// without a proof. See the PORTABLE group in scripts/test-jscad.mjs.
//
// The rules are DECLARED rather than inferred. Anti-unification over the corpus
// — diff the two halves, generalise the literals into slots — works on the box
// row and is under-determined everywhere else: box(20, 20, 20, …) has three
// identical 20s and one to three examples cannot tell a slot from a
// coincidence, sit's `grouped: false` appears in the real half with nothing in
// the shCAD half to unify against, and revolve's profile is a whole nested
// subexpression. Inference that generalises wrong generalises SILENTLY, which
// is the failure class this codebase writes banners about.
//
// NO PARSER, NO DEPENDENCY, AND REFUSAL RATHER THAN CLEVERNESS
// The rewrite is a hand-rolled scan that skips strings, comments, member
// access and property-key positions. Anything it cannot classify — a name the
// file also declares for itself, a shorthand property, an options object that
// is an identifier rather than a literal — is REPORTED with a line number and
// left alone, never guessed at. `refusals` is part of the return value, not an
// exception.
//
// WHAT IT DOES NOT DO. It converts ONE FILE. getParameterDefinitions is carried
// through untouched (it is real JSCAD already), but multi-file projects, the
// moSHion side, and jscad.app's own folder-based project layout are outside it.
// There is no un-converter and there should not be one: if a student edits the
// portable form and wants their shCAD back, they have graduated.
// ---------------------------------------------------------------------------

/**
 * Bare name -> where it really lives, for the 124 names runner.html's shim
 * installs. PINNED DATA, and the only thing in this file that is not derived
 * from EQUIVALENTS — the browser has no bundle loaded, so it cannot be computed
 * at run time. The gate regenerates it from the vendored
 * public/jscad/lib/jscad-modeling.min.js plus the shim cut live out of
 * runner.html and diffs it against this copy, so a bundle upgrade that moves a
 * name goes red with the name in the message.
 *
 * If that check is ever red: REGENERATE THIS MAP from the vendored bundle. Do
 * not hand-edit one entry and do not trim the check.
 *
 * Two entries are the documented collisions, and both are the reason this is a
 * map rather than a `${module}.${name}` guess: bare `utils` and bare
 * `minkowski` are the TOP-LEVEL modules of those names, not maths.utils and
 * booleans.minkowski. `degToRad` follows the top-level one — measured,
 * maths.utils.degToRad is undefined and throws — and the turn helper below
 * depends on getting that right.
 */
export const MODULE_OF = {
  align: 'transforms.align', arc: 'primitives.arc',
  areAllShapesTheSameType: 'utils.areAllShapesTheSameType', bezier: 'curves.bezier',
  booleans: 'booleans', center: 'transforms.center', centerX: 'transforms.centerX',
  centerY: 'transforms.centerY', centerZ: 'transforms.centerZ', circle: 'primitives.circle',
  colorNameToRgb: 'colors.colorNameToRgb', colorize: 'colors.colorize', colors: 'colors',
  constants: 'maths.constants', cssColors: 'colors.cssColors', cube: 'primitives.cube',
  cuboid: 'primitives.cuboid', curves: 'curves', cylinder: 'primitives.cylinder',
  cylinderElliptic: 'primitives.cylinderElliptic', degToRad: 'utils.degToRad',
  ellipse: 'primitives.ellipse', ellipsoid: 'primitives.ellipsoid',
  expand: 'expansions.expand', expansions: 'expansions',
  extrudeFromSlices: 'extrusions.extrudeFromSlices',
  extrudeHelical: 'extrusions.extrudeHelical', extrudeLinear: 'extrusions.extrudeLinear',
  extrudeRectangular: 'extrusions.extrudeRectangular',
  extrudeRotate: 'extrusions.extrudeRotate', extrusions: 'extrusions',
  flatten: 'utils.flatten', fnNumberSort: 'utils.fnNumberSort',
  generalize: 'modifiers.generalize', geodesicSphere: 'primitives.geodesicSphere',
  geom2: 'geometries.geom2', geom3: 'geometries.geom3', geometries: 'geometries',
  hexToRgb: 'colors.hexToRgb', hslToRgb: 'colors.hslToRgb', hsvToRgb: 'colors.hsvToRgb',
  hueToColorComponent: 'colors.hueToColorComponent', hull: 'hulls.hull',
  hullChain: 'hulls.hullChain', hullPoints2: 'hulls.hullPoints2',
  hullPoints3: 'hulls.hullPoints3', hulls: 'hulls', insertSorted: 'utils.insertSorted',
  intersect: 'booleans.intersect', line: 'primitives.line', line2: 'maths.line2',
  line3: 'maths.line3', mat4: 'maths.mat4', maths: 'maths',
  measureAggregateArea: 'measurements.measureAggregateArea',
  measureAggregateBoundingBox: 'measurements.measureAggregateBoundingBox',
  measureAggregateEpsilon: 'measurements.measureAggregateEpsilon',
  measureAggregateVolume: 'measurements.measureAggregateVolume',
  measureArea: 'measurements.measureArea',
  measureBoundingBox: 'measurements.measureBoundingBox',
  measureBoundingSphere: 'measurements.measureBoundingSphere',
  measureCenter: 'measurements.measureCenter',
  measureCenterOfMass: 'measurements.measureCenterOfMass',
  measureDimensions: 'measurements.measureDimensions',
  measureEpsilon: 'measurements.measureEpsilon',
  measureVolume: 'measurements.measureVolume', measurements: 'measurements',
  minkowski: 'minkowski', minkowskiSum: 'minkowski.minkowskiSum',
  mirror: 'transforms.mirror', mirrorX: 'transforms.mirrorX', mirrorY: 'transforms.mirrorY',
  mirrorZ: 'transforms.mirrorZ', modifiers: 'modifiers', offset: 'expansions.offset',
  path2: 'geometries.path2', plane: 'maths.plane', poly2: 'geometries.poly2',
  poly3: 'geometries.poly3', polygon: 'primitives.polygon',
  polyhedron: 'primitives.polyhedron', primitives: 'primitives',
  project: 'extrusions.project', radToDeg: 'utils.radToDeg',
  radiusToSegments: 'utils.radiusToSegments', rectangle: 'primitives.rectangle',
  retessellate: 'modifiers.retessellate', rgbToHex: 'colors.rgbToHex',
  rgbToHsl: 'colors.rgbToHsl', rgbToHsv: 'colors.rgbToHsv', rotate: 'transforms.rotate',
  rotateX: 'transforms.rotateX', rotateY: 'transforms.rotateY',
  rotateZ: 'transforms.rotateZ', roundedCuboid: 'primitives.roundedCuboid',
  roundedCylinder: 'primitives.roundedCylinder',
  roundedRectangle: 'primitives.roundedRectangle', scale: 'transforms.scale',
  scaleX: 'transforms.scaleX', scaleY: 'transforms.scaleY', scaleZ: 'transforms.scaleZ',
  scission: 'booleans.scission', slice: 'extrusions.slice', snap: 'modifiers.snap',
  sphere: 'primitives.sphere', square: 'primitives.square', star: 'primitives.star',
  subtract: 'booleans.subtract', text: 'text', torus: 'primitives.torus',
  transform: 'transforms.transform', transforms: 'transforms',
  translate: 'transforms.translate', translateX: 'transforms.translateX',
  translateY: 'transforms.translateY', translateZ: 'transforms.translateZ',
  triangle: 'primitives.triangle', union: 'booleans.union', utils: 'utils',
  vec2: 'maths.vec2', vec3: 'maths.vec3', vec4: 'maths.vec4', vectorChar: 'text.vectorChar',
  vectorText: 'text.vectorText',
};

/** The order the require header destructures in. The library's own order. */
export const MODULE_ORDER = [
  'colors', 'curves', 'geometries', 'maths', 'measurements', 'primitives',
  'text', 'utils', 'booleans', 'expansions', 'extrusions', 'hulls',
  'minkowski', 'modifiers', 'transforms',
];

// ---------------------------------------------------------------------------
// turn — the one name with no single-call equivalent, and the one thing this
// file WRITES rather than rewrites.
// ---------------------------------------------------------------------------
//
// turn is three calls around a measurement:
//
//   translate(c, rotate(radians, translate(-c, shape)))   c = the shape's own
//                                                             bbox centre
//
// Inlining that is not available, and the reason is the same class of bug turn
// itself was built to close: `c` is derived from `shape`, so the inlined
// expression would evaluate the student's argument THREE TIMES. Harmless for an
// identifier; wrong the moment it is turn(45, subtract(a, b)), and silently so.
//
// So the converter emits an ordinary local function, in the real API, into the
// student's own file. It is not a shim and not shCAD under another name: it
// needs nothing installed, it travels with the file, and it is the honest
// content of turn's graduation slide — the answer to "what was turn actually
// doing" ends up sitting in the student's own editor.
//
// Two details are load-bearing and were measured rather than assumed:
//
//   * utils.degToRad, NOT maths.utils.degToRad. Measured: the latter is
//     undefined and throws. degToRad is on the TOP-LEVEL utils module, which is
//     the documented `utils` collision reference.md already carries. Hand-
//     writing maths.utils here would produce a file that dies on jscad.app.
//   * Math.PI / 180 is not a safe substitute. The gate compares converted and
//     original as serialised geometry, so a last-bit difference in the rotation
//     matrix fails it. Using the library's own degToRad keeps the converted
//     model byte-identical to the one shCode drew.
//
// measureAggregateBoundingBox on an array is the other one. measureBoundingBox
// of an ARRAY returns one box per shape, nested, so [0][2] on it is undefined
// and every coordinate downstream goes null with no error — the same defect
// middleOf() in simple.js carries a comment about.
export const TURN_HELPER_NAME = 'turnInPlace';

export const TURN_HELPER = `// shCAD's turn(), written out in the real API. It rotates a shape about its
// OWN middle; transforms.rotate rotates about the world origin.
function ${TURN_HELPER_NAME}(degrees, shape) {
  const spin = Array.isArray(degrees) ? degrees : [0, 0, degrees]
  const bounds = Array.isArray(shape)
    ? measurements.measureAggregateBoundingBox(shape)
    : measurements.measureBoundingBox(shape)
  const mid = [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
    (bounds[0][2] + bounds[1][2]) / 2
  ]
  const radians = [
    utils.degToRad(spin[0]), utils.degToRad(spin[1]), utils.degToRad(spin[2])
  ]
  return transforms.translate(mid,
    transforms.rotate(radians,
      transforms.translate([-mid[0], -mid[1], -mid[2]], shape)))
}`;

/** The modules TURN_HELPER's body reaches for. */
export const TURN_HELPER_MODULES = ['measurements', 'utils', 'transforms'];

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

const obj = (pairs) => `{ ${pairs.map(([k, v]) => `${k}: ${v}`).join(', ')} }`;

/** simple.js's own `english()`, so the two refusals read the same. */
const english = (list) => (list.length < 2
  ? list.join('')
  : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);

/**
 * Split an argument list into `count` positional slots plus an optional
 * trailing { }. This is shCAD's whole grammar in one function, which is why
 * every rule reaches for it.
 *
 * THE KEY CHECK IS NOT DECORATION. simple.js's readOptions refuses an unknown
 * key BY NAME — a misspelled option that silently does nothing is the defect
 * the layer was built to close — and a converter that quietly passes the same
 * key through disagrees with the layer about what the program means. Measured
 * before this existed: `revolve(profile, { center: [1, 2, 3] })` throws in
 * shCode with a message naming the key, and converted to
 * `extrudeRotate({ center: [1, 2, 3] }, profile)`, which the library ignores.
 * Fourteen name/key pairs behaved that way. So `allowed` comes from the rule
 * itself, the gate pins every rule's list to SHCAD_NAMES' own, and a whole
 * name/key matrix asserts the converter never accepts a call the layer refuses.
 */
function readTrailingOptions(args, count, allowed) {
  if (args.length < count) return { error: `needs ${count} value(s) before its { }` };
  if (args.length > count + (allowed.length ? 1 : 0)) {
    return {
      error: allowed.length
        ? 'has too many arguments'
        : 'takes no { } options at all, and shCode refuses one too',
    };
  }
  const positional = args.slice(0, count);
  const pairs = [];
  if (args.length === count + 1) {
    const parsed = parseObjectLiteral(args[count]);
    if (!parsed) {
      return {
        error: `the trailing options are \`${args[count].trim()}\`, which is not a `
          + '{ } written out here. Which real call this becomes can depend on which keys '
          + 'are in it, so the converter will not guess — write the object literal in '
          + 'the call, or write the real call yourself',
      };
    }
    for (const [key] of parsed) {
      if (!allowed.includes(key.replace(/^['"]|['"]$/g, ''))) {
        return {
          error: `has no option called "${key}". It takes ${english(allowed)}. shCode refuses `
            + 'that key by name, so the program does not run there either — fix it in the '
            + 'shCAD version first',
        };
      }
    }
    pairs.push(...parsed);
  }
  return { positional, pairs, has: (k) => pairs.some(([key]) => key === k) };
}

/**
 * One rule per shCAD name. `branches` declares every path the rule can take,
 * and the gate asserts that running the whole corpus hits every one of them —
 * branch coverage with no coverage tool and no dependency.
 *
 * `emit(args, ctx)` gets the ARGUMENT TEXTS, already converted (so a nested
 * shCAD call inside an argument is real API by the time a rule sees it), and
 * returns { call, branch } or { error }.
 */
export const RULES = {
  box: {
    options: ['center', 'roundRadius', 'segments'],
    branches: ['plain', 'rounded'],
    emit(args, ctx) {
      const opts = ctx.options(args, 3);
      if (opts.error) return opts;
      const size = `[${opts.positional.join(', ')}]`;
      const rounded = opts.has('roundRadius');
      return {
        branch: rounded ? 'rounded' : 'plain',
        call: `primitives.${rounded ? 'roundedCuboid' : 'cuboid'}(${obj([['size', size], ...opts.pairs])})`,
      };
    },
  },
  rect: {
    options: ['center', 'roundRadius', 'segments'],
    branches: ['plain', 'rounded'],
    emit(args, ctx) {
      const opts = ctx.options(args, 2);
      if (opts.error) return opts;
      const size = `[${opts.positional.join(', ')}]`;
      const rounded = opts.has('roundRadius');
      return {
        branch: rounded ? 'rounded' : 'plain',
        call: `primitives.${rounded ? 'roundedRectangle' : 'rectangle'}(${obj([['size', size], ...opts.pairs])})`,
      };
    },
  },
  disc: {
    options: ['center', 'segments'],
    branches: ['plain', 'options'],
    emit(args, ctx) {
      const opts = ctx.options(args, 1);
      if (opts.error) return opts;
      return {
        branch: opts.pairs.length ? 'options' : 'plain',
        call: `primitives.circle(${obj([['radius', opts.positional[0]], ...opts.pairs])})`,
      };
    },
  },
  ball: {
    options: ['center', 'segments'],
    branches: ['plain', 'options'],
    emit(args, ctx) {
      const opts = ctx.options(args, 1);
      if (opts.error) return opts;
      return {
        branch: opts.pairs.length ? 'options' : 'plain',
        call: `primitives.sphere(${obj([['radius', opts.positional[0]], ...opts.pairs])})`,
      };
    },
  },
  tube: {
    options: ['center', 'roundRadius', 'segments'],
    branches: ['plain', 'rounded'],
    emit(args, ctx) {
      const opts = ctx.options(args, 2);
      if (opts.error) return opts;
      const rounded = opts.has('roundRadius');
      const required = [['radius', opts.positional[0]], ['height', opts.positional[1]]];
      return {
        branch: rounded ? 'rounded' : 'plain',
        call: `primitives.${rounded ? 'roundedCylinder' : 'cylinder'}(${obj([...required, ...opts.pairs])})`,
      };
    },
  },
  cone: {
    options: ['center', 'segments'],
    branches: ['plain', 'options'],
    emit(args, ctx) {
      const opts = ctx.options(args, 2);
      if (opts.error) return opts;
      const r = opts.positional[0];
      const required = [
        ['startRadius', `[${r}, ${r}]`],
        ['endRadius', '[0, 0]'],
        ['height', opts.positional[1]],
      ];
      return {
        branch: opts.pairs.length ? 'options' : 'plain',
        call: `primitives.cylinderElliptic(${obj([...required, ...opts.pairs])})`,
      };
    },
  },
  ring: {
    options: [],
    branches: ['plain'],
    emit(args, ctx) {
      const opts = ctx.options(args, 2);
      if (opts.error) return opts;
      return {
        branch: 'plain',
        call: `primitives.torus(${obj([
          ['outerRadius', opts.positional[0]], ['innerRadius', opts.positional[1]],
        ])})`,
      };
    },
  },
  poly: {
    options: [],
    branches: ['plain'],
    emit(args, ctx) {
      const opts = ctx.options(args, 1);
      if (opts.error) return opts;
      return { branch: 'plain', call: `primitives.polygon(${obj([['points', opts.positional[0]]])})` };
    },
  },
  extrude: {
    options: [],
    branches: ['single', 'variadic'],
    emit(args) {
      if (args.length < 2) return { error: 'extrude needs a height and at least one shape' };
      const [height, ...shapes] = args;
      // extrude is the one variadic name, so it never reaches readOptions and
      // the allowed-key list above can never fire for it. simple.js checks this
      // separately and by hand for the same reason: a { } written here is not
      // an options object, it is a PROFILE, and extrudeLinear would take it as
      // one and contribute nothing. Refusing it is what shCode already does.
      const stray = shapes.find((s) => parseObjectLiteral(s) !== null);
      if (stray !== undefined) {
        return {
          error: `\`${stray}\` is written where a shape goes. extrude has no { } options at `
            + 'all — shCode refuses this too, and the library would take it as a profile and '
            + 'quietly build nothing. extrudeLinear is the real call that takes twistAngle '
            + 'and twistSteps',
        };
      }
      return {
        branch: shapes.length > 1 ? 'variadic' : 'single',
        call: `extrusions.extrudeLinear(${obj([['height', height]])}, ${shapes.join(', ')})`,
      };
    },
  },
  revolve: {
    // The one name whose { } changes ends: shCAD writes it last, extrudeRotate
    // takes it first. That swap is the rule, and it is why revolve cannot be
    // inferred from a positional template.
    options: ['segments'],
    branches: ['plain', 'options'],
    emit(args, ctx) {
      const opts = ctx.options(args, 1);
      if (opts.error) return opts;
      const options = opts.pairs.length ? obj(opts.pairs) : '{}';
      return {
        branch: opts.pairs.length ? 'options' : 'plain',
        call: `extrusions.extrudeRotate(${options}, ${opts.positional[0]})`,
      };
    },
  },
  turn: {
    options: [],
    branches: ['helper'],
    emit(args, ctx) {
      if (args.length !== 2) return { error: 'turn takes an angle and a shape' };
      if (ctx.locals.has(TURN_HELPER_NAME)) {
        return {
          error: `this file already declares ${TURN_HELPER_NAME}, and the converter would `
            + 'have to shadow it to write turn out in the real API',
        };
      }
      ctx.needTurnHelper();
      return { branch: 'helper', call: `${TURN_HELPER_NAME}(${args[0]}, ${args[1]})` };
    },
  },
  sit: {
    // The one genuinely undecidable rule, and the wart is written down rather
    // than hidden. simple.js decides `grouped` at run time with
    // Array.isArray(shape); a converter has only text. A literal list and a
    // call are both safe to decide here. A bare identifier is not — so it gets
    // the run-time test emitted verbatim, which is correct, side-effect-free
    // for an identifier, and slightly ugly. Anything else is refused.
    //
    // Getting this wrong is the exact silent defect GRADUATION_TRIPWIRES was
    // written for: grouped:false drops every part of an assembly separately
    // onto z = 0 and nothing throws.
    options: [],
    branches: ['grouped', 'single', 'identifier'],
    emit(args, ctx) {
      if (args.length !== 1) return { error: 'sit takes one shape or one list of shapes' };
      const shape = args[0];
      let grouped;
      let branch;
      if (/^\[/.test(shape)) { grouped = 'true'; branch = 'grouped'; }
      else if (/^[A-Za-z_$][\w$.]*\s*\(/.test(shape) || /^[-\d]/.test(shape)) { grouped = 'false'; branch = 'single'; }
      else if (/^[A-Za-z_$][\w$.]*$/.test(shape)) {
        grouped = `Array.isArray(${shape})`;
        branch = 'identifier';
        ctx.note(
          `sit(${shape}) — the converter cannot tell from the text whether ${shape} is one `
          + 'shape or a list, so it emits grouped: Array.isArray(' + shape + '), which is what '
          + 'shCAD decides at run time. Handed a list with grouped: false, align drops every '
          + 'part separately onto z = 0 and nothing throws.'
        );
      } else {
        return {
          error: `sit(${shape}) — whether this is one shape or a list decides align's `
            + '`grouped`, and it cannot be read off the text. Name it first '
            + '(const parts = …; sit(parts)), or write the align call yourself',
        };
      }
      return {
        branch,
        call: `transforms.align(${obj([
          ['modes', "['none', 'none', 'min']"],
          ['relativeTo', '[0, 0, 0]'],
          ['grouped', grouped],
        ])}, ${shape})`,
      };
    },
  },
};

/** Every name this converter knows how to rewrite. */
export const RULE_NAMES = Object.keys(RULES);

// ---------------------------------------------------------------------------
// The scanner
// ---------------------------------------------------------------------------

const isIdentStart = (c) => /[A-Za-z_$]/.test(c);
const isIdentPart = (c) => /[A-Za-z0-9_$]/.test(c);

/**
 * A TEMPLATE LITERAL IS NOT ONE THING. Its chunks are text, and its ${ } holes
 * are CODE — ordinary expressions in which `box(1, 2, 3)` is a call to shCAD and
 * `measureVolume(s)` is a bare shim name that does not exist on jscad.app.
 *
 * Treating the whole literal as a string, which is what a single `skipString`
 * does, produces the worst output this converter can produce: a file that is
 * reported CLEAN — no refusal, no note — and then dies on jscad.app with
 * "measureVolume is not defined", from a line the student was told was fine.
 * That is exactly the failure the "reported, never guessed at" rule exists to
 * prevent, so the holes are scanned like any other code.
 *
 * Returns the pieces so both callers can do the right thing with them: the
 * rewrite converts the holes and copies the chunks, and maskLiterals blanks the
 * chunks and LEAVES the holes visible, because a name declared or referenced
 * inside a hole is a real name.
 *
 * @returns {{ end:number, terminated:boolean, parts:{kind:'chunk'|'hole',start:number,end:number}[] }}
 */
export function scanTemplate(text, i) {
  const parts = [];
  let j = i + 1;
  let chunkStart = j;
  while (j < text.length) {
    const c = text[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '`') {
      parts.push({ kind: 'chunk', start: chunkStart, end: j });
      return { end: j + 1, terminated: true, parts };
    }
    if (c === '$' && text[j + 1] === '{') {
      const close = matchParen(text, j + 1);
      if (close < 0) break;
      parts.push({ kind: 'chunk', start: chunkStart, end: j });
      parts.push({ kind: 'hole', start: j + 2, end: close });
      j = close + 1;
      chunkStart = j;
      continue;
    }
    j++;
  }
  parts.push({ kind: 'chunk', start: chunkStart, end: text.length });
  return { end: text.length, terminated: false, parts };
}

/** Walk past a string or template literal starting at `i`. */
function skipString(text, i) {
  const quote = text[i];
  if (quote === '`') return scanTemplate(text, i).end;
  let j = i + 1;
  while (j < text.length) {
    if (text[j] === '\\') { j += 2; continue; }
    if (text[j] === quote) return j + 1;
    j++;
  }
  return text.length;
}

/**
 * A `/` is a REGEX only in a position where a value cannot already have ended.
 *
 * Without this the scan walked straight into `/box(1, 2, 3)/` and rewrote its
 * insides, turning a regex into `/primitives.cuboid({ size: [1, 2, 3] })/` —
 * a wrong rewrite, which is worse than a refusal, and silent. There is no
 * parser here (no new dependency means no acorn), so this is the standard
 * one-token lookbehind: after an identifier, a number, `)` or `]` the slash is
 * division; anywhere else it opens a regex. It is wrong only for the shapes
 * `if (x) /re/.test(y)` and `{ }` followed by a regex, neither of which occurs
 * in a JSCAD program, and being wrong there costs a rewrite inside a regex —
 * which is what this replaces, not something new.
 */
function regexStartsHere(text, i, prev) {
  if (text[i] !== '/' || text[i + 1] === '/' || text[i + 1] === '*') return false;
  if (prev === '') return true;
  return !(isIdentPart(prev) || prev === ')' || prev === ']');
}

/** Walk past a regex literal starting at the `/` at `i`, character class and all. */
function skipRegex(text, i) {
  let j = i + 1;
  let inClass = false;
  while (j < text.length) {
    const c = text[j];
    if (c === '\\') { j += 2; continue; }
    if (c === '\n') return -1;                 // unterminated: it was division
    if (c === '[') inClass = true;
    else if (c === ']') inClass = false;
    else if (c === '/' && !inClass) {
      j++;
      while (j < text.length && isIdentPart(text[j])) j++;   // flags
      return j;
    }
    j++;
  }
  return -1;
}

/**
 * Replace the CONTENTS of strings and comments with spaces, keeping length and
 * newlines, so an index-based scan over the result lines up with the original.
 * Used only for the pre-scan (declared names, module.exports); the rewrite
 * itself skips them as it goes.
 *
 * A template literal's ${ } holes are deliberately NOT blanked — they are code,
 * and `const` inside one declares a name that has to beat shCAD here too.
 */
export function maskLiterals(text) {
  const out = text.split('');
  let i = 0;
  const blank = (from, to) => {
    for (let k = from; k < to && k < out.length; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  while (i < text.length) {
    const c = text[i];
    if (c === '`') {
      const { end, parts } = scanTemplate(text, i);
      blank(i, end);
      for (const p of parts) {
        if (p.kind === 'hole') for (let k = p.start; k < p.end; k++) out[k] = text[k];
      }
      i = end;
      continue;
    }
    if (c === '"' || c === "'") {
      const j = skipString(text, i);
      blank(i, j);
      i = j;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      let j = text.indexOf('\n', i);
      if (j < 0) j = text.length;
      blank(i, j);
      i = j;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      let j = text.indexOf('*/', i);
      j = j < 0 ? text.length : j + 2;
      blank(i, j);
      i = j;
      continue;
    }
    i++;
  }
  return out.join('');
}

/**
 * Every name the file declares for itself. A student's own `const box = …` or a
 * parameter named `disc` beats shCAD in shCode (simple.js's install loop refuses
 * any name already taken, and the shim's does too), so it has to beat the
 * converter as well. Over-collecting is safe here: the consequence is a
 * reported refusal, never a wrong rewrite.
 */
export function declaredNames(masked) {
  const found = new Set();
  const add = (list) => {
    for (const raw of list.split(',')) {
      const m = /^\s*(?:\.\.\.)?([A-Za-z_$][\w$]*)/.exec(raw);
      if (m) found.add(m[1]);
    }
  };
  for (const m of masked.matchAll(/\b(?:const|let|var)\s+\{([^}]*)\}/g)) add(m[1]);
  for (const m of masked.matchAll(/\b(?:const|let|var)\s+\[([^\]]*)\]/g)) add(m[1]);
  for (const m of masked.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) found.add(m[1]);
  for (const m of masked.matchAll(/\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)?\s*\(([^)]*)\)/g)) {
    if (m[1]) found.add(m[1]);
    add(m[2]);
  }
  for (const m of masked.matchAll(/\(([^()]*)\)\s*=>/g)) add(m[1]);
  for (const m of masked.matchAll(/(^|[^\w$.])([A-Za-z_$][\w$]*)\s*=>/g)) found.add(m[2]);
  for (const m of masked.matchAll(/\bclass\s+([A-Za-z_$][\w$]*)/g)) found.add(m[1]);
  return found;
}

/** 1-based line number of an index. */
const lineAt = (src, index) => src.slice(0, Math.max(0, index)).split('\n').length;

function prevNonSpaceIndex(text, i) {
  let k = i - 1;
  while (k >= 0 && /\s/.test(text[k])) k--;
  return k;
}

function prevNonSpace(text, i) {
  const k = prevNonSpaceIndex(text, i);
  return k >= 0 ? text[k] : '';
}

/**
 * Is the name starting at `i` a PROPERTY of something — `shapes.disc`, `a?.turn`
 * — rather than a free name the converter owns?
 *
 * ONE CHARACTER OF LOOKBEHIND IS NOT ENOUGH, and the missing character was a
 * shipped defect. A spread ends in a dot too: in `union(...sit(parts))` the
 * character before `sit` is the third `.` of `...`, so a `prev === '.'` test
 * read it as member access, left `sit` bare, and reported the file CLEAN — no
 * refusal, no note. That is the same worst-output shape the template-literal
 * banner above describes, from the same root: a scan that classifies a name by
 * too little context and then says nothing.
 *
 * `..` is not valid JavaScript in any other position, so "a dot NOT preceded by
 * another dot" is exactly member access, and optional chaining (`?.`) still
 * qualifies. Spread and rest fall through to the ordinary paths, where a bare
 * shim name is qualified, an shCAD name is converted, and a name the file
 * declares for itself is refused with a line number — all of which is what
 * `...` deserves and none of which was happening.
 */
function isMemberAccess(text, i) {
  const k = prevNonSpaceIndex(text, i);
  return k >= 0 && text[k] === '.' && text[k - 1] !== '.';
}

function nextNonSpaceIndex(text, i) {
  let k = i;
  while (k < text.length && /\s/.test(text[k])) k++;
  return k;
}

/** Index of the `)` matching the `(` at `open`, or -1. */
function matchParen(text, open) {
  let depth = 0;
  let i = open;
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(text, i); continue; }
    if (c === '/' && text[i + 1] === '/') { const j = text.indexOf('\n', i); i = j < 0 ? text.length : j; continue; }
    if (c === '/' && text[i + 1] === '*') { const j = text.indexOf('*/', i); i = j < 0 ? text.length : j + 2; continue; }
    if (regexStartsHere(text, i, prevNonSpace(text, i))) {
      const j = skipRegex(text, i);
      if (j > 0) { i = j; continue; }
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) return i; }
    i++;
  }
  return -1;
}

/** Split an argument list on TOP-LEVEL commas. Offsets are into `text`. */
export function splitArgs(text) {
  const parts = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  const push = (end) => {
    const raw = text.slice(start, end);
    if (raw.trim() !== '' || parts.length) parts.push({ start, end, text: raw });
  };
  while (i < text.length) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') { i = skipString(text, i); continue; }
    if (c === '/' && text[i + 1] === '/') { const j = text.indexOf('\n', i); i = j < 0 ? text.length : j; continue; }
    if (c === '/' && text[i + 1] === '*') { const j = text.indexOf('*/', i); i = j < 0 ? text.length : j + 2; continue; }
    if (regexStartsHere(text, i, prevNonSpace(text, i))) {
      const j = skipRegex(text, i);
      if (j > 0) { i = j; continue; }
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ',' && depth === 0) { push(i); start = i + 1; }
    i++;
  }
  if (text.trim() !== '') push(text.length);
  return parts;
}

/**
 * An option object as ordered [key, valueText] pairs, or null when the text is
 * not a literal object. Null is a refusal, never a guess: `box(w, 20, 10, extras)`
 * cannot be converted, because whether it is roundedCuboid or cuboid depends on
 * a key nobody can see.
 */
export function parseObjectLiteral(text) {
  const t = text.trim();
  if (!t.startsWith('{') || !t.endsWith('}')) return null;
  const inner = t.slice(1, -1);
  if (inner.trim() === '') return [];
  const pairs = [];
  for (const part of splitArgs(inner)) {
    const raw = part.text.trim();
    if (!raw) continue;
    const m = /^([A-Za-z_$][\w$]*|'[^']*'|"[^"]*")\s*:/.exec(raw);
    if (!m) return null;                       // shorthand, spread, computed key
    pairs.push([m[1], raw.slice(m[0].length).trim()]);
  }
  return pairs;
}

// ---------------------------------------------------------------------------
// convert
// ---------------------------------------------------------------------------

/**
 * shCAD source in, jscad.app source out.
 *
 * @returns {{ code: string, notes: string[], refusals: {line:number,name:string,why:string}[],
 *             modules: string[], branches: string[], used: string[] }}
 */
export function convert(source, opts = {}) {
  const src = String(source).replace(/\r\n/g, '\n');
  const masked = maskLiterals(src);
  const state = {
    modules: new Set(),
    notes: [],
    refusals: [],
    branches: new Set(),
    used: new Set(),
    locals: declaredNames(masked),
    turn: false,
    src,
  };

  const ctx = {
    locals: state.locals,
    note: (text) => { if (!state.notes.includes(text)) state.notes.push(text); },
    needTurnHelper: () => { state.turn = true; },
  };

  const rewrite = (text, base) => {
    let out = '';
    let i = 0;
    while (i < text.length) {
      const c = text[i];
      // A template literal: chunks are text and are copied, ${ } holes are CODE
      // and go back through this same scan. Skipping the whole literal is how a
      // program that still needs shCAD came out reported CLEAN.
      if (c === '`') {
        const { end, terminated, parts } = scanTemplate(text, i);
        if (!terminated) {
          // The file is already not valid JavaScript, so this is not a rewrite
          // decision — but leaving it silent would be, and everything after the
          // stray backtick was read as text rather than code.
          state.refusals.push({
            line: lineAt(src, base + i),
            name: '`',
            why: 'a ` opens here and never closes, so everything after it was read as text '
              + 'rather than as code and nothing in it was converted. Close the template '
              + 'literal and convert again',
          });
          out += text.slice(i, end);
          i = end;
          continue;
        }
        let piece = '`';
        for (const p of parts) {
          piece += p.kind === 'chunk'
            ? text.slice(p.start, p.end)
            : `\${${rewrite(text.slice(p.start, p.end), base + p.start)}}`;
        }
        out += `${piece}\``;
        i = end;
        continue;
      }
      if (c === '"' || c === "'") { const j = skipString(text, i); out += text.slice(i, j); i = j; continue; }
      if (c === '/' && text[i + 1] === '/') { let j = text.indexOf('\n', i); if (j < 0) j = text.length; out += text.slice(i, j); i = j; continue; }
      if (c === '/' && text[i + 1] === '*') { let j = text.indexOf('*/', i); j = j < 0 ? text.length : j + 2; out += text.slice(i, j); i = j; continue; }
      if (regexStartsHere(text, i, prevNonSpace(text, i))) {
        const j = skipRegex(text, i);
        if (j > 0) { out += text.slice(i, j); i = j; continue; }
      }
      if (!isIdentStart(c)) { out += c; i++; continue; }

      let j = i;
      while (j < text.length && isIdentPart(text[j])) j++;
      const name = text.slice(i, j);
      const rule = RULES[name];
      const path = MODULE_OF[name];
      const line = () => lineAt(src, base + i);

      if (!rule && !path) { out += name; i = j; continue; }
      if (isMemberAccess(text, i)) { out += name; i = j; continue; }

      // Property-key and shorthand positions. `{ center: … }` is a key, not a
      // reference to transforms.center; `{ box }` is a shorthand nobody can
      // classify from here.
      const before = prevNonSpace(text, i);
      const afterAt = nextNonSpaceIndex(text, j);
      const after = text[afterAt] || '';
      if (after === ':' && (before === '{' || before === ',')) { out += name; i = j; continue; }
      if ((before === '{' || before === ',') && (after === ',' || after === '}')) {
        state.refusals.push({
          line: line(), name,
          why: `\`${name}\` is written as a shorthand property here, so the converter cannot `
            + 'tell a reference to the library from a key of your own. Write it out '
            + `(${name}: ${name}) and convert again`,
        });
        out += name;
        i = j;
        continue;
      }

      if (state.locals.has(name)) {
        state.refusals.push({
          line: line(), name,
          why: `this file declares \`${name}\` itself, so it is yours and not the library's. `
            + 'It was left exactly as written — which is right, and is worth knowing before '
            + 'you read the output',
        });
        out += name;
        i = j;
        continue;
      }

      if (!rule) { state.used.add(name); state.modules.add(path.split('.')[0]); out += path; i = j; continue; }

      // An shCAD name. It has to be a call.
      if (text[afterAt] !== '(') {
        state.refusals.push({
          line: line(), name,
          why: `\`${name}\` is used here without being called, and shCAD names are functions `
            + 'with no real-API twin as values. Look it up in the graduation table',
        });
        out += name;
        i = j;
        continue;
      }
      const close = matchParen(text, afterAt);
      if (close < 0) {
        state.refusals.push({ line: line(), name, why: `the call to \`${name}\` has no closing bracket` });
        out += name;
        i = j;
        continue;
      }
      const inside = text.slice(afterAt + 1, close);
      const args = splitArgs(inside)
        .map((a) => rewrite(a.text, base + afterAt + 1 + a.start).trim())
        .filter((a) => a !== '');
      // `options` is bound to THIS rule's own allowed-key list rather than
      // passed in by the rule, so a rule cannot declare one list and check
      // against another. Safe because the arguments are fully rewritten on the
      // line above: no emit is ever running while another emit runs.
      const result = rule.emit(args, {
        ...ctx,
        options: (list, count) => readTrailingOptions(list, count, rule.options),
      });
      if (result.error) {
        state.refusals.push({ line: line(), name, why: `${name}: ${result.error}` });
        out += text.slice(i, close + 1);
        i = close + 1;
        continue;
      }
      state.used.add(name);
      state.branches.add(`${name}:${result.branch}`);
      for (const m of result.call.matchAll(/\b([a-z][\w$]*)\./g)) {
        if (MODULE_ORDER.includes(m[1])) state.modules.add(m[1]);
      }
      out += result.call;
      i = close + 1;
    }
    return out;
  };

  let body = rewrite(src, 0);

  if (state.turn) {
    for (const m of TURN_HELPER_MODULES) state.modules.add(m);
    state.notes.push(
      `turn() became a local function called ${TURN_HELPER_NAME}, written into the file. It is `
      + 'the one shCAD name with no single-call equivalent: it measures the shape, brings it '
      + 'to the origin, rotates it and puts it back. Inlining that would evaluate your shape '
      + 'three times, which is wrong the moment the argument is a call. transforms.rotate on '
      + 'its own is NOT the same thing — it spins about the world origin.'
    );
    body = `${TURN_HELPER}\n\n${body.replace(/^\n+/, '')}`;
  }

  const modules = MODULE_ORDER.filter((m) => state.modules.has(m));
  const header = modules.length
    ? `const { ${modules.join(', ')} } = require('@jscad/modeling')\n\n`
    : '';

  let tail = '';
  const hasExport = /\bmodule\s*\.\s*exports\b/.test(masked) || /\bexports\s*\.\s*main\b/.test(masked);
  const hasMain = /\bfunction\s+main\s*\(|\b(?:const|let|var)\s+main\s*=/.test(masked);
  if (!hasExport && hasMain) {
    tail = '\nmodule.exports = { main }\n';
    if (/\bfunction\s+getParameterDefinitions\s*\(/.test(masked)) {
      tail = '\nmodule.exports = { main, getParameterDefinitions }\n';
    }
  }
  if (!hasMain && !hasExport) {
    state.notes.push(
      'This file has no main(), so nothing was exported. jscad.app calls main() and draws '
      + 'what it returns.'
    );
  }

  state.notes.push(
    'This is ONE file. jscad.app also takes a whole folder for a multi-file project, and '
    + 'nothing here converts a project layout — only the program in front of you.'
  );

  return {
    code: `${header}${body.replace(/\n+$/, '')}\n${tail}`,
    notes: state.notes,
    refusals: state.refusals,
    modules,
    branches: [...state.branches].sort(),
    used: [...state.used].sort(),
  };
}
