// Use the tracked host/UI snapshot locally, with the exact pinned engine originals.
// Production builds omit these oversized files and serve them through the R2 route.
import { access, mkdir, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { SOLIDCRAFT_ASSETS } from '../functions/_shared/solidcraft-runtime.ts';
import { stageSolidCraftPreview } from './stage-solidcraft-preview.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function prepareSolidCraftPreview(options = {}) {
  const targetRoot = options.root ?? root;
  const cad = path.resolve(options.cadDir ?? process.env.RESHAPE_CAD_DIR ?? path.join(targetRoot, '../reshape-cad'));
  const web = path.resolve(options.webDir ?? process.env.SOLIDCRAFT_WEB_DIR ?? path.join(os.homedir(), '.cache/solidcraft-0.30.1/src/dist/web'));
  const entries = SOLIDCRAFT_ASSETS.map(asset => [asset.path, asset.path.startsWith('kernel/')
    ? path.join(cad, 'packages/solidcraft-host/kernel/dist', path.basename(asset.path))
    : path.join(web, path.basename(asset.path))]);
  const available = [], missing = [];
  for (const entry of entries) {
    try { await access(entry[1]); available.push(entry); }
    catch (e) { if (e.code !== 'ENOENT') throw e; missing.push(entry[0]); }
  }
  if (options.requireEngines !== false && missing.length) throw new Error(`Missing pinned SolidCraft engines: ${missing.join(', ')}. Set RESHAPE_CAD_DIR and SOLIDCRAFT_WEB_DIR to the local 0.30.1 builds.`);
  await stageSolidCraftPreview(targetRoot);
  for (const [name, source] of available) {
    const dest = path.join(targetRoot, 'public/solidcraft-preview', name);
    await mkdir(path.dirname(dest), { recursive: true });
    await symlink(source, dest, 'file');
  }
  // Local only: the time-budget kernel built with sessions (reshape-cad kernel/build.sh FEATURES=session OUT=dist-session), for the host's
  // ?probeinc=on. It is not a production asset yet; without it the host's probe works as before.
  const session = path.join(cad, 'packages/solidcraft-host/kernel/dist-session/solidcraft_referee_bg.wasm');
  try {
    await access(session);
    const dest = path.join(targetRoot, 'public/solidcraft-preview/kernel-session/solidcraft_referee_bg.wasm');
    await mkdir(path.dirname(dest), { recursive: true });
    await symlink(session, dest, 'file');
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
  return { missing };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await prepareSolidCraftPreview();
  console.log('Local CAD UI ready: /sandbox/cad/ (start shCode dev server as usual).');
}
