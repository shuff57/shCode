// Runs scripts/least-squares-assertions.cjs against packages/sketch's
// least-squares.ts (moved from lib/least-squares.ts in the B1 extraction,
// plan: freecad-browser.md -- see scripts/_pkg-load.mjs for why).

import { loadModules } from './_pkg-load.mjs';
import { createRequire } from 'module';

const { out } = loadModules(['least-squares']);
const require = createRequire(import.meta.url);
const ok = require('./least-squares-assertions.cjs')(out.replace(/\\/g, '/'));
if (!ok) process.exit(1);
