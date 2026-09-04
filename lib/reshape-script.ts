// reSHape Script -- the scripting side of the B-rep build. See
// .gauntlet/SPEC-reshape-script.md for the language this file implements.
//
// THE ONE IDEA (repeated from the spec, because it is the whole design): a
// reSHape script is the Build timeline written down. Every call below appends
// one step to the same ModelDoc the Build tools produce (lib/model-types.ts),
// using the SAME `new*` constructors and the SAME `nextId()` sequence a mouse
// click would use, so a script and a sequence of toolbar clicks that "mean
// the same thing" produce byte-comparable docs. There is no second geometry
// representation here -- runScript() never touches a kernel, never emits
// JSCAD or OpenCascade calls, and never draws anything. It only builds a
// ModelDoc and a parameter list; lib/occt-build.ts is what turns that into a
// solid, exactly as it already does for a doc the mouse built.
//
// WHY new Function() AND NOT eval(). Two reasons, both load-bearing. First,
// this file has to run identically in two hosts: a plain Node process
// (scripts/test-reshape-script.mjs, no DOM) and a sandboxed iframe compiled
// through scripts/build-brep-kernel.mjs (public/reshape/script-runner.html).
// eval() inside a module (this file compiles to one) is always the "indirect
// eval" form when called as `(0, eval)(...)`, or inherits strict mode from
// its caller otherwise -- new Function() sidesteps that ambiguity by always
// producing an ordinary, non-strict function body, matching the JSCAD runners'
// choice of a real <script> tag for the same reason (see runner.html's own
// comment on this). Second, a Function body appended with a `//# sourceURL=`
// comment gets its OWN name in a stack trace in both V8-based hosts (Node and
// Chromium), which is what makes error line numbers possible below without a
// parser of our own -- see lineOf().
//
// THE LINE-NUMBER OFFSET IS MEASURED, NOT ASSUMED. `new Function(a, b, body)`
// synthesizes `function anonymous(a,b\n) {\n<body>\n}`, so V8 reports every
// line inside <body> two lines higher than it actually sits. Measured
// directly against this exact construction (see the shell session that
// produced this file): a `throw` on body line 3 is reported at line 5,
// regardless of how many parameter names are passed. LINE_OFFSET encodes that
// gap in one place rather than as a magic number wherever a stack is parsed.

import {
  type Feature,
  type ModelDoc,
  type Vec3,
  type Axis3,
  type SketchPlane,
  type ShapeKind,
  type BoxFeature,
  type CylinderFeature,
  type ConeFeature,
  type TorusFeature,
  type SphereFeature,
  type SketchFeature,
  type FilletFeature,
  type DraftFeature,
  type ShellFeature,
  nextId,
  newShape,
  newHole,
  newHoleCorners,
  newShell,
  newMove,
  newPattern,
  newSketch,
  newExtrude,
  newRevolve,
  newMirror,
  newBlend,
  extentAlong,
  isRoundable,
  canRotate,
  whyCannotRound,
  whyCannotOrbit,
} from './model-types';
import { generatedParams, applyParam, pname } from './model-codegen';
import type { TopoName } from './topo-name';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ParamDef {
  name: string;
  caption: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface ScriptError {
  message: string;
  /** 1-based line inside the student's own source, or null when no line
   *  could be recovered (a bare SyntaxError has no useful stack -- see
   *  lineOf()'s own comment). */
  line: number | null;
}

export interface RunResult {
  doc: ModelDoc;
  params: ParamDef[];
  errors: ScriptError[];
}

/**
 * Every top-level name a reSHape script can call, in the exact order
 * runScript() installs them -- the single source of truth for "what is the
 * DSL", read by scripts/test-reshape-docs.mjs's COVERAGE and DRIFT groups so
 * they measure documentation coverage against what this file actually
 * implements rather than a hand-maintained list that can fall out of step
 * with it. `runScript()`'s own `globals` object below is built FROM this
 * array (`Object.fromEntries(VOCABULARY.map(...))`) rather than the other
 * way around, so the two cannot drift apart.
 */
export const VOCABULARY = [
  'box', 'cylinder', 'sphere', 'cone', 'ring',
  'hole', 'holes', 'hollow', 'round', 'bevel', 'repeat', 'repeatAround', 'mirror', 'move', 'turn',
  'join', 'cut', 'keep', 'draft',
  'sketch', 'pull', 'spin', 'blend',
  'param',
] as const;

export interface RunOptions {
  /** Values keyed exactly like generatedParams()'s own `name` field
   *  (`${featureId}_${slot}`, see pname() in lib/model-codegen.ts) -- the
   *  SAME key a Build-mode slider drag already uses. Applied with
   *  applyParam() after the script has built its doc from its own literal
   *  defaults; a script's own control flow (an `if` gated on a param())
   *  therefore still runs the branch its LITERAL default picked, even while
   *  a drag is live. That is a real, deliberate simplification over "re-run
   *  the whole script with the value substituted in", which would let a
   *  dragged param() reshape which STEPS exist, not just their numbers --
   *  see the file-level design-decision note at the bottom of this file. */
  values?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Error line recovery
// ---------------------------------------------------------------------------

const SOURCE_NAME = 'reshape-user-script.js';
// See the file header: measured against `new Function(...)` on this exact
// engine family (V8 -- Node and Chromium both), not derived from a spec.
const LINE_OFFSET = 2;

function lineOf(err: unknown): number | null {
  const stack = err instanceof Error ? err.stack : undefined;
  if (!stack) return null;
  const rx = new RegExp(SOURCE_NAME.replace(/\./g, '\\.') + ':(\\d+):(\\d+)');
  const m = rx.exec(stack);
  if (!m) return null;
  const line = parseInt(m[1], 10) - LINE_OFFSET;
  return line > 0 ? line : null;
}

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

// ---------------------------------------------------------------------------
// Boxed numbers -- how a named param() correlates to the doc slot it lands in
// ---------------------------------------------------------------------------

/**
 * What param() returns. A subclass of Number rather than a bare number so it
 * keeps working as a number everywhere ordinary JavaScript expects one --
 * arithmetic, comparisons, template strings, Math.*, .toFixed() -- while
 * still carrying which name produced it. Every place a DSL function reads a
 * numeric argument unwraps through num()/unwrap() below, which also
 * RECORDS the correlation (this value's name -> the exact doc slot it is
 * about to fill) so the final params list can caption that slot with the
 * student's own name instead of the Build tool's automatic one -- see
 * PARAMS ASSEMBLY at the bottom of runScript().
 */
class ParamNumber extends Number {
  constructor(v: number, public readonly paramName: string) {
    super(v);
  }
}

function paramNameOf(v: unknown): string | null {
  return v instanceof ParamNumber ? v.paramName : null;
}

function unwrap(v: unknown): number {
  return v instanceof ParamNumber ? v.valueOf() : (v as number);
}

// ---------------------------------------------------------------------------
// Validation, in reshape.js's own voice (plain-English sentence, names the
// thing that is wrong, never a stack trace) -- see public/reshape/reshape.js's
// requireNumbers()/readOptions() for the house style this matches. Not
// literally shared code: reshape.js's guards duck-type a JSCAD geometry
// object, which does not exist on this path at all (runScript never builds
// one), so a fresh, smaller pair of guards is honest about what this layer
// actually has to tell apart -- a number (boxed or not), a plain { } options
// object, and everything else.
// ---------------------------------------------------------------------------

function isFiniteNumber(v: unknown): boolean {
  if (v instanceof ParamNumber) return Number.isFinite(v.valueOf());
  return typeof v === 'number' && Number.isFinite(v);
}

function describe(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'nothing';
  if (typeof v === 'string') return `the text "${v}"`;
  if (typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `a list of ${v.length}`;
  if (isTopoRef(v)) return v.name.cause === 'between' ? 'an edge' : 'a face';
  if (isHandle(v)) return `a ${v.kind} from earlier in the script`;
  if (typeof v === 'object') return 'a { } object';
  if (typeof v === 'function') return 'a function';
  return String(v);
}

function requiredNumber(fn: string, label: string, v: unknown): number {
  if (v === undefined) {
    throw new Error(`${fn} needs a number for ${label}.`);
  }
  if (!isFiniteNumber(v)) {
    throw new Error(`${fn}'s ${label} has to be a number, and you gave it ${describe(v)}.`);
  }
  return v as number; // caller unwraps via num() where the slot matters
}

function optionalNumber(fn: string, label: string, v: unknown): number | undefined {
  if (v === undefined) return undefined;
  if (!isFiniteNumber(v)) {
    throw new Error(`${fn}'s ${label} has to be a number, and you gave it ${describe(v)}.`);
  }
  return v as number;
}

function isPlainOptions(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Number) && !isTopoRef(v) && !isHandle(v);
}

function readOptions(fn: string, allowed: string[], given: unknown): Record<string, unknown> {
  if (given === undefined) return {};
  if (!isPlainOptions(given)) {
    throw new Error(
      `${fn}'s extras go in a { } object at the end, like ${fn}(..., { ${allowed[0]}: ... }). ` +
        `You gave it ${describe(given)}.`
    );
  }
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(given)) {
    if (!allowed.includes(key)) {
      throw new Error(`${fn} has no option called "${key}". It takes ${allowed.join(', ')}.`);
    }
    out[key] = given[key];
  }
  return out;
}

function readVec3(fn: string, label: string, v: unknown): Vec3 {
  if (!Array.isArray(v) || v.length !== 3) {
    throw new Error(`${fn}'s ${label} needs three numbers, like [x, y, z]. You gave it ${describe(v)}.`);
  }
  return [
    requiredNumber(fn, `${label} x`, v[0]) as number,
    requiredNumber(fn, `${label} y`, v[1]) as number,
    requiredNumber(fn, `${label} z`, v[2]) as number,
  ];
}

function readVec2(fn: string, label: string, v: unknown): [number, number] {
  if (!Array.isArray(v) || v.length !== 2) {
    throw new Error(`${fn}'s ${label} needs two numbers, like [across, up]. You gave it ${describe(v)}.`);
  }
  return [
    requiredNumber(fn, `${label} 1`, v[0]) as number,
    requiredNumber(fn, `${label} 2`, v[1]) as number,
  ];
}

// ---------------------------------------------------------------------------
// Face and edge words -- see the spec's "Names" section. The six axis-aligned
// words are the same ones namePrimitiveFace() in lib/topo-resolve.ts already
// answers to; 'side' is the seventh, a cylinder's curved wall only.
// ---------------------------------------------------------------------------

export type FaceWord = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'side';

const FACE_PARTS: Record<string, string> = {
  top: '+z',
  bottom: '-z',
  front: '-y',
  back: '+y',
  left: '-x',
  right: '+x',
};

/** Which axis a face word's normal runs along -- used to pick draft's pull
 *  axis from a 'from' word, and to pick a hole's in-plane offset axes. */
const FACE_AXIS: Record<string, Axis3> = {
  top: 'z', bottom: 'z', front: 'y', back: 'y', left: 'x', right: 'x',
};

function facePart(fn: string, word: unknown, allowSide: boolean): string {
  if (typeof word !== 'string') {
    throw new Error(`${fn} needs a face word (top, bottom, front, back, left, right${allowSide ? ', or side' : ''}), and you gave it ${describe(word)}.`);
  }
  if (word === 'side') {
    if (!allowSide) throw new Error(`${fn}: "side" is the curved wall of a cylinder, not a flat face here.`);
    return 'side';
  }
  const part = FACE_PARTS[word];
  if (!part) {
    throw new Error(
      `${fn} does not know the face "${word}". Faces are named top, bottom, front, back, left, right` +
        (allowSide ? ', or side (a cylinder\'s curved wall)' : '') + '.'
    );
  }
  return part;
}

// ---------------------------------------------------------------------------
// Handles -- what every DSL call passes around. A solid handle tracks TWO
// ids on purpose: `rootId` never changes (it is the primitive .face()/.edge()
// names are rooted at, matching how lib/topo-name.ts's 'primitive' cause
// always keeps the ORIGINAL feature's id even after later steps replace it
// in the model), while `id` is mutated by every step that CONSUMES its
// target (hole, hollow, round, bevel, repeat, repeatAround, move without
// copy) so the next call chained off the same variable acts on the right
// row -- exactly the way clicking Hole and then Round on the SAME shape in
// the timeline acts on the row Hole just produced, not the box underneath it.
// ---------------------------------------------------------------------------

export interface SolidHandle {
  readonly __reshapeHandle: true;
  id: string;
  readonly rootId: string;
  readonly rootKind: 'box' | 'cylinder' | 'other';
  kind: Feature['kind'];
  face(word: FaceWord): TopoRef;
  edge(a: FaceWord, b: FaceWord): TopoRef;
}

/** A .face()/.edge() result. Carries the owning handle alongside the name so
 *  round()/bevel()/draft() can read (and mutate) the shape the name belongs
 *  to, not just the name itself -- see FilletFeature's own doc comment on why
 *  `target` and `edge`'s root can be different features. */
export interface TopoRef {
  readonly __reshapeTopoRef: true;
  owner: SolidHandle;
  name: TopoName;
}

export interface SketchHandle {
  readonly __reshapeSketch: true;
  id: string;
  rect(w: unknown, h: unknown, opts?: unknown): SketchHandle;
  circle(d: unknown, opts?: unknown): SketchHandle;
  polygon(points: unknown): SketchHandle;
  round(corner: unknown, radius: unknown): SketchHandle;
  chamfer(corner: unknown, distance: unknown): SketchHandle;
}

function isHandle(v: unknown): v is SolidHandle {
  return !!v && typeof v === 'object' && (v as { __reshapeHandle?: true }).__reshapeHandle === true;
}
function isTopoRef(v: unknown): v is TopoRef {
  return !!v && typeof v === 'object' && (v as { __reshapeTopoRef?: true }).__reshapeTopoRef === true;
}
function isSketchHandle(v: unknown): v is SketchHandle {
  return !!v && typeof v === 'object' && (v as { __reshapeSketch?: true }).__reshapeSketch === true;
}

function rootKindOf(kind: Feature['kind']): 'box' | 'cylinder' | 'other' {
  return kind === 'box' ? 'box' : kind === 'cylinder' ? 'cylinder' : 'other';
}

// ---------------------------------------------------------------------------
// The interpreter itself
// ---------------------------------------------------------------------------

export function runScript(source: string, opts: RunOptions = {}): RunResult {
  let features: Feature[] = [];
  const namedParams = new Map<string, ParamDef>();
  // pname(id, slot) -> the param() name whose caption/bounds should win over
  // the Build tool's automatic one for that slot. See num()'s own comment.
  const slotOverrides = new Map<string, string>();
  const usedParamNames = new Set<string>();

  const docNow = (): ModelDoc => ({ version: 1, features });

  /** Unwrap a possibly-boxed number, recording which slot it landed in so the
   *  final params list can caption that slot with the student's own name
   *  instead of the doc's automatic one -- see PARAMS ASSEMBLY below. Call
   *  this exactly where a value is about to be written into a Feature field,
   *  never earlier (an intermediate expression like `wall * 2` unwraps on
   *  its own through Number's arithmetic coercion and loses the tag, which
   *  is expected: the caption follows the NAMED value, not everything
   *  downstream of it). */
  function num(v: unknown, id: string, slot: string): number {
    const name = paramNameOf(v);
    if (name) slotOverrides.set(pname(id, slot), name);
    return unwrap(v);
  }

  function pushFeature(f: Feature): Feature {
    features = [...features, f];
    return f;
  }

  function replaceFeature(id: string, next: Feature) {
    features = features.map((f) => (f.id === id ? next : f));
  }

  function findFeature(id: string): Feature {
    const f = features.find((x) => x.id === id);
    if (!f) throw new Error(`internal: feature "${id}" is missing from the document.`);
    return f;
  }

  function makeSolidHandle(f: Feature, rootId = f.id): SolidHandle {
    const handle: SolidHandle = {
      __reshapeHandle: true,
      id: f.id,
      rootId,
      rootKind: rootKindOf(findFeature(rootId).kind),
      kind: f.kind,
      face(word: FaceWord): TopoRef {
        const allowSide = handle.rootKind === 'cylinder';
        const part = facePart('.face()', word, allowSide);
        return {
          __reshapeTopoRef: true,
          owner: handle,
          name: { cause: 'primitive', feature: handle.rootId, kind: 'face', part },
        };
      },
      edge(a: FaceWord, b: FaceWord): TopoRef {
        const allowSide = handle.rootKind === 'cylinder';
        const pa = facePart('.edge()', a, allowSide);
        const pb = facePart('.edge()', b, allowSide);
        if (pa === pb) throw new Error('.edge() needs two DIFFERENT faces to name the edge between them.');
        return {
          __reshapeTopoRef: true,
          owner: handle,
          name: {
            cause: 'between',
            feature: handle.rootId,
            kind: 'edge',
            of: [
              { cause: 'primitive', feature: handle.rootId, kind: 'face', part: pa },
              { cause: 'primitive', feature: handle.rootId, kind: 'face', part: pb },
            ],
          },
        };
      },
    };
    return handle;
  }

  function mutateHandle(handle: SolidHandle, next: Feature) {
    handle.id = next.id;
    handle.kind = next.kind;
  }

  // ---- shapes ---------------------------------------------------------

  function placePrimitive(
    fn: string,
    kind: ShapeKind,
    argNames: string[],
    args: unknown[],
    opts: unknown,
    setDims: (f: Feature, id: string) => void
  ): SolidHandle {
    for (let i = 0; i < argNames.length; i++) requiredNumber(fn, argNames[i], args[i]);
    const allowCorner = kind === 'box' || kind === 'cylinder';
    const extra = readOptions(fn, allowCorner ? ['at', 'corner'] : ['at'], opts);
    const base = newShape(docNow(), kind);
    const id = base.id;
    setDims(base, id);
    if (extra.at !== undefined) {
      const at = readVec3(fn, 'at', extra.at);
      (base as { center: Vec3 }).center = [
        num(at[0], id, 'x'),
        num(at[1], id, 'y'),
        num(at[2], id, 'z'),
      ];
    }
    if (allowCorner && extra.corner !== undefined) {
      const c = requiredNumber(fn, 'corner', extra.corner);
      (base as BoxFeature | CylinderFeature).round = num(c, id, 'round');
    }
    pushFeature(base);
    return makeSolidHandle(base);
  }

  function box(w: unknown, d: unknown, h: unknown, opts?: unknown): SolidHandle {
    return placePrimitive('box', 'box', ['width', 'depth', 'height'], [w, d, h], opts, (f, id) => {
      (f as BoxFeature).size = [num(w, id, 'width'), num(d, id, 'depth'), num(h, id, 'height')];
    });
  }

  function cylinder(across: unknown, tall: unknown, opts?: unknown): SolidHandle {
    return placePrimitive('cylinder', 'cylinder', ['across', 'tall'], [across, tall], opts, (f, id) => {
      const cf = f as CylinderFeature;
      cf.radius = num(across, id, 'radius') / 2;
      cf.height = num(tall, id, 'height');
    });
  }

  function sphere(across: unknown, opts?: unknown): SolidHandle {
    return placePrimitive('sphere', 'sphere', ['across'], [across], opts, (f, id) => {
      (f as SphereFeature).radius = num(across, id, 'radius') / 2;
    });
  }

  // cone(across, tall) -- TWO arguments, not the spec's three. ConeFeature
  // (lib/model-types.ts) carries exactly one radius: newShape('cone') and
  // featureExpr()'s cylinderElliptic(radius, height, ...) both build a
  // pointed cone with no way to store a flat top radius at all, so the
  // spec's `cone(across, acrossTop, tall)` frustum form has nothing to write
  // its middle argument into. Implemented against what the Build tool
  // actually produces rather than inventing a doc field the rest of the app
  // does not read -- flagged in the build report as a deviation from the
  // spec text, not silently narrowed.
  function cone(across: unknown, tall: unknown, opts?: unknown): SolidHandle {
    return placePrimitive('cone', 'cone', ['across', 'tall'], [across, tall], opts, (f, id) => {
      const cf = f as ConeFeature;
      cf.radius = num(across, id, 'radius') / 2;
      cf.height = num(tall, id, 'height');
    });
  }

  // ring(across, tubeAcross) -> ringRadius/tubeRadius. The formula is the one
  // public/reshape/reshape.js's own header spells out for `ring`: ringRadius
  // is (across - thick) / 2, not "across / 2" -- across is the OUTSIDE
  // diameter of the whole donut, not the centreline the kernel's torus() call
  // actually takes.
  function ring(across: unknown, tubeAcross: unknown, opts?: unknown): SolidHandle {
    return placePrimitive('ring', 'torus', ['across', 'tubeAcross'], [across, tubeAcross], opts, (f, id) => {
      const tf = f as TorusFeature;
      // Neither raw argument is stored verbatim (ringRadius/tubeRadius are
      // both derived), so a named param() on either one is left uncorrelated
      // here -- unwrap() only, not num() -- rather than mislabel a slot with
      // bounds computed from the wrong number. See ring()'s own comment.
      const a = unwrap(across);
      const t = unwrap(tubeAcross);
      tf.tubeRadius = t / 2;
      tf.ringRadius = (a - t) / 2;
    });
  }

  // ---- sketches ---------------------------------------------------------

  const PLANE_WORD: Record<string, SketchPlane> = { top: 'xy', front: 'xz', side: 'yz' };

  function sketch(planeWord: unknown, offset?: unknown): SketchHandle {
    if (typeof planeWord !== 'string' || !(planeWord in PLANE_WORD)) {
      throw new Error(`sketch() needs a plane word: 'top', 'front' or 'side'. You gave it ${describe(planeWord)}.`);
    }
    const plane = PLANE_WORD[planeWord];
    const f = newSketch(docNow(), plane);
    if (offset !== undefined) f.offset = num(requiredNumber('sketch', 'offset', offset), f.id, 'offset');
    pushFeature(f);
    return makeSketchHandle(f.id);
  }

  function makeSketchHandle(id: string): SketchHandle {
    const handle: SketchHandle = {
      __reshapeSketch: true,
      id,
      rect(w, h, opts) {
        requiredNumber('.rect()', 'width', w);
        requiredNumber('.rect()', 'height', h);
        const extra = readOptions('.rect()', ['at'], opts);
        const [ax, ay] = extra.at !== undefined ? readVec2('.rect()', 'at', extra.at) : [0, 0];
        const ww = num(w, id, 'width');
        const hh = num(h, id, 'height');
        const points: Array<[number, number]> = [
          [ax - ww / 2, ay - hh / 2],
          [ax + ww / 2, ay - hh / 2],
          [ax + ww / 2, ay + hh / 2],
          [ax - ww / 2, ay + hh / 2],
        ];
        const cur = findFeature(id) as SketchFeature;
        replaceFeature(id, { ...cur, points, shape: undefined, rounds: undefined, chamfers: undefined, bulges: undefined });
        return handle;
      },
      circle(d, opts) {
        requiredNumber('.circle()', 'across', d);
        const extra = readOptions('.circle()', ['at'], opts);
        const [ax, ay] = extra.at !== undefined ? readVec2('.circle()', 'at', extra.at) : [0, 0];
        const r = num(d, id, 'across') / 2;
        const cur = findFeature(id) as SketchFeature;
        replaceFeature(id, {
          ...cur,
          points: [[ax - r, ay], [ax + r, ay]],
          shape: 'circle',
          rounds: undefined,
          chamfers: undefined,
          bulges: undefined,
        });
        return handle;
      },
      polygon(pointsArg) {
        if (!Array.isArray(pointsArg) || pointsArg.length < 3) {
          throw new Error(`.polygon() needs a list of at least three [x, y] points. You gave it ${describe(pointsArg)}.`);
        }
        const points: Array<[number, number]> = pointsArg.map((p: unknown, i: number) => {
          if (!Array.isArray(p) || p.length !== 2) {
            throw new Error(`.polygon()'s point ${i + 1} needs two numbers [x, y]. You gave it ${describe(p)}.`);
          }
          return [requiredNumber('.polygon()', `point ${i + 1} x`, p[0]) as number, requiredNumber('.polygon()', `point ${i + 1} y`, p[1]) as number];
        });
        const cur = findFeature(id) as SketchFeature;
        replaceFeature(id, { ...cur, points, shape: undefined, rounds: undefined, chamfers: undefined, bulges: undefined });
        return handle;
      },
      round(corner, radius) {
        const k = requiredNumber('.round()', 'corner', corner) as number;
        const r = requiredNumber('.round()', 'radius', radius);
        const cur = findFeature(id) as SketchFeature;
        const rounds = { ...(cur.rounds ?? {}), [k]: num(r, id, `r${k}`) };
        replaceFeature(id, { ...cur, rounds });
        return handle;
      },
      chamfer(corner, distance) {
        const k = requiredNumber('.chamfer()', 'corner', corner) as number;
        const dist = requiredNumber('.chamfer()', 'distance', distance) as number;
        const cur = findFeature(id) as SketchFeature;
        const chamfers = { ...(cur.chamfers ?? {}), [k]: dist };
        replaceFeature(id, { ...cur, chamfers });
        return handle;
      },
    };
    return handle;
  }

  function pull(sk: unknown, height: unknown): SolidHandle {
    if (!isSketchHandle(sk)) throw new Error(`pull() needs a sketch: pull(sketch('top'), height).`);
    requiredNumber('pull', 'height', height);
    const f = newExtrude(docNow(), sk.id);
    f.height = num(height, f.id, 'height');
    pushFeature(f);
    return makeSolidHandle(f);
  }

  function spin(sk: unknown, angle: unknown): SolidHandle {
    if (!isSketchHandle(sk)) throw new Error(`spin() needs a sketch: spin(sketch('top'), angle).`);
    requiredNumber('spin', 'angle', angle);
    const f = newRevolve(docNow(), sk.id);
    f.angle = num(angle, f.id, 'angle');
    pushFeature(f);
    return makeSolidHandle(f);
  }

  // blend(a, b, gap): BlendFeature takes no numbers of its own -- the gap
  // between the two sketches IS the difference in their own offsets (see
  // BlendFeature's doc comment in lib/model-types.ts) -- so the script's
  // third argument sets sk2's offset to sk1's offset + gap rather than being
  // stored anywhere new. toScript() reverses this by emitting the CURRENT
  // difference, so the two are exact inverses of each other.
  function blend(a: unknown, b: unknown, gap: unknown): SolidHandle {
    if (!isSketchHandle(a) || !isSketchHandle(b)) {
      throw new Error('blend() needs two sketches: blend(sketch1, sketch2, gap).');
    }
    requiredNumber('blend', 'gap', gap);
    const sa = findFeature(a.id) as SketchFeature;
    let sb = findFeature(b.id) as SketchFeature;
    const nextOffset = num(gap, b.id, 'offset') + sa.offset;
    if (sb.offset !== nextOffset) {
      sb = { ...sb, offset: nextOffset };
      replaceFeature(b.id, sb);
    }
    const f = newBlend(docNow(), sa, sb);
    pushFeature(f);
    return makeSolidHandle(f);
  }

  // ---- holes --------------------------------------------------------------

  function holeAxisAndCenter(fn: string, target: SolidHandle, opts: Record<string, unknown>): { axis: Axis3; center: Vec3 } {
    let axis: Axis3 = 'z';
    if (opts.along !== undefined) {
      if (opts.along !== 'x' && opts.along !== 'y' && opts.along !== 'z') {
        throw new Error(`${fn}'s "along" has to be 'x', 'y' or 'z'. You gave it ${describe(opts.along)}.`);
      }
      axis = opts.along;
    }
    let center: Vec3 = [0, 0, 0];
    if (opts.at !== undefined) {
      const [a, b] = readVec2(fn, 'at', opts.at);
      // The two in-plane axes, in the order a student would read a face:
      // "which two numbers am I not choosing" -- see the file-level design
      // note on this at the bottom of the file.
      if (axis === 'z') center = [num(a, target.id, 'x'), num(b, target.id, 'y'), 0];
      else if (axis === 'y') center = [num(a, target.id, 'x'), 0, num(b, target.id, 'z')];
      else center = [0, num(a, target.id, 'y'), num(b, target.id, 'z')];
    }
    return { axis, center };
  }

  function hole(target: unknown, opts?: unknown): SolidHandle {
    if (!isHandle(target)) throw new Error('hole() needs a shape to drill into: hole(shape, { across: 6 }).');
    const extra = readOptions('hole', ['across', 'deep', 'at', 'along'], opts);
    if (extra.across === undefined) throw new Error('hole() needs { across: <number> } for the bit\'s diameter.');
    const across = requiredNumber('hole', 'across', extra.across);
    const { axis, center } = holeAxisAndCenter('hole', target, extra);
    const base = newHole(docNow(), target.id);
    base.axis = axis;
    base.diameter = num(across, base.id, 'diameter');
    if (extra.deep !== undefined) {
      base.depth = num(requiredNumber('hole', 'deep', extra.deep), base.id, 'depth');
    } else {
      const extent = extentAlong(docNow(), target.id, axis);
      base.depth = extent != null ? extent + 2 : 10;
    }
    base.center = center;
    pushFeature(base);
    mutateHandle(target, base);
    return target;
  }

  function holes(target: unknown, opts?: unknown): SolidHandle {
    if (!isHandle(target)) throw new Error('holes() needs a shape to drill into: holes(shape, { across: 6, apart: [15, 10] }).');
    const extra = readOptions('holes', ['across', 'apart', 'at', 'along'], opts);
    if (extra.across === undefined) throw new Error('holes() needs { across: <number> } for the bit\'s diameter.');
    if (extra.apart === undefined) throw new Error('holes() needs { apart: [across, up] } for the corner-to-corner spacing.');
    const across = requiredNumber('holes', 'across', extra.across);
    const [spanX, spanY] = readVec2('holes', 'apart', extra.apart);
    const { axis, center } = holeAxisAndCenter('holes', target, extra);
    const base = newHoleCorners(docNow(), target.id);
    base.axis = axis;
    base.diameter = num(across, base.id, 'diameter');
    if (extra.deep !== undefined) {
      base.depth = num(requiredNumber('holes', 'deep', extra.deep), base.id, 'depth');
    } else {
      const extent = extentAlong(docNow(), target.id, axis);
      base.depth = extent != null ? extent + 2 : 10;
    }
    base.center = center;
    base.corners = {
      dx: num(spanX, base.id, 'dx') / 2,
      dy: num(spanY, base.id, 'dy') / 2,
    };
    pushFeature(base);
    mutateHandle(target, base);
    return target;
  }

  // ---- hollow ---------------------------------------------------------------

  function hollow(target: unknown, opts?: unknown): SolidHandle {
    if (!isHandle(target)) throw new Error('hollow() needs a shape: hollow(shape, { wall: 2 }).');
    const extra = readOptions('hollow', ['wall', 'open'], opts);
    if (extra.wall === undefined) throw new Error('hollow() needs { wall: <number> } for the wall thickness.');
    const wall = requiredNumber('hollow', 'wall', extra.wall);
    let open: TopoName | undefined;
    if (extra.open !== undefined) {
      const part = facePart('hollow', extra.open, false);
      open = { cause: 'primitive', feature: target.rootId, kind: 'face', part };
    }
    const base = newShell(docNow(), target.id, open);
    base.thickness = num(wall, base.id, 'thickness');
    pushFeature(base);
    mutateHandle(target, base);
    return target;
  }

  // ---- round / bevel ----------------------------------------------------

  function round(arg: unknown, size: unknown): SolidHandle {
    const s = requiredNumber('round', 'size', size);
    if (isTopoRef(arg)) {
      if (arg.name.cause !== 'between') {
        throw new Error('round() on a single reference needs an edge -- try round(shape.edge(faceA, faceB), size).');
      }
      const owner = arg.owner;
      const id = nextId(docNow(), 'round');
      const f: FilletFeature = { id, kind: 'fillet', target: owner.id, edge: arg.name, size: num(s, id, 'size'), style: 'fillet' };
      pushFeature(f);
      mutateHandle(owner, f);
      return owner;
    }
    if (!isHandle(arg)) throw new Error('round() needs a shape or an edge (shape.edge(a, b)) to round.');
    const f = findFeature(arg.id);
    if (!isRoundable(f)) {
      throw new Error(whyCannotRound(f) ?? 'Rounding does not work on this shape.');
    }
    const next = { ...f, round: num(s, arg.id, 'round'), roundStyle: 'fillet' as const };
    replaceFeature(arg.id, next);
    arg.kind = next.kind;
    return arg;
  }

  function bevel(arg: unknown, size: unknown): SolidHandle {
    if (!isTopoRef(arg) || arg.name.cause !== 'between') {
      throw new Error('bevel() needs one edge -- try bevel(shape.edge(faceA, faceB), size).');
    }
    const s = requiredNumber('bevel', 'size', size);
    const owner = arg.owner;
    const id = nextId(docNow(), 'bevel');
    const f: FilletFeature = { id, kind: 'fillet', target: owner.id, edge: arg.name, size: num(s, id, 'size'), style: 'chamfer' };
    pushFeature(f);
    mutateHandle(owner, f);
    return owner;
  }

  // ---- repeat / repeatAround -------------------------------------------

  function repeat(target: unknown, opts?: unknown): SolidHandle {
    if (!isHandle(target)) throw new Error('repeat() needs a shape: repeat(shape, { count: 3, step: 60 }).');
    const extra = readOptions('repeat', ['count', 'step'], opts);
    if (extra.count === undefined) throw new Error('repeat() needs { count: <number> }.');
    const count = requiredNumber('repeat', 'count', extra.count);
    const base = newPattern(docNow(), target.id, 'linear');
    base.count = Math.max(1, Math.round(num(count, base.id, 'count')));
    if (extra.step !== undefined) {
      if (typeof extra.step === 'number' || extra.step instanceof Number) {
        base.step = [num(extra.step, base.id, 'stepx'), 0, 0];
      } else {
        base.step = readVec3('repeat', 'step', extra.step);
      }
    }
    pushFeature(base);
    mutateHandle(target, base);
    return target;
  }

  function repeatAround(target: unknown, opts?: unknown): SolidHandle {
    if (!isHandle(target)) throw new Error('repeatAround() needs a shape: repeatAround(shape, { count: 6, axis: "z" }).');
    const extra = readOptions('repeatAround', ['count', 'axis', 'angle'], opts);
    if (extra.count === undefined) throw new Error('repeatAround() needs { count: <number> }.');
    const count = requiredNumber('repeatAround', 'count', extra.count);
    const base = newPattern(docNow(), target.id, 'circular');
    base.count = Math.max(1, Math.round(num(count, base.id, 'count')));
    if (extra.axis !== undefined) {
      if (extra.axis !== 'x' && extra.axis !== 'y' && extra.axis !== 'z') {
        throw new Error(`repeatAround()'s "axis" has to be 'x', 'y' or 'z'. You gave it ${describe(extra.axis)}.`);
      }
      base.axis = extra.axis;
    }
    if (extra.angle !== undefined) {
      base.totalAngle = num(requiredNumber('repeatAround', 'angle', extra.angle), base.id, 'totalangle');
    }
    const f = findFeature(target.id);
    const why = whyCannotOrbit(f, base.axis ?? 'z');
    if (why) throw new Error(why);
    pushFeature(base);
    mutateHandle(target, base);
    return target;
  }

  // ---- mirror / move / turn -----------------------------------------------

  const MIRROR_WORD: Record<string, SketchPlane> = {
    'left-right': 'yz',
    'front-back': 'xz',
    'top-bottom': 'xy',
  };

  function mirror(target: unknown, word: unknown): SolidHandle {
    if (!isHandle(target)) throw new Error('mirror() needs a shape: mirror(shape, "left-right").');
    if (typeof word !== 'string' || !(word in MIRROR_WORD)) {
      throw new Error(`mirror() needs 'left-right', 'front-back' or 'top-bottom'. You gave it ${describe(word)}.`);
    }
    const f = newMirror(docNow(), target.id, MIRROR_WORD[word]);
    pushFeature(f);
    return makeSolidHandle(f, target.rootId);
  }

  function move(target: unknown, offset: unknown, opts?: unknown): SolidHandle {
    if (!isHandle(target)) throw new Error('move() needs a shape: move(shape, [x, y, z]).');
    const extra = readOptions('move', ['copy'], opts);
    const copy = extra.copy === true;
    const off = readVec3('move', 'offset', offset);
    const base = newMove(docNow(), target.id, copy);
    base.offset = [num(off[0], base.id, 'x'), num(off[1], base.id, 'y'), num(off[2], base.id, 'z')];
    pushFeature(base);
    if (copy) return makeSolidHandle(base, target.rootId);
    mutateHandle(target, base);
    return target;
  }

  function turn(target: unknown, angles: unknown): SolidHandle {
    if (!isHandle(target)) throw new Error('turn() needs a shape: turn(shape, [rx, ry, rz]).');
    const f = findFeature(target.id);
    if (!canRotate(f)) {
      throw new Error(
        `turn() only works on a shape you built directly with a tool like Box or Cylinder -- ` +
          `not on the result of ${f.kind}.`
      );
    }
    const [rx, ry, rz] = readVec3('turn', 'angles', angles);
    const next = { ...f, rotate: [num(rx, target.id, 'rx'), num(ry, target.id, 'ry'), num(rz, target.id, 'rz')] as Vec3 };
    replaceFeature(target.id, next);
    return target;
  }

  // ---- boolean combine ------------------------------------------------

  function combine(fn: string, op: 'union' | 'subtract' | 'intersect', args: unknown[]): SolidHandle {
    if (args.length < 2 || !args.every(isHandle)) {
      throw new Error(`${fn}() needs two or more shapes: ${fn}(a, b).`);
    }
    const handles = args as SolidHandle[];
    const id = nextId(docNow(), 'op');
    const f: Feature = { id, kind: 'combine', op, targets: handles.map((h) => h.id) };
    pushFeature(f);
    return makeSolidHandle(f);
  }
  const join = (...args: unknown[]) => combine('join', 'union', args);
  const cut = (...args: unknown[]) => combine('cut', 'subtract', args);
  const keep = (...args: unknown[]) => combine('keep', 'intersect', args);

  // ---- draft ------------------------------------------------------------

  /** The bounding extreme of a primitive along one axis, in world units --
   *  used to turn a 'from' word into DraftFeature.neutral. Only answerable
   *  for a plain primitive (same scope extentAlong() already has); anything
   *  else falls back to 0, which draft()'s {neutral} escape hatch exists to
   *  override by hand. */
  function primitiveExtreme(id: string, axis: Axis3, dir: 'lo' | 'hi'): number {
    const f = findFeature(id);
    const half = extentAlong(docNow(), id, axis);
    const center =
      f.kind === 'box' || f.kind === 'cylinder' || f.kind === 'sphere' || f.kind === 'cone' || f.kind === 'torus'
        ? f.center[axis === 'x' ? 0 : axis === 'y' ? 1 : 2]
        : 0;
    if (half == null) return 0;
    return dir === 'lo' ? center - half / 2 : center + half / 2;
  }

  function draft(arg: unknown, angle: unknown, opts?: unknown): SolidHandle {
    const a = requiredNumber('draft', 'angle', angle);
    const extra = readOptions('draft', ['from', 'neutral', 'whole'], opts);
    let owner: SolidHandle;
    let face: TopoName | undefined;
    let whole = false;
    if (isTopoRef(arg)) {
      if (arg.name.cause !== 'primitive') throw new Error('draft() needs a flat face -- try draft(shape.face("right"), angle).');
      owner = arg.owner;
      face = arg.name;
    } else if (isHandle(arg)) {
      owner = arg;
      whole = true;
    } else {
      throw new Error('draft() needs a face (shape.face("right")) or a whole shape to draft: draft(shape, angle, { whole: true }).');
    }
    if (extra.whole === true) whole = true;
    let pull: Axis3 = 'z';
    let neutral = 0;
    if (extra.from !== undefined) {
      if (typeof extra.from !== 'string' || !(extra.from in FACE_AXIS)) {
        throw new Error(`draft()'s "from" needs a face word (top, bottom, front, back, left, right). You gave it ${describe(extra.from)}.`);
      }
      pull = FACE_AXIS[extra.from];
      const dir: 'lo' | 'hi' = extra.from === 'bottom' || extra.from === 'front' || extra.from === 'left' ? 'lo' : 'hi';
      neutral = primitiveExtreme(owner.rootId, pull, dir);
    }
    if (extra.neutral !== undefined) neutral = requiredNumber('draft', 'neutral', extra.neutral) as number;
    const id = nextId(docNow(), 'draft');
    const f: DraftFeature = { id, kind: 'draft', target: owner.id, angle: num(a, id, 'angle'), pull, neutral, whole: whole || undefined };
    if (!whole && face) f.face = face;
    pushFeature(f);
    mutateHandle(owner, f);
    return owner;
  }

  // ---- param() ------------------------------------------------------------

  function param(name: unknown, value: unknown, opts?: unknown): number {
    if (typeof name !== 'string' || !name) {
      throw new Error(`param() needs a name first: param("wall", 2). You gave it ${describe(name)}.`);
    }
    if (usedParamNames.has(name)) {
      throw new Error(`param() already used the name "${name}" earlier in this script. Give each one its own name.`);
    }
    const v = requiredNumber('param', 'value', value) as number;
    const extra = readOptions('param', ['min', 'max', 'step', 'caption'], opts);
    usedParamNames.add(name);
    const min = optionalNumber('param', 'min', extra.min) ?? 0;
    const max = optionalNumber('param', 'max', extra.max) ?? Math.max(100, Math.ceil(Math.abs(v) * 4) || 100);
    const step = optionalNumber('param', 'step', extra.step) ?? 1;
    const caption = typeof extra.caption === 'string' ? extra.caption : name;
    namedParams.set(name, { name, caption, value: v, min, max, step });
    return new ParamNumber(v, name) as unknown as number;
  }

  // ---- run it ---------------------------------------------------------

  // Built FROM VOCABULARY, not the other way around (see that constant's own
  // comment) -- a name added to this local object without adding it there
  // would be a DSL call this file can execute but scripts/test-reshape-docs.mjs
  // has no way to count as implemented, which is exactly the drift that
  // constant exists to close.
  const fns: Record<(typeof VOCABULARY)[number], unknown> = {
    box, cylinder, sphere, cone, ring,
    hole, holes, hollow, round, bevel, repeat, repeatAround, mirror, move, turn,
    join, cut, keep, draft,
    sketch, pull, spin, blend,
    param,
  };
  const globals: Record<string, unknown> = fns;
  const names: string[] = [...VOCABULARY];
  const wrapped = `${source}\n//# sourceURL=${SOURCE_NAME}`;

  // INTENTIONAL new Function(). `source` is a STUDENT PROGRAM, not untrusted
  // input to be sanitized -- running arbitrary student JavaScript is this
  // file's entire job, the same job public/reshape/runner.html and
  // runner-brep.html already do for the JSCAD path with a real <script> tag.
  // The safety boundary is where this function is CALLED FROM, not how it
  // evaluates its argument: public/reshape/script-runner.html runs
  // runScript() inside an iframe sandboxed `allow-scripts` WITHOUT
  // `allow-same-origin` (opaque origin, no cookies, no same-origin fetch to
  // /api/*), and lib/reshape-script.ts must NEVER be imported into the main
  // app's own origin to evaluate student text -- see SandboxWorkspace.tsx's
  // comment on why Code -> Build only ever adopts a doc the sandboxed frame
  // already produced, rather than calling this function directly. Nothing
  // here is string-concatenated from a value an attacker chooses; `wrapped`
  // is the source text itself plus one fixed comment.
  const errors: ScriptError[] = [];
  try {
    const fn = new Function(...names, wrapped);
    fn(...names.map((n) => globals[n]));
  } catch (err) {
    errors.push({ message: messageOf(err), line: lineOf(err) });
  }

  const doc = docNow();

  // Value overrides from a slider drag -- applied to the doc the script's
  // own literal defaults produced, via the exact same applyParam() a
  // Build-mode drag already uses. See RunOptions.values's own comment for
  // why this is a doc patch and not a second interpretation of the script.
  let finalDoc = doc;
  if (opts.values) {
    for (const [key, value] of Object.entries(opts.values)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        finalDoc = applyParam(finalDoc, key, value);
      }
    }
  }

  // PARAMS ASSEMBLY. Start from the Build tool's own automatic list (every
  // numeric slot in the doc, correctly captioned and bounded already), then
  // let a script's own param() calls win the caption/bounds for whichever
  // slot they actually filled -- see num()'s comment for how that
  // correlation was recorded. A param() whose value never reached a doc
  // field (used only in a comparison, say) still gets a row of its own,
  // appended at the end, so naming a number is never silently lost.
  const auto = generatedParams(finalDoc);
  const consumedNames = new Set<string>();
  const params: ParamDef[] = auto.map((p) => {
    const overrideName = slotOverrides.get(p.name);
    const named = overrideName ? namedParams.get(overrideName) : undefined;
    if (named) {
      consumedNames.add(named.name);
      return { name: p.name, caption: named.caption, value: p.value, min: named.min, max: named.max, step: named.step };
    }
    return { name: p.name, caption: p.caption, value: p.value, min: p.min, max: p.max, step: p.step };
  });
  for (const def of namedParams.values()) {
    if (!consumedNames.has(def.name)) params.push(def);
  }

  return { doc: finalDoc, params, errors };
}

// ---------------------------------------------------------------------------
// DESIGN DECISIONS worth a reviewer's eye (kept here rather than only in a
// chat message, so the next person to touch this file finds the reasoning
// beside the code it explains):
//
// 1. RunOptions.values patches the doc AFTER the script runs its own literal
//    defaults, rather than threading overrides back into param() so a drag
//    could change which branch of an `if` executes. The spec's "a slider
//    drag re-runs the script with the new value" reads as the more powerful,
//    control-flow-aware version; this file ships the simpler one. Revisit if
//    a lesson actually wants a param to gate which STEPS exist, not just
//    their numbers.
// 2. cone() takes two arguments (across, tall), not the spec's three --
//    ConeFeature has no field for a flat top radius. See cone()'s own
//    comment.
// 3. holes()'s `apart` is read as full corner-to-corner spacing and halved
//    into HoleFeature.corners' dx/dy (which the doc already defines as
//    half-spacings) -- not passed through directly.
// 4. sk.round()/sk.chamfer() are not in the spec's Language section. Without
//    them, a sketch with a rounded or chamfered corner (which SketchFeature
//    already supports, and the Rules panel already exposes) has no way to
//    reach that state from a script at all -- so this file adds the two
//    names rather than leave a real Build-mode capability unreachable from
//    Code. Flagged as an addition, not a spec deviation.
// 5. draft()'s {from} word is turned into a pull axis and a neutral value by
//    reading the target's own bounding box (see primitiveExtreme()) --
//    DraftFeature.neutral has no generatedParams() slider today, so nothing
//    else in the app derives it this way yet. A {neutral: N} escape hatch is
//    added alongside {from} so any doc (not only ones whose neutral sits
//    exactly on a bounding-box extreme) still round-trips through toScript().
// ---------------------------------------------------------------------------
