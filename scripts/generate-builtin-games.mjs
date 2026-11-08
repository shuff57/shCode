#!/usr/bin/env node
// Built-in games for Library -> Games (play only: no code view, no Remix).
//
// The finished Trail, Checkers and Quest are the play-only demos at 6.22.0,
// 6.27.0 and 7.16.0 (a ```js live demo fence each). This copies each fence's
// code into public/builtin-games.json so /play?builtin=<id> can run the same
// game with the same room key as the lesson demo ('demo-<fence id>'), so a
// student playing from the Library and one playing from the lesson can join
// each other. The lesson is the source; never edit the JSON by hand.
//
// Run: node scripts/generate-builtin-games.mjs [--check]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public', 'builtin-games.json');

const GAMES = [
  { id: 'trail', title: 'Trail', lesson: '6-22-trail-0-reading-play-the-finished-game', fence: 'trail-finished-game',
    blurb: 'Race along a path: roll the die, jump ahead, slide back, wait a turn. First to the flag wins.' },
  { id: 'checkers', title: 'Checkers', lesson: '6-27-checkers-0-reading-play-the-finished-game', fence: 'checkers-finished-game',
    blurb: 'Jump your opponent' + "'" + 's pieces, chain your jumps, crown your kings.' },
  { id: 'quest', title: 'Quest', lesson: '7-16-quest-0-reading-play-the-finished-game', fence: 'quest-finished-game',
    blurb: 'A turn-based battle: attack, guard or drink a potion. Fight a run of monsters or duel a classmate.' },
];

const out = [];
for (const g of GAMES) {
  const file = path.join(root, 'lessons', g.lesson, 'content.md');
  const md = readFileSync(file, 'utf8');
  const re = new RegExp('```js live demo[^\\n]*\\bid=' + g.fence + '\\b[^\\n]*\\n([\\s\\S]*?)\\n```');
  const m = md.match(re);
  if (!m) { console.error(`[builtin-games] no live demo fence id=${g.fence} in ${g.lesson}/content.md`); process.exit(1); }
  const code = m[1];
  const mp = code.match(/\bmultiplayer\s*\(\s*['"](\w+)['"]\s*(?:,\s*(\d))?/);
  out.push({ id: g.id, title: g.title, blurb: g.blurb, lesson: g.lesson, fence: g.fence,
    mode: mp ? mp[1] : 'none', players: mp ? Number(mp[2] ?? 2) : 1, code });
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
