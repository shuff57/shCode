// Copy shallot's prebuilt wasm artifacts into shCode/public/shplay/
// so they're served by Cloudflare Pages as static assets.
//
// Run after `wasm-pack build` and `cargo build` (in shallot repo) have
// produced the `pkg/` outputs.
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const out = resolve(root, '../public/shplay');

const sources = [
  resolve(root, '../../shallot/packages/shallot/rust/transforms/pkg'),
  resolve(root, '../../shallot/packages/shallot/rust/audio/pkg'),
];

await mkdir(out, { recursive: true });

for (const src of sources) {
  const files = await readdir(src);
  for (const f of files) {
    if (!/\.(wasm|js|d\.ts)$/.test(f)) continue;
    if (f === 'package.json') continue;
    await copyFile(resolve(src, f), resolve(out, f));
    console.log(`vendored ${f}`);
  }
}
