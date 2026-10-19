// Lets plain Node (22+, which strips TypeScript types on its own) import this
// repo's extensionless relative TypeScript imports, e.g. `from './attempt-cap'`.
// Bun and the bundlers resolve those natively; Node's ESM resolver does not.
// Wired in through `node-options` in .npmrc, so every `npm run` script gets it.
// It only acts after Node's own resolution has failed, so it cannot change
// what an already-resolvable import means.
import { register } from 'node:module';

register('./ts-resolve-hook.mjs', import.meta.url);
