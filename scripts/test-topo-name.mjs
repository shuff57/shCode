// Runs scripts/topo-name-assertions.cjs against packages/script's
// topo-name.ts (moved from lib/topo-name.ts in the B1 extraction, plan:
// freecad-browser.md -- see scripts/_pkg-load.mjs for why).

import { loadModules } from './_pkg-load.mjs';
import { createRequire } from 'module';

const { out } = loadModules(['topo-name']);
const require = createRequire(import.meta.url);
const ok = require('./topo-name-assertions.cjs')(out.replace(/\\/g, '/'));
if (!ok) process.exit(1);
