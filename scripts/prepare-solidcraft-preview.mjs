// Local preview assets: link our current guarded host and the pinned, unmodified web build.
// No files from upstream are edited. This is not a deployment packager.
import { access, lstat, mkdir, readlink, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cad = path.resolve(process.env.RESHAPE_CAD_DIR || path.join(root, '../reshape-cad'));
const host = path.join(cad, 'packages/solidcraft-host');
const web = path.resolve(process.env.SOLIDCRAFT_WEB_DIR || path.join(os.homedir(), '.cache/solidcraft-0.30.1/src/dist/web'));
const entries = [
  ['host.html', path.join(host, 'host.html')], ['src', path.join(host, 'src')],
  ['pane', path.join(host, 'pane')], ['kernel', path.join(host, 'kernel/dist')], ['solidcraft', web],
];
for (const required of [path.join(host, 'pane/bundle/host-lib.js'), path.join(host, 'pane/bundle/runner.js'), path.join(host, 'kernel/dist/solidcraft_referee_bg.wasm'), path.join(web, 'index.html')]) {
  await access(required).catch(() => { throw new Error(`Missing ${required}. Build the pinned CAD assets first; see reshape-cad/packages/solidcraft-host/README.md.`); });
}
const dest = path.join(root, 'public/solidcraft-preview');
await mkdir(dest, { recursive: true });
for (const [name, target] of entries) {
  const link = path.join(dest, name);
  let existing;
  try { existing = await lstat(link); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (existing) {
    if (!existing.isSymbolicLink() || path.resolve(path.dirname(link), await readlink(link)) !== target) {
      throw new Error(`Refusing to replace ${link}; it does not point to ${target}.`);
    }
  } else await symlink(target, link, name.endsWith('.html') ? 'file' : 'dir');
}
console.log('Local CAD UI ready: /sandbox/cad/ (start shCode dev server as usual).');
