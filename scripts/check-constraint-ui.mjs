#!/usr/bin/env node
// Every constraint the solver honours must have a control a student can reach.
//
// `equal` was declared in lib/sketch-solve.ts, solved by solve(), scored by
// residualOf(), described by describe() -- and marked shipped -- while having
// no control anywhere in the Rules panel. It could not be created, seen, or
// removed. Nothing failed, because nothing was asking; the solver half and the
// UI half were each complete on their own terms.
//
// So this is the same shape as check-sketch-movers.mjs: a census, not a rule
// about geometry. It reads the Constraint union out of the solver and requires
// each kind to appear in the panel that is supposed to offer it.
//
// It is a tripwire, not a proof. It cannot tell a working button from a
// disabled one, and it deliberately strips comments first -- a kind named only
// in prose is exactly the false pass this exists to catch.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

// Comments are not controls. Strip them before looking for anything, or a
// why-comment mentioning a kind counts as offering it.
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

// Moved to reshape-cad's packages/sketch and packages/studio (B1 extraction,
// plan: freecad-browser.md) -- read from there now, one level up.
const SOLVER = '../reshape-cad/packages/sketch/src/sketch-solve.ts';
const PANEL = '../reshape-cad/packages/studio/src/model/SketchConstraints.tsx';

// `;\s*$` and not `;\n` -- this repo's files are CRLF on Windows checkouts,
// and a \n-anchored match here failed to find a union that was sitting right
// there. The self-check below is the only reason that surfaced as a FAIL
// rather than as an empty kind list quietly passing.
const union = read(SOLVER).match(/export type Constraint =([\s\S]*?);\s*$/m);
if (!union) {
  console.error(`\nFAIL  could not find the Constraint union in ${SOLVER}.`);
  process.exit(1);
}
// [A-Za-z] and not [a-z] -- P1d added `distanceX` and `distanceY`, and a
// lowercase-only class does not match a camelCase kind. This did not fail
// loudly: it captured the leading `distance` off each, found no 'distance'
// control, and still reported only symmetric and angle -- because `distanceX`
// was never in the list to be missing FROM. So the check ran, failed for a
// real reason, and was silently not looking at two of the eleven kinds it
// exists to census. Measured 2026-09-09: [a-z]+ yields 9, [A-Za-z]+ yields 11.
const kinds = [...union[1].matchAll(/kind:\s*'([A-Za-z]+)'/g)].map((m) => m[1]);

// A census that found nothing is a census that is not looking.
//
// The floor is the union's ACTUAL size, not a round number safely under it.
// At 5 this guard was satisfied by 9 of 11 and never fired on the camelCase
// miss above -- a tripwire set low enough to step over. Raise it whenever the
// union grows; a failure here means the parse broke, not that the union did.
const EXPECTED_KINDS = 11;
if (kinds.length < EXPECTED_KINDS) {
  console.error(
    `\nFAIL  only parsed ${kinds.length} constraint kind(s) out of ${SOLVER}, `
    + `expected ${EXPECTED_KINDS}.\n`
    + 'Either this parse has stopped matching -- so the check is passing\n'
    + 'without looking at everything -- or the union really did shrink, in\n'
    + 'which case lower EXPECTED_KINDS deliberately and say why.\n');
  process.exit(1);
}

const panel = stripComments(read(PANEL));
const missing = kinds.filter((k) => !panel.includes(`'${k}'`));

if (missing.length) {
  console.error(
    `\nFAIL  ${missing.length} constraint kind(s) the solver honours have no control\n`
    + `in ${PANEL}:\n`
    + missing.map((k) => `        ${k}`).join('\n')
    + '\n\nA student cannot create, see, or remove one. Either give it a control\n'
    + `or take it out of the Constraint union in ${SOLVER}.\n`);
  process.exit(1);
}

console.log(`constraint UI: ${kinds.length} solver kinds, all reachable from the Rules panel`);
