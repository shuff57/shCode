// Runs scripts/sketch-arc-assertions.cjs against packages/sketch's
// sketch-arc.ts (moved from lib/sketch-arc.ts in the B1 extraction, plan:
// freecad-browser.md -- see scripts/_pkg-load.mjs for why).

import { loadModules } from './_pkg-load.mjs';
import { createRequire } from 'module';

const { out } = loadModules(['sketch-arc']);
const require = createRequire(import.meta.url);
const ok = require('./sketch-arc-assertions.cjs')(out.replace(/\\/g, '/'));
if (!ok) process.exit(1);
