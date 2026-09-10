// Runs scripts/model-types-assertions.cjs against packages/script's
// model-types.ts (moved from lib/model-types.ts in the B1 extraction, plan:
// freecad-browser.md -- see scripts/_pkg-load.mjs for why). model-types.ts
// imports (real, runtime) from sketch-arc.ts (sketch package) and
// topo-name.ts (script package), pulled in transitively.

import { loadModulesAsync } from './_pkg-load.mjs';
import { createRequire } from 'module';

const { load } = await loadModulesAsync(['model-types', 'sketch-arc', 'topo-name']);
const require = createRequire(import.meta.url);
const ok = await require('./model-types-assertions.cjs')(load);
if (!ok) process.exit(1);
