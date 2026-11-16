// Stage the tracked runtime for a production build, without local-only symlinks or oversized WASM.
import { cp, lstat, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'public/solidcraft-preview');
const current = await lstat(dest).catch(e => { if (e.code !== 'ENOENT') throw e; });
if (current?.isSymbolicLink()) throw new Error('Refusing to replace a symlink at public/solidcraft-preview');
// This gitignored directory is owned by the CAD prepare/stage scripts. rm unlinks children, never their targets.
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
for (const name of ['host.html', 'src', 'pane', 'solidcraft']) {
  await cp(path.join(root, 'vendor/solidcraft-preview', name), path.join(dest, name), { recursive: true });
}
console.log('[solidcraft] Staged pinned static runtime; the two engines are served from R2.');
