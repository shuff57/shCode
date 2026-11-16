// Use the tracked host/UI snapshot locally, with the exact pinned engine originals.
// Production builds omit these oversized files and serve them through the R2 route.
import { access, mkdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { SOLIDCRAFT_ASSETS } from '../functions/_shared/solidcraft-runtime.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cad = path.resolve(process.env.RESHAPE_CAD_DIR || path.join(root, '../reshape-cad'));
const web = path.resolve(process.env.SOLIDCRAFT_WEB_DIR || path.join(os.homedir(), '.cache/solidcraft-0.30.1/src/dist/web'));
const entries = SOLIDCRAFT_ASSETS.map(asset => [asset.path, asset.path.startsWith('kernel/')
  ? path.join(cad, 'packages/solidcraft-host/kernel/dist', path.basename(asset.path))
  : path.join(web, path.basename(asset.path))]);
for (const [, source] of entries) await access(source);
await import('./stage-solidcraft-preview.mjs');
for (const [name, source] of entries) {
  const dest = path.join(root, 'public/solidcraft-preview', name);
  await mkdir(path.dirname(dest), { recursive: true });
  await symlink(source, dest, 'file');
}
console.log('Local CAD UI ready: /sandbox/cad/ (start shCode dev server as usual).');
