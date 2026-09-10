// Runs scripts/camera-fit-assertions.cjs against packages/studio's
// camera-fit.ts (moved from lib/camera-fit.ts in the B1 extraction, plan:
// freecad-browser.md -- see scripts/_pkg-load.mjs for why).

import { loadModules } from './_pkg-load.mjs';
import { createRequire } from 'module';

const { out } = loadModules(['camera-fit']);
const require = createRequire(import.meta.url);
const ok = require('./camera-fit-assertions.cjs')(out.replace(/\\/g, '/'));
if (!ok) process.exit(1);
