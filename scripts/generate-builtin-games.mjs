#!/usr/bin/env node
// Built-in games for Library -> Games. The list is lib/builtin-games.ts.
//
// A lesson game (the finished Trail, Checkers and Quest: the play-only demos
// at 6.22.0, 6.27.0 and 7.16.0, a ```js live demo fence each) is copied from
// its fence, play only, with the lesson demo's room key ('demo-<fence id>') so
// a student playing from the Library and one playing from the lesson can join
// each other. A course game (Paddle Rally) is copied from its games/<name>.js
// file with its author and sharing choice, so /play can offer Remix and View
// code; its room key is 'builtin-<id>'. The lesson or the file is the source;
// never edit the JSON by hand.
//
// Run: node --import ./scripts/register-ts.mjs scripts/generate-builtin-games.mjs [--check]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILTIN_GAMES, builtinRoomKey } from '../lib/builtin-games.ts';
import { canRemix } from '../lib/share-choice.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public', 'builtin-games.json');

function fail(msg) { console.error(`[builtin-games] ${msg}`); process.exit(1); }

const out = [];
for (const g of BUILTIN_GAMES) {
  let code;
  if (g.file) {
    if (!g.author || !canRemix(g.choice)) fail(`${g.id}: a course game needs an author and a sharing choice that allows remixing`);
    code = readFileSync(path.join(root, g.file), 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '');
  } else {
    const file = path.join(root, 'lessons', g.lesson, 'content.md');
    const md = readFileSync(file, 'utf8');
    const re = new RegExp('```js live demo[^\\n]*\\bid=' + g.fence + '\\b[^\\n]*\\n([\\s\\S]*?)\\n```');
    const m = md.match(re);
    if (!m) fail(`no live demo fence id=${g.fence} in ${g.lesson}/content.md`);
    code = m[1];
  }
  const mp = code.match(/\bmultiplayer\s*\(\s*['"](\w+)['"]\s*(?:,\s*(\d))?/);
  const entry = { id: g.id, title: g.title, blurb: g.blurb };
  if (g.lesson) { entry.lesson = g.lesson; entry.fence = g.fence; }
  else { entry.author = g.author; entry.choice = g.choice; }
  if (g.modeText) entry.modeText = g.modeText;
  entry.room = builtinRoomKey(g);
  entry.mode = mp ? mp[1] : 'none';
  entry.players = mp ? Number(mp[2] ?? 2) : 1;
  entry.code = code;
  out.push(entry);
}
const body = JSON.stringify({ games: out }, null, 1) + '\n';
if (process.argv.includes('--check')) {
  if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== body) {
    console.error('[builtin-games] public/builtin-games.json is stale: run node scripts/generate-builtin-games.mjs');
    process.exit(1);
  }
  console.log(`[builtin-games] up to date: ${out.length} games`);
} else {
  writeFileSync(OUT, body);
  console.log(`[builtin-games] wrote ${out.length} games -> public/builtin-games.json`);
}
