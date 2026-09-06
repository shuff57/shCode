// Runs scripts/model-deps-assertions.cjs against packages/script's
// model-deps.ts (moved from lib/model-deps.ts in the B1 extraction, plan:
// freecad-browser.md -- see scripts/_pkg-load.mjs for why).

import { loadModulesAsync } from './_pkg-load.mjs';
import { createRequire } from 'module';

const { load } = await loadModulesAsync(['model-deps', 'model-types', 'topo-name']);
const require = createRequire(import.meta.url);
const ok = await require('./model-deps-assertions.cjs')(load);
if (!ok) process.exit(1);
