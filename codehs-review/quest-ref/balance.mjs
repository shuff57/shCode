import { runSketch } from '../../scripts/moshion-harness.mjs';
import { readFileSync } from 'node:fs';
const [f, policy] = [process.argv[2], process.argv[3]];
let wins = 0, losses = 0, reached = [];
for (let s = 1; s <= 40; s++) {
  const code = readFileSync(f, 'utf8').replace('randomSeed(Date.now());', 'randomSeed(' + s * 7919 + ');') + `
const __setup = setup;
setup = function () { __setup(); every(50, () => {
  if (over || turn !== 0) return;
  const h = fighters[0];
  let a = 1;
  if (${policy === 'smart'} && h.hp < h.maxHp * 0.35 && h.potions > 0) a = 3;
  act(0, a, floor(random(0, 4)));
}); };
const __draw = draw; draw = function () { __draw(); if (over && !globalThis.__done) { globalThis.__done = 1; console.log((message.includes('beat them all') ? 'WIN ' : 'LOSE ') + which); } };`;
  const r = runSketch(code, { frames: 4000, filename: 'q.js' });
  const line = (r.console.find((c) => /^(WIN|LOSE)/.test(c.text)) || {}).text || 'NONE';
  if (line.startsWith('WIN')) wins++; else { losses++; reached.push(line); }
}
console.log(policy, 'wins', wins, 'losses', losses, reached.slice(0, 12).join(','));
