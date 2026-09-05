#!/usr/bin/env node
// Who is allowed to write a sketch's points, and who is allowed to write its
// bulges.
//
// The bug this file guards has now worn four faces. Each time, some piece of
// code that had every right to move a CORNER also moved an arc's TRIM POINT,
// because the two were sitting in the same array and nothing said they were
// different: addCorner halved an arc's radius, filletCorner rescaled its
// neighbour's, a drag handle took an r=8 fillet to r=28, and one length rule
// on the straight edge next door took it to 6.32 in the same click that
// created it. Fixing them one at a time is a losing game. There is always a
// fourth, and the fourth is the one nobody measured.
//
// So this is a census, not a rule about geometry. It enumerates every place in
// lib/ and components/ that builds an object carrying `points` or `bulges` on
// top of an existing feature, and requires each one to be a function that is
// SUPPOSED to own that. A new one shows up as a name this file has never heard
// of, and the fix is to think about whether it should exist rather than to add
// it to the list.
//
// It cannot see through a shell heredoc, an eval, or a helper that takes an
// index and mutates in place. It is a tripwire on the shape the bug actually
// took every time so far, which is a plain object literal in a return.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// file -> function -> why it is allowed to write this.
const SANCTIONED = {
  // The script runtime never moves a point. sk.rect(), sk.circle() and
  // sk.polygon() describe a sketch from scratch: they write the whole points
  // array AND reset rounds, chamfers and bulges in the same replaceFeature()
  // call, so no key can describe a point that has since moved. sk.round() and
  // sk.chamfer() then go through filletCorner/chamferCorner like the Rules
  // panel does.
  'lib/reshape-script.ts': {
    runScript: 'replaces a sketch whole (points + rounds + chamfers + bulges together); never moves a point under a key',
  },
  'lib/sketch-arc.ts': {
    splitEdge: 'owns the split, including dividing an arc into two arcs that retrace it',
    filletCorner: 'builds the trim points and the arc; the one place they are constructed',
    chamferCorner: 'builds the trim points and the straight edge; the slice counterpart of filletCorner',
    reindex: 'shifts keys past a seam and never touches a value or a coordinate',
    outlineOf: 'derives the outline from the design; the only producer of an arc endpoint',
    // The answer this file demands, written down. bowEdge writes ONE bulge key
    // and never a point, so no arc endpoint moves: the endpoints of a bowed
    // edge are the two design corners that were already there, and they stay
    // exactly where they were. `rounds` and `chamfers` are untouched, and the
    // ceiling (half the chord, |bulge| = 1) is applied in bulgeFromBow before
    // the write. The interaction the other four faces had -- a mover shifting
    // a point out from under a key that describes it -- cannot arise here,
    // because bowEdge moves nothing.
    bowEdge: 'sets one edge bulge from a bow distance; writes no point, so no arc endpoint moves',
    // The answer for the one that really does splice `points`. Removing corner
    // k merges the two edges beside it, so every key alongside is decided
    // explicitly rather than left to shift and hope:
    //   - rounds/chamfers are keyed by CORNER: k's own entry goes with the
    //     corner it described, everything above slides down one.
    //   - bulges are keyed by EDGE, and the two merging edges are DROPPED
    //     rather than merged -- one edge cannot retrace two different arcs,
    //     and keeping either would silently redraw the shape. An arc on any
    //     other edge slides down and is otherwise untouched.
    //   - constraints naming k, or either merging edge, are dropped; a length
    //     rule that survived onto the merged edge would be about a longer edge
    //     than the one it was written for and would yank the sketch on the
    //     next solve.
    // The round-trip is measured, not asserted: splitEdge then removeCorner
    // restores the tessellated area exactly (sketch-arc-assertions.cjs).
    removeCorner: 'splices one design corner out and merges the two edges beside it, deciding every corner- and edge-keyed field explicitly',
  },
  'lib/model-codegen.ts': {
    applyParam: 'writes a DESIGN corner from a drag handle or a typed dimension',
    solveDoc: 'writes DESIGN corners the constraint solver moved, gated by outlineOf',
  },
  'lib/model-types.ts': {
    // newSketch/newCircleSketch build a feature from nothing; there is no
    // existing outline for them to damage.
  },
  'components/model/ModelEditor.tsx': {
    // Item L: setConstraints() seeds a solve to check a new between-edges
    // rule would not collapse the sketch, then has to commit THOSE points
    // (not just the constraint) or solveDoc()'s own later unseeded re-solve
    // is free to land somewhere worse. Pulled into this named function
    // specifically so this census could name it instead of misattributing
    // the write to whichever unrelated top-level component happened to sit
    // above setConstraints() in the file.
    //
    // The answer this file demands: a constraint solve moves points, but
    // never reorders or removes a corner, splits an edge, or merges two --
    // so every round/chamfer (keyed by CORNER) and bulge (keyed by EDGE)
    // carries over UNCHANGED, still describing the same corner/edge it
    // always did. If a moved corner's round no longer fits the shorter
    // edges now beside it, outlineOf() already clamps that at render/build
    // time, the same path a handle drag or a typed Length goes through --
    // this function does not need its own copy of that clamp.
    commitSettledPoints: 'writes a constraint solve\'s own points alongside the new constraints that required it; rounds/chamfers/bulges are untouched and stay keyed to the same corners/edges, clamped downstream by outlineOf if a round no longer fits',
  },
};

// An object literal that spreads something and also carries points or bulges.
// [^{}]*? so it can span lines without running through a nested object -- the
// shape every offender so far has had is a one-line return.
const WRITE = /\{\s*\.\.\.[A-Za-z_$][\w$]*[^{}]*?\b(points|bulges)\b\s*[,}:]/g;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

// Nearest TOP-LEVEL declaration above the match. Anchored at column 0 on
// purpose: an indented `const points = ...` a line above the write is a local
// variable, and letting it win names every offender "points()" -- which reads
// like a function nobody wrote and hides which function actually did it.
const DECL = /(?:^|\n)(?:export\s+)?(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*[:=])/g;

function enclosing(src, at) {
  let name = '(top level)';
  DECL.lastIndex = 0;
  let m;
  while ((m = DECL.exec(src)) && m.index < at) name = m[1] ?? m[2];
  return name;
}

const problems = [];
let sites = 0;
let probes = 0;

for (const file of [...walk(path.join(root, 'lib')), ...walk(path.join(root, 'components'))]) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const src = readFileSync(file, 'utf8');
  // Diagram/quiz/grader files have their own unrelated `points`; only sketch
  // geometry is in scope, and it all flows through these three field names.
  if (!/SketchLike|SketchFeature|kind: 'sketch'|kind === 'sketch'/.test(src)) continue;

  WRITE.lastIndex = 0;
  let m;
  while ((m = WRITE.exec(src))) {
    // outlineOf({ ...f, points }) is a PROBE: it asks what the outline would
    // be and cannot write anything. Allowed anywhere, which is what lets the
    // gate be called from a UI file without that file joining the list.
    if (src.slice(Math.max(0, m.index - 11), m.index).endsWith('outlineOf(')) {
      probes++;
      continue;
    }
    sites++;
    const fn = enclosing(src, m.index);
    const line = src.slice(0, m.index).split('\n').length;
    if (!(SANCTIONED[rel] && fn in SANCTIONED[rel])) {
      problems.push(`${rel}:${line}  ${fn}()  writes ${m[1]} onto an existing sketch`);
    }
  }
}

if (problems.length) {
  console.error('\nFAIL  a sketch mover this file has never heard of:\n');
  for (const p of problems) console.error('  ' + p);
  console.error(
    '\nAn arc\'s endpoints belong to the arc. If this really does need to move a\n'
    + 'sketch\'s points, it has to answer what happens to the rounds and bulges\n'
    + 'keyed alongside them -- and then be added here with that answer written\n'
    + 'down. Adding it to the list without the answer is how face number five\n'
    + 'ships.\n');
  process.exit(1);
}

// A census that found nothing is a census that is not looking. There are six
// sanctioned sites today; if that drops to zero the regex has stopped matching
// and this file is a no-op that reports success.
if (sites < 4) {
  console.error(
    `\nFAIL  the census matched only ${sites} write site(s). The sanctioned movers in\n`
    + 'lib/sketch-arc.ts and lib/model-codegen.ts have not gone away, so the pattern\n'
    + 'has stopped matching and this check is passing without looking at anything.\n');
  process.exit(1);
}

console.log(
  `sketch movers: ${sites} write site(s), all sanctioned; ${probes} read-only outlineOf probe(s)`);
