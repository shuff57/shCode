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
    t('junk moves refused', ![{ act: 1, roll: 99 }, { act: 1, roll: '2' }, { act: 0, roll: 1 }, { roll: 1 }, undefined, 3, 'attack', [1, 2], { act: null, roll: null }].some(goodMove));
  }
  if (typeof goodMove === 'function' && typeof drawTop === 'function') {
    // A hacked host(3) gives a third seat: every top line must still draw, and its moves do nothing.
    const draws = (seat, end) => {
      duel = true; newGame(); over = end;
      online.status = 'ready'; online.seat = seat;
      try { drawTop(); return true; } catch (e) { console.log('drawTop threw: ' + e.message); return false; }
    };
    t('top draws for seats 0, 1 and 2, in play and after a win', [0, 1, 2].every((s) => draws(s, false) && draws(s, true)));
    t('top draws while connecting, waiting, closed and in error', ['connecting', 'waiting', 'closed', 'error'].every((st) => { duel = true; online.status = st; online.seat = null; try { drawTop(); return true; } catch (e) { console.log(st + ': ' + e.message); return false; } }));
    duel = true; newGame(); over = false;
    const hp = fighters[1].hp;
    for (const m of [{ act: 1, roll: 99 }, { act: 1, roll: '2' }, { act: 4, roll: 0 }, null, { act: 1 }]) if (goodMove(m)) act(turn, m.act, m.roll);
    t('junk moves leave the duel untouched', fighters[1].hp === hp && turn === 0 && !over);
    duel = false; online.status = 'off'; online.seat = null; newGame();
  }
};`;
const r = runSketch(code, { frames: 3, filename: 'quest.js' });
if (r.error) console.log('ERROR', JSON.stringify(r.error).slice(0, 300));
for (const c of r.console) console.log(c.text);
