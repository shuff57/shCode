// The preview runners execute their student code from inside one long IIFE.
// A `var x = <value>` sitting BELOW that call runs at its own position — after
// render() has already assigned x — and silently wipes live state.
//
// It has cost two real bugs in public/reshape/runner.html:
//   swapGeometry   — a parameter change rebuilt geometry that never reached the
//                    screen, because the hook render() installed was set back
//                    to null a few lines later.
//   projectAnchors — same shape, but the null was then CALLED inside the
//                    requestAnimationFrame loop. The loop threw, rendering
//                    stopped, and the symptom was "the slider does nothing" —
//                    nothing pointing at handles at all.
//
// Neither was caught by a test until well after the fact; both were found by
// chasing an unrelated symptom. So this is a static check instead: the run goes
// last, and nothing may be initialised after it.
//
// Function DECLARATIONS after the run are fine — they hoist whole. Only
// initialised `var`/`let`/`const` are a problem.

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FILES = [
  { file: 'public/reshape/runner.html', runMarker: /^\tstatusEl\.textContent = 'Running your code/m },
];

let failed = 0;

for (const { file, runMarker } of FILES) {
  // Normalise on read: a CRLF checkout must not change what this sees.
  const src = readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
  const m = src.match(runMarker);

  if (!m) {
    console.log(`  FAIL  ${file}: could not find where the run starts`);
    console.log('        (the marker moved — fix this check, do not delete it)');
    failed++;
    continue;
  }

  const runsAt = m.index;
  const after = src.slice(runsAt);
  const lineOf = (i) => src.slice(0, runsAt + i).split('\n').length;

  // One indent level = inside the IIFE. Deeper is inside a function that
  // has not been called yet, which is harmless.
  // `var result;` carries no initialiser, so the regex passes over it already.
  // Nothing else is excused: an offender sitting immediately after the run is
  // the most likely one, not the least.
  const offenders = [...after.matchAll(/^\tvar\s+([A-Za-z_$][\w$]*)\s*=/gm)]
    .map((x) => ({ name: x[1], line: lineOf(x.index) }));

  if (offenders.length) {
    console.log(`  FAIL  ${file}: initialised after the run at line ${lineOf(0)}`);
    for (const o of offenders) {
      console.log(`        line ${o.line}: var ${o.name} = ...  (wipes whatever render() set)`);
    }
    console.log('        Move the declaration above the run, or move the run lower.');
    failed++;
  } else {
    console.log(`  PASS  ${file}: nothing is initialised after the run`);
  }
}

console.log(failed ? `\nFAIL  (${failed} file(s))` : '\nALL PASS  (runner hoisting)');
process.exit(failed ? 1 : 0);
