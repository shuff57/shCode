// Runs scripts/format-number-assertions.cjs against packages/studio's
// format-number.ts (moved from lib/format-number.ts in the B1 extraction,
// plan: freecad-browser.md -- see scripts/_pkg-load.mjs for why).

import { loadModules } from './_pkg-load.mjs';
import { createRequire } from 'module';

const { out } = loadModules(['format-number']);
const require = createRequire(import.meta.url);
const ok = require('./format-number-assertions.cjs')(out.replace(/\\/g, '/'));
if (!ok) process.exit(1);
