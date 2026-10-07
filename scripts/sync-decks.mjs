#!/usr/bin/env node
// Vendor the bookSHelf slide decks that lessons reference into public/slides/.
//
// WHY: bookSHelf answers with X-Frame-Options: SAMEORIGIN, so a deck cannot be
// framed from shCode. A lesson's `slidesUrl` therefore points at a same-origin
// copy: /slides/<name>.html (flat, file name identical to the book's).
//
// Which decks: every lessons/*/lesson.json whose slidesUrl is /slides/<name>.html
// (or still the old https://oerbookshelf.app/.../decks/<name> form). Each is
// read from the bookSHelf checkout's COMMITTED HEAD (git show), never the working
// tree, so a half-edited deck is not vendored. Bytes are copied verbatim.
//
// Env: BOOKSHELF_DIR (default ../bookSHelf). Not part of prebuild/deploy: the
// vendored files are committed so a build needs no bookSHelf checkout.
// Deterministic + idempotent; exits 1 if any source is missing.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const book = resolve(root, process.env.BOOKSHELF_DIR || '../bookSHelf');
const BOOK_DOCS = 'docs/introduction-to-programming-concepts-and-methodologies';
const out = join(root, 'public/slides');

const git = (args, enc) =>
  execFileSync('git', ['-C', book, ...args], { maxBuffer: 64 * 1024 * 1024, encoding: enc });

if (!existsSync(join(book, '.git'))) {
  console.error(`sync-decks: no bookSHelf checkout at ${book} (set BOOKSHELF_DIR)`);
  process.exit(1);
}

const names = new Set();
for (const d of readdirSync(join(root, 'lessons'))) {
  const f = join(root, 'lessons', d, 'lesson.json');
  if (!existsSync(f)) continue;
  const u = JSON.parse(readFileSync(f, 'utf8')).slidesUrl;
  if (typeof u !== 'string') continue;
  const m = u.match(/^\/slides\/([^/]+\.paper)\.html$/) || u.match(/\/decks\/([^/?#]+\.paper)$/);
  if (m) names.add(m[1] + '.html');
}

const tracked = git(['ls-tree', '-r', '--name-only', 'HEAD', BOOK_DOCS], 'utf8').split('\n');
const sha = git(['rev-parse', '--short', 'HEAD'], 'utf8').trim();
mkdirSync(out, { recursive: true });
let bad = 0;
for (const name of [...names].sort()) {
  const src = tracked.find((p) => p.includes('/decks/') && p.endsWith('/' + name));
  if (!src) {
    console.error(`MISSING  ${name} (not committed under ${BOOK_DOCS})`);
    bad++;
    continue;
  }
  const buf = execFileSync('git', ['-C', book, 'show', `HEAD:${src}`], { maxBuffer: 64 * 1024 * 1024 });
  const dest = join(out, name);
  const same = existsSync(dest) && readFileSync(dest).equals(buf);
  if (!same) writeFileSync(dest, buf);
  console.log(`${same ? 'same   ' : 'copied '} ${name}  <- ${src} @ ${sha}`);
}
if (bad) process.exit(1);
console.log(`sync-decks: ${names.size} deck(s) from bookSHelf ${sha}`);
