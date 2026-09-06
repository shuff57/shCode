// Runs scripts/sketch-solve-assertions.cjs against packages/sketch's
// sketch-solve.ts (moved from lib/sketch-solve.ts in the B1 extraction,
// plan: freecad-browser.md -- see scripts/_pkg-load.mjs for why).

import { loadModules } from './_pkg-load.mjs';
import { createRequire } from 'module';

const { out } = loadModules(['sketch-solve']);
const require = createRequire(import.meta.url);
const ok = require('./sketch-solve-assertions.cjs')(out.replace(/\\/g, '/'));
if (!ok) process.exit(1);
