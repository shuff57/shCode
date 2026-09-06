// Runs scripts/model-check-assertions.cjs against packages/script's
// model-check.ts (moved from lib/model-check.ts in the B1 extraction, plan:
// freecad-browser.md -- see scripts/_pkg-load.mjs for why). model-check.ts
// imports (real, runtime) from model-types.ts, which tsc pulls in
// transitively -- no need to list it explicitly.

import { loadModulesAsync } from './_pkg-load.mjs';
import { createRequire } from 'module';

const { load } = await loadModulesAsync(['model-check', 'model-types', 'topo-name']);
const require = createRequire(import.meta.url);
const ok = await require('./model-check-assertions.cjs')(load);
if (!ok) process.exit(1);
