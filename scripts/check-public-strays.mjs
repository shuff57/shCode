#!/usr/bin/env node
// public/ is published byte for byte, so a stray editor or patch backup in it ships to the
// site: public/moshion/moshion.js.orig (a vendor sync's leftover) had to be moved aside by
// hand before two deploys on 2026-11-11. .gitignore cannot stop that: the build copies the
// folder, not the git tree. This refuses the build while one is there.
//
// Refused: *.orig *.rej *.bak *.swp *.swo *~ and .DS_Store.
// Run: node scripts/check-public-strays.mjs   (prebuild and npm test run it)
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const STRAY = /(\.(orig|rej|bak|swp|swo)|~)$|^\.DS_Store$/;

export function strays(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (STRAY.test(e.name)) out.push(p);
    }
  };
  walk(dir);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const found = strays(join(root, 'public')).map((p) => relative(root, p));
  if (found.length) {
    console.error(`[check-public-strays] public/ holds backup files that would be published:\n  ${found.join('\n  ')}\nDelete them (or move them out of public/), then build again.`);
    process.exit(1);
  }
  console.log('[check-public-strays] ok -- no backup files in public/');
}
