// Runs scripts/sketch-outline-assertions.cjs against the sketch libraries
// (moved to reshape-cad's packages/sketch and packages/script in the B1
// extraction, plan: freecad-browser.md -- see scripts/_pkg-load.mjs for
// why). Same file set as test-model-codegen.mjs, with sketch-outline.ts and
// sketch-solve.ts added: this suite is about which points a MOVER is
// allowed to touch, and the drag handles are one of the three movers it
// covers.

import { loadModulesAsync } from './_pkg-load.mjs';
import { createRequire } from 'module';

const { load } = await loadModulesAsync([
  'model-types', 'model-codegen', 'model-handles', 'sketch-outline', 'sketch-arc', 'sketch-solve', 'topo-name',
]);
const require = createRequire(import.meta.url);
const ok = await require('./sketch-outline-assertions.cjs')(load);
if (!ok) process.exit(1);
