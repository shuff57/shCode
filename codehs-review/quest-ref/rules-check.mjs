// node rules-check.mjs <stage.js> : battle rules for the Quest stages that have them.
import { runSketch } from '../../scripts/moshion-harness.mjs';
import { readFileSync } from 'node:fs';
const f = process.argv[2];
const src = readFileSync(f, 'utf8');
const has = (name) => new RegExp('function ' + name + '\\b|\\b' + name + '\\s*\\(').test(src);
const code = src + `
const __setup = setup;
function t(name, ok) { console.log((ok ? 'PASS ' : 'FAIL ') + name); }
setup = function () {
  __setup();
  const a = new Fighter('A', 20, 3, 2, 'red'), b = new Fighter('B', 20, 3, 2, 'blue');
  t('attack = power + roll', a.attack(b, 2) === 5 && b.hp === 15);
  t('hp never below 0', (b.takeHit(99), b.hp === 0 && !b.isAlive()));
  if (typeof a.guard === 'function') {
    const c = new Fighter('C', 20, 3, 2, 'x'); c.guard();
    t('guard halves the next hit, rounded down', c.takeHit(7) === 3 && c.hp === 17);
    t('guard lasts one hit', c.takeHit(4) === 4 && c.hp === 13);
    t('potion heals up to 8, capped at max', c.heal() === 7 && c.hp === 20 && c.potions === 1);
    c.heal(); t('no potions left heals 0', c.heal() === 0 && c.potions === 0);
  }
  if (typeof a.levelUp === 'function') {
    const d = new Fighter('D', 30, 3, 2, 'x'); d.hp = 4; d.potions = 0; d.levelUp();
    t('level up: +5 max, full hp, +1 power, potions back', d.maxHp === 35 && d.hp === 35 && d.power === 4 && d.potions === 2);
  }
  if (typeof goodMove === 'function') {
    t('good move', goodMove({ act: 1, roll: 3 }));
    t('bad moves refused', ![null, {}, { act: '1', roll: 0 }, { act: 4, roll: 0 }, { act: 1, roll: 3.5 }, { act: 1, roll: -1 }, { act: 1 }].some(goodMove));
  }
};`;
const r = runSketch(code, { frames: 3, filename: 'quest.js' });
if (r.error) console.log('ERROR', JSON.stringify(r.error).slice(0, 300));
for (const c of r.console) console.log(c.text);
