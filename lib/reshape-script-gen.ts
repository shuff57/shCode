// ModelDoc -> reSHape Script source. The Code-mode twin of toReshape() in
// lib/model-codegen.ts, and the other half of lib/reshape-script.ts's
// contract: runScript(toScript(doc)).doc must equal doc up to ids and
// defaults (see that file's own header, and scripts/test-reshape-script.mjs,
// which pins this against every fixture in scripts/oracle-measure.mjs).
//
// ONE LINE PER FEATURE, in doc order -- same rule toReshape() follows, for
// the same reason: a script is the Build timeline written down, so its shape
// on the page should mirror the timeline's own shape.
//
// THE HARD PART IS NOT THE ARITHMETIC, IT IS THE VARIABLE. A Build-mode doc
// names its OWN targets by feature id (`hole1.target === 'box1'`), but a
// script variable that has been drilled, hollowed, rounded or repeated keeps
// its ORIGINAL name and simply points at a different row afterwards -- see
// lib/reshape-script.ts's SolidHandle comment for why. So before any code is
// emitted, chainVar() below walks the doc once and decides, for every
// feature id, which script VARIABLE currently represents it: a fresh
// primitive, sketch, boolean, mirror or move-with-copy gets a new one; a
// hole, hollow, one-edge round or bevel, draft, repeat or plain move
// (consuming, per lib/model-types.ts's topLevel()) inherits its target's.

import {
  type ModelDoc,
  type SketchFeature,
  newShape,
  newSketch,
  extentAlong,
} from './model-types';
import type { TopoName } from './topo-name';

function lit(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const r = Math.round(n * 1e6) / 1e6;
  return String(r);
}

function litVec(v: readonly number[]): string {
  return `[${v.map(lit).join(', ')}]`;
}

function near(a: number, b: number, tol = 1e-6): boolean {
  return Math.abs(a - b) <= tol;
}

const FACE_WORD: Record<string, string> = {
  '+z': 'top', '-z': 'bottom', '-y': 'front', '+y': 'back', '-x': 'left', '+x': 'right', side: 'side',
};
function faceWord(part: string): string {
  return FACE_WORD[part] ?? part;
}

const MIRROR_WORD: Record<string, string> = { yz: 'left-right', xz: 'front-back', xy: 'top-bottom' };
const PLANE_WORD: Record<string, string> = { xy: 'top', xz: 'front', yz: 'side' };

/** For every feature id, the script variable that currently represents it --
 *  see the file header. Consuming kinds (hole, shell, fillet, draft,
 *  pattern, a copy-less move) inherit their target's variable; everything
 *  else -- including extrude/revolve, whose target is a SKETCH, a different
 *  handle type that is never chain-mutated -- gets its own. */
function chainVars(doc: ModelDoc): Map<string, string> {
  const varOf = new Map<string, string>();
  for (const f of doc.features) {
    const inherits =
      f.kind === 'hole' || f.kind === 'shell' || f.kind === 'fillet' || f.kind === 'draft' ||
      f.kind === 'pattern' || (f.kind === 'move' && !f.copy);
    if (inherits && 'target' in f) {
      varOf.set(f.id, varOf.get(f.target) ?? f.target);
    } else {
      varOf.set(f.id, f.id);
    }
  }
  return varOf;
}

/** Would newShape() have centred a fresh primitive of this kind here on its
 *  own, given only the features already emitted? Mirrors the auto-placement
 *  lib/model-types.ts's newShape() already does, so the generated script
 *  only writes `{ at: [...] }` when the student's own doc actually needed a
 *  non-default position -- see box()'s call site below. */
function defaultCenter(doc: ModelDoc, upTo: number, kind: 'box' | 'cylinder' | 'cone' | 'torus' | 'sphere') {
  // newShape() always returns one of the five primitive kinds for these
  // `kind` values -- every one of which carries `center` -- but its own
  // return type is the full Feature union (it also builds sketches, whose
  // signature differs), so the cast states what is already true at runtime.
  return (newShape({ version: 1, features: doc.features.slice(0, upTo) }, kind) as { center: readonly number[] }).center;
}

function emitAt(center: readonly number[], def: readonly number[]): string {
  if (center.every((v, i) => near(v, def[i]))) return '';
  return `, { at: ${litVec(center)} }`;
}

/** Draft's `from` word, reversed out of pull + neutral -- try both words that
 *  point along `pull` and keep whichever one's own bounding-box extreme this
 *  target actually sits at. Returns null when neither matches (a hand-set
 *  neutral, or a target this file cannot read a bbox from at all), in which
 *  case the caller falls back to the numeric { neutral } escape hatch. */
function draftFromWord(doc: ModelDoc, rootId: string, pull: 'x' | 'y' | 'z', neutral: number): string | null {
  const AXIS_WORDS: Record<string, [string, string]> = {
    x: ['left', 'right'], y: ['front', 'back'], z: ['bottom', 'top'],
  };
  const [loWord, hiWord] = AXIS_WORDS[pull];
  const f = doc.features.find((x) => x.id === rootId);
  if (!f || !('center' in f)) return null;
  const half = extentAlong(doc, rootId, pull);
  if (half == null) return null;
  const c = (f as { center: readonly number[] }).center[pull === 'x' ? 0 : pull === 'y' ? 1 : 2];
  if (near(neutral, c - half / 2)) return loWord;
  if (near(neutral, c + half / 2)) return hiWord;
  return null;
}

export function toScript(doc: ModelDoc): string {
  const varOf = chainVars(doc);
  const byId = new Map(doc.features.map((f) => [f.id, f]));
  const v = (id: string) => varOf.get(id) ?? id;
  const lines: string[] = [];

  doc.features.forEach((f, i) => {
    if (f.kind === 'box') {
      const def = defaultCenter(doc, i, 'box');
      const at = emitAt(f.center, def);
      lines.push(`const ${f.id} = box(${lit(f.size[0])}, ${lit(f.size[1])}, ${lit(f.size[2])}${at})`);
      if (f.round) lines.push(`round(${f.id}, ${lit(f.round)})`);
      if (f.rotate && f.rotate.some((n) => n !== 0)) lines.push(`turn(${f.id}, ${litVec(f.rotate)})`);
      return;
    }
    if (f.kind === 'cylinder') {
      const def = defaultCenter(doc, i, 'cylinder');
      const at = emitAt(f.center, def);
      lines.push(`const ${f.id} = cylinder(${lit(f.radius * 2)}, ${lit(f.height)}${at})`);
      if (f.round) lines.push(`round(${f.id}, ${lit(f.round)})`);
      if (f.rotate && f.rotate.some((n) => n !== 0)) lines.push(`turn(${f.id}, ${litVec(f.rotate)})`);
      return;
    }
    if (f.kind === 'sphere') {
      const def = defaultCenter(doc, i, 'sphere');
      const at = emitAt(f.center, def);
      lines.push(`const ${f.id} = sphere(${lit(f.radius * 2)}${at})`);
      return;
    }
    if (f.kind === 'cone') {
      const def = defaultCenter(doc, i, 'cone');
      const at = emitAt(f.center, def);
      lines.push(`const ${f.id} = cone(${lit(f.radius * 2)}, ${lit(f.height)}${at})`);
      if (f.rotate && f.rotate.some((n) => n !== 0)) lines.push(`turn(${f.id}, ${litVec(f.rotate)})`);
      return;
    }
    if (f.kind === 'torus') {
      const across = 2 * (f.ringRadius + f.tubeRadius);
      const tubeAcross = 2 * f.tubeRadius;
      const def = defaultCenter(doc, i, 'torus');
      const at = emitAt(f.center, def);
      lines.push(`const ${f.id} = ring(${lit(across)}, ${lit(tubeAcross)}${at})`);
      return;
    }
    if (f.kind === 'sketch') {
      const plane = PLANE_WORD[f.plane] ?? 'top';
      const offsetArg = f.offset !== 0 ? `, ${lit(f.offset)}` : '';
      lines.push(`const ${f.id} = sketch('${plane}'${offsetArg})`);
      const fresh = newSketch({ version: 1, features: [] }, f.plane);
      const isDefault =
        !f.shape && !f.rounds && !f.chamfers && !f.bulges &&
        f.points.length === fresh.points.length &&
        f.points.every((p, k) => near(p[0], fresh.points[k][0]) && near(p[1], fresh.points[k][1]));
      if (isDefault) {
        // Untouched Sketch-tool starter -- nothing more to say.
      } else if (f.shape === 'circle' && f.points.length === 2) {
        const [a, b] = f.points;
        const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
        const across = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const at = near(cx, 0) && near(cy, 0) ? '' : `, { at: [${lit(cx)}, ${lit(cy)}] }`;
        lines.push(`${f.id}.circle(${lit(across)}${at})`);
      } else {
        lines.push(`${f.id}.polygon([${f.points.map((p) => litVec(p)).join(', ')}])`);
        for (const [k, r] of Object.entries(f.rounds ?? {})) {
          if (r > 0) lines.push(`${f.id}.round(${k}, ${lit(r)})`);
        }
        for (const [k, d] of Object.entries(f.chamfers ?? {})) {
          if (d > 0) lines.push(`${f.id}.chamfer(${k}, ${lit(d)})`);
        }
      }
      return;
    }
    if (f.kind === 'extrude') {
      lines.push(`const ${f.id} = pull(${v(f.target)}, ${lit(f.height)})`);
      return;
    }
    if (f.kind === 'revolve') {
      lines.push(`const ${f.id} = spin(${v(f.target)}, ${lit(f.angle)})`);
      return;
    }
    if (f.kind === 'blend') {
      const [loId, hiId] = f.targets;
      const lo = byId.get(loId) as SketchFeature | undefined;
      const hi = byId.get(hiId) as SketchFeature | undefined;
      const gap = (hi?.offset ?? 0) - (lo?.offset ?? 0);
      lines.push(`const ${f.id} = blend(${v(loId)}, ${v(hiId)}, ${lit(gap)})`);
      return;
    }
    if (f.kind === 'combine') {
      const fn = f.op === 'union' ? 'join' : f.op === 'subtract' ? 'cut' : 'keep';
      lines.push(`const ${f.id} = ${fn}(${f.targets.map(v).join(', ')})`);
      return;
    }
    if (f.kind === 'mirror') {
      const word = MIRROR_WORD[f.plane] ?? 'left-right';
      lines.push(`const ${f.id} = mirror(${v(f.target)}, '${word}')`);
      return;
    }
    if (f.kind === 'move') {
      const args = `${v(f.target)}, ${litVec(f.offset)}`;
      if (f.copy) {
        lines.push(`const ${f.id} = move(${args}, { copy: true })`);
      } else {
        lines.push(`move(${args})`);
      }
      return;
    }
    if (f.kind === 'pattern') {
      if (f.mode === 'linear') {
        const step = f.step ?? [0, 0, 0];
        const stepArg = step[1] === 0 && step[2] === 0 ? lit(step[0]) : litVec(step);
        lines.push(`repeat(${v(f.target)}, { count: ${lit(f.count)}, step: ${stepArg} })`);
      } else {
        const angle = f.totalAngle !== undefined && f.totalAngle !== 360 ? `, angle: ${lit(f.totalAngle)}` : '';
        lines.push(`repeatAround(${v(f.target)}, { count: ${lit(f.count)}, axis: '${f.axis ?? 'z'}'${angle} })`);
      }
      return;
    }
    if (f.kind === 'hole') {
      const opts: string[] = [`across: ${lit(f.diameter)}`];
      const extent = extentAlong(doc, f.target, f.axis);
      const throughDepth = extent != null ? extent + 2 : null;
      if (throughDepth == null || !near(f.depth, throughDepth)) opts.push(`deep: ${lit(f.depth)}`);
      if (f.axis !== 'z') opts.push(`along: '${f.axis}'`);
      const [ca, cb] =
        f.axis === 'z' ? [f.center[0], f.center[1]] : f.axis === 'y' ? [f.center[0], f.center[2]] : [f.center[1], f.center[2]];
      if (!near(ca, 0) || !near(cb, 0)) opts.push(`at: [${lit(ca)}, ${lit(cb)}]`);
      if (f.corners) {
        opts.push(`apart: [${lit(f.corners.dx * 2)}, ${lit(f.corners.dy * 2)}]`);
        lines.push(`holes(${v(f.target)}, { ${opts.join(', ')} })`);
      } else {
        lines.push(`hole(${v(f.target)}, { ${opts.join(', ')} })`);
      }
      return;
    }
    if (f.kind === 'shell') {
      const opts: string[] = [`wall: ${lit(f.thickness)}`];
      if (f.open && f.open.cause === 'primitive') opts.push(`open: '${faceWord(f.open.part)}'`);
      lines.push(`hollow(${v(f.target)}, { ${opts.join(', ')} })`);
      return;
    }
    if (f.kind === 'fillet') {
      const edge = f.edge as Extract<TopoName, { cause: 'between' }>;
      const [a, b] = edge.of;
      const wordOf = (n: TopoName) => (n.cause === 'primitive' ? faceWord(n.part) : 'top');
      const ref = `${v(f.target)}.edge('${wordOf(a)}', '${wordOf(b)}')`;
      const fn = f.style === 'chamfer' ? 'bevel' : 'round';
      lines.push(`const ${f.id} = ${fn}(${ref}, ${lit(f.size)})`);
      return;
    }
    if (f.kind === 'draft') {
      const opts: string[] = [];
      if (f.whole) opts.push('whole: true');
      const from = draftFromWord(doc, f.target, f.pull, f.neutral);
      if (from) opts.push(`from: '${from}'`);
      else opts.push(`neutral: ${lit(f.neutral)}`);
      const ref =
        !f.whole && f.face && f.face.cause === 'primitive'
          ? `${v(f.target)}.face('${faceWord(f.face.part)}')`
          : v(f.target);
      lines.push(`const ${f.id} = draft(${ref}, ${lit(f.angle)}, { ${opts.join(', ')} })`);
      return;
    }
  });

  return lines.join('\n') + (lines.length ? '\n' : '');
}
