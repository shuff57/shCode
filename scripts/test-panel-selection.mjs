// Runs scripts/panel-selection-assertions.cjs against packages/script's
// model-selection.ts (moved from lib/model-selection.ts in the B1
// extraction, plan: freecad-browser.md -- see scripts/_pkg-load.mjs for
// why). model-selection.ts imports ModelDoc (type-only, model-types.ts) and
// rootFeature()/TopoName (topo-name.ts, real runtime).

import { loadModulesAsync } from './_pkg-load.mjs';
import { createRequire } from 'module';

const { load } = await loadModulesAsync(['model-types', 'topo-name', 'model-selection', 'sketch-arc']);
const require = createRequire(import.meta.url);
const ok = await require('./panel-selection-assertions.cjs')(load);
if (!ok) process.exit(1);
