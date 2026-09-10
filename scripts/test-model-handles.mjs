// Runs scripts/model-handles-assertions.cjs against packages/script's
// model-handles.ts (moved from lib/model-handles.ts in the B1 extraction,
// plan: freecad-browser.md -- see scripts/_pkg-load.mjs for why).
// model-handles.ts imports from both model-types.ts (script package) and
// sketch-arc.ts (sketch package).

import { loadModulesAsync } from './_pkg-load.mjs';
import { createRequire } from 'module';

const { load } = await loadModulesAsync(['model-types', 'sketch-arc', 'model-handles', 'topo-name']);
const require = createRequire(import.meta.url);
const ok = await require('./model-handles-assertions.cjs')(load);
if (!ok) process.exit(1);
