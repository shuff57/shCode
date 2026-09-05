// reshape-docs-text.mjs — pure-text helpers for the reSHape docs gates.
//
// Extracted out of scripts/reshape-harness.mjs when that file (and the JSCAD
// runner/bundle it existed to test) was deleted -- CLAUDE.md's "JSCAD is
// retired" section. Everything here reads a source FILE as text; nothing
// here loads a bundle, evaluates a runner, or touches public/reshape/lib,
// reshape.js, runner.html or jscad-legacy.md. Keep it that way -- the whole
// point of pulling these three functions out on their own is that
// scripts/check-docs-prose.mjs and scripts/test-reshape-docs.mjs can import
// this module without dragging the (now-deleted) JSCAD execution machinery
// in behind it.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

const PATHS = {
  script: join(REPO, 'lib/reshape-script.ts'),
  inAppDocs: join(REPO, 'lib/reshape-docs.ts'),
  reference: join(REPO, 'public/reshape/docs/reference.md'),
};

/**
 * The reSHape Script vocabulary, read out of lib/reshape-script.ts so the doc
 * sync check follows the language rather than a copy of its word list.
 */
export function dslVocabulary() {
  const src = read(PATHS.script);
  const m = src.match(/export const VOCABULARY = \[([\s\S]*?)\]/);
  if (!m) throw new Error('lib/reshape-script.ts has no `export const VOCABULARY = [` -- the scan needs updating');
  return [...m[1].matchAll(/'([A-Za-z]+)'/g)].map((x) => x[1]);
}

/**
 * Which of a candidate name list a doc file actually documents.
 *
 * Deliberately NOT a bare word match: a name counts when it is written the
 * way documentation writes an API name — called, dotted off its module, or
 * set in backticks — not just mentioned as ordinary English.
 */
export function documentedNames(text, candidates) {
  const found = new Set();
  for (const name of candidates) {
    const rx = new RegExp('\\b' + name + '\\s*\\(|\\.' + name + '\\b|`' + name + '`');
    if (rx.test(text)) found.add(name);
  }
  return found;
}

/**
 * lib/reshape-docs.ts opens with a scope-out comment naming a dozen functions the
 * course deliberately does NOT document. Reading it as content would report
 * every one of them as drift, so the file's docs start at its first import.
 */
export function docBodyOf(ts) {
  const i = ts.indexOf('import {');
  return i > 0 ? ts.slice(i) : ts;
}

// No `legacy` entry -- public/reshape/docs/jscad-legacy.md is deleted along
// with the JSCAD runner it documented.
export const docText = {
  inApp: () => docBodyOf(read(PATHS.inAppDocs)),
  reference: () => read(PATHS.reference),
};
