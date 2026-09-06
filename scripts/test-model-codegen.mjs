// Runs scripts/model-codegen-assertions.cjs against packages/script's
// model-types.ts + model-codegen.ts (moved from lib/ in the B1 extraction,
// plan: freecad-browser.md -- see scripts/_pkg-load.mjs for why).

import { loadModulesAsync } from './_pkg-load.mjs';
import { createRequire } from 'module';

const { load } = await loadModulesAsync(['model-types', 'model-codegen', 'sketch-arc', 'topo-name']);
const require = createRequire(import.meta.url);
const ok = await require('./model-codegen-assertions.cjs')(load);
if (!ok) process.exit(1);
