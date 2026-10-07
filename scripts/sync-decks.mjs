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
// tree, so a half-edited deck is not vendored.
//
// ONE transform, and only one: authoring notes are stripped, because the copy is
// served to students and view-source would otherwise show them. Removed:
//   - every `<div class="notes">...</div>` (hidden by `.notes{display:none}`,
//     read by no script in the deck; single-line, text only), with its line;
//   - any `data-notes="..."` attribute on an element (the deck's presenter
//     window reads it, but the presenter button is teacher/owner-only and the
//     decks carry none today; the reading code is JS and is left alone).
// Everything else is byte-for-byte. The step is deterministic and idempotent, and
// it is asserted: the output is parsed with parse5 and must hold no `.notes`
// element, no `data-notes` attribute, and the same number of `<section>`
// elements as the source, or the sync exits 1 without writing the deck.
//
// Env: BOOKSHELF_DIR (default ../bookSHelf). Not part of prebuild/deploy: the
// vendored files are committed so a build needs no bookSHelf checkout.
// Deterministic + idempotent; exits 1 if any source is missing.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// parse5 is not a direct dependency (it arrives through jsdom); it is only used to
// assert on the result, never to rewrite it, so the deck's bytes stay untouched.
const { parse } = createRequire(import.meta.url)('parse5');

const NOTES_DIV = /^[ \t]*<div class="notes">[^<]*<\/div>[ \t]*\r?\n?/gm;
const DATA_NOTES_ATTR = /(<[a-zA-Z][^<>]*?)\s+data-notes=(?:"[^"]*"|'[^']*')/g;

function walk(node, f) {
  f(node);
  for (const c of node.childNodes || []) walk(c, f);
  if (node.content) walk(node.content, f);
}
function audit(html) {
  let sections = 0, notes = 0, dataNotes = 0;
  walk(parse(html), (n) => {
    if (n.tagName === 'section') sections++;
    const attrs = n.attrs || [];
    if (attrs.some((a) => a.name === 'class' && a.value.split(/\s+/).includes('notes'))) notes++;
    if (attrs.some((a) => a.name === 'data-notes')) dataNotes++;
  });
  return { sections, notes, dataNotes };
}

// Returns { html, removed: { notes, dataNotes } }; throws if the result is not clean.
function stripNotes(src, label = 'deck') {
  const removed = { notes: 0, dataNotes: 0 };
  const html = src
    .replace(NOTES_DIV, () => (removed.notes++, ''))
    .replace(DATA_NOTES_ATTR, (_, head) => (removed.dataNotes++, head));
  const before = audit(src);
  const after = audit(html);
  if (after.notes || after.dataNotes || after.sections !== before.sections || before.notes !== removed.notes || before.dataNotes !== removed.dataNotes) {
    throw new Error(`${label}: notes strip failed its check (before ${JSON.stringify(before)}, removed ${JSON.stringify(removed)}, after ${JSON.stringify(after)})`);
  }
  return { html, removed, sections: after.sections };
}

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
  const raw = execFileSync('git', ['-C', book, 'show', `HEAD:${src}`], { maxBuffer: 64 * 1024 * 1024 });
  let stripped;
  try {
    stripped = stripNotes(raw.toString('utf8'), name);
  } catch (e) {
    console.error(`FAILED   ${e.message}`);
    bad++;
    continue;
  }
  const buf = Buffer.from(stripped.html, 'utf8');
  const dest = join(out, name);
  const same = existsSync(dest) && readFileSync(dest).equals(buf);
  if (!same) writeFileSync(dest, buf);
  console.log(`${same ? 'same   ' : 'copied '} ${name}  <- ${src} @ ${sha}  (stripped ${stripped.removed.notes} notes, ${stripped.removed.dataNotes} data-notes; ${stripped.sections} sections)`);
}
if (bad) process.exit(1);
console.log(`sync-decks: ${names.size} deck(s) from bookSHelf ${sha}`);
