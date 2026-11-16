// Deployment step: upload only the verified, pinned WASM engines. Static files are staged by prebuild.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { SOLIDCRAFT_ASSETS } from '../functions/_shared/solidcraft-runtime.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cad = path.resolve(process.env.RESHAPE_CAD_DIR || path.join(root, '../reshape-cad'));
const web = path.resolve(process.env.SOLIDCRAFT_WEB_DIR || path.join(os.homedir(), '.cache/solidcraft-0.30.1/src/dist/web'));
const sources = SOLIDCRAFT_ASSETS.map(asset => ({
  ...asset,
  file: asset.path.startsWith('kernel/')
    ? path.join(cad, 'packages/solidcraft-host/kernel/dist', path.basename(asset.path))
    : path.join(web, path.basename(asset.path)),
}));
for (const asset of sources) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(asset.file)) hash.update(chunk);
  if ((await stat(asset.file)).size !== asset.size || hash.digest('hex') !== asset.sha256) {
    throw new Error(`Refusing to upload ${asset.path}: it differs from the pinned engine.`);
  }
  console.log(`[solidcraft] Verified ${asset.path} (${asset.size} bytes).`);
}
if (!process.argv.includes('--remote')) {
  console.log('[solidcraft] Check only. Add --remote to upload the verified engines to production R2.');
} else {
  for (const asset of sources) {
    const result = spawnSync(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'),
      'r2', 'object', 'put', `shcode-uploads/${asset.key}`, '--file', asset.file,
      '--content-type', 'application/wasm', '--remote'], { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
