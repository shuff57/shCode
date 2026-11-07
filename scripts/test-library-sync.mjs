#!/usr/bin/env node
// Table tests for planSync() (lib/library-sync.ts), the three-way merge between
// this browser's saved textures/sounds, the account library, and the BASE (what
// both agreed on last time). The cases a student would notice:
//   - nothing is ever silently lost: a clash keeps both copies (hero, hero_2);
//   - a delete reaches the account only when the student pressed Delete; an item
//     a sketch cleared with clearStorage() comes back down instead;
//   - a delete on another device removes it here, unless it was changed here.
//
// Run: node scripts/test-library-sync.mjs

import { planSync, freshName } from '../lib/library-sync.ts';

let passed = 0;
let failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}\n   got      ${a}\n   expected ${e}`); }
}
const L = (name, hash, kind = 'texture') => ({ kind, name, hash });
const S = (name, hash, id = 'id-' + name, deletedAt = null, kind = 'texture') => ({ id, kind, name, hash, deletedAt });
const B = (entries) => Object.fromEntries(entries.map(([k, id, hash]) => [k, { id, hash }]));
const types = (plan) => plan.map((a) => a.type + ':' + (a.name ?? `${a.from}>${a.to}`));

check('new here, nothing there: upload',
  types(planSync([L('hero', 'h1')], {}, [], new Set())), ['upload:hero']);
check('new there, nothing here: download',
  types(planSync([], {}, [S('hero', 'h1')], new Set())), ['download:hero']);
check('first sync, same bytes on both: just record the base',
  types(planSync([L('hero', 'h1')], {}, [S('hero', 'h1')], new Set())), ['setBase:hero']);
check('first sync, different bytes under one name: keep both',
  types(planSync([L('hero', 'h1')], {}, [S('hero', 'h2')], new Set())), ['rename:hero>hero_2', 'upload:hero_2', 'download:hero']);
check('unchanged on both: nothing to do',
  types(planSync([L('hero', 'h1')], B([['texture:hero', 'i', 'h1']]), [S('hero', 'h1')], new Set())), []);
check('changed here only: upload on top of the base',
  planSync([L('hero', 'h2')], B([['texture:hero', 'i', 'h1']]), [S('hero', 'h1')], new Set()),
  [{ type: 'upload', kind: 'texture', name: 'hero', baseHash: 'h1' }]);
check('changed there only: download',
  types(planSync([L('hero', 'h1')], B([['texture:hero', 'i', 'h1']]), [S('hero', 'h2')], new Set())), ['download:hero']);
check('changed on both to the same bytes: just move the base',
  types(planSync([L('hero', 'h3')], B([['texture:hero', 'i', 'h1']]), [S('hero', 'h3')], new Set())), ['setBase:hero']);
check('changed on both differently: keep both',
  types(planSync([L('hero', 'h2')], B([['texture:hero', 'i', 'h1']]), [S('hero', 'h3')], new Set())), ['rename:hero>hero_2', 'upload:hero_2', 'download:hero']);
check('the rename skips names already used here or there',
  types(planSync([L('hero', 'h2'), L('hero_2', 'x')], B([['texture:hero', 'i', 'h1'], ['texture:hero_2', 'j', 'x']]),
    [S('hero', 'h3'), S('hero_2', 'x'), S('hero_3', 'y')], new Set())),
  ['rename:hero>hero_4', 'upload:hero_4', 'download:hero', 'download:hero_3']);
check('deleted on another device, unchanged here: delete here',
  types(planSync([L('hero', 'h1')], B([['texture:hero', 'i', 'h1']]), [S('hero', 'h1', 'i', 99)], new Set())), ['removeLocal:hero', 'dropBase:hero']);
check('deleted on another device but changed here: keep the work, upload it',
  types(planSync([L('hero', 'h2')], B([['texture:hero', 'i', 'h1']]), [S('hero', 'h1', 'i', 99)], new Set())), ['upload:hero']);
check('student pressed Delete here, unchanged there: delete on the account',
  planSync([], B([['texture:hero', 'i', 'h1']]), [S('hero', 'h1', 'i')], new Set(['texture:hero'])),
  [{ type: 'removeRemote', kind: 'texture', name: 'hero', id: 'i', baseHash: 'h1' }]);
check('student pressed Delete here, but it changed on another device: the newer work comes back',
  types(planSync([], B([['texture:hero', 'i', 'h1']]), [S('hero', 'h2', 'i')], new Set(['texture:hero']))), ['forgetDelete:hero', 'download:hero']);
check('missing here WITHOUT a Delete (a sketch ran clearStorage): download it again',
  types(planSync([], B([['texture:hero', 'i', 'h1']]), [S('hero', 'h1', 'i')], new Set())), ['download:hero']);
check('gone everywhere: forget the base',
  types(planSync([], B([['texture:hero', 'i', 'h1']]), [S('hero', 'h1', 'i', 99)], new Set())), ['dropBase:hero']);
check('a Delete of something never synced: just forget the marker',
  types(planSync([], {}, [], new Set(['texture:hero']))), ['forgetDelete:hero']);
check('saved again after a Delete: forget the marker and upload',
  types(planSync([L('hero', 'h5')], {}, [], new Set(['texture:hero']))), ['forgetDelete:hero', 'upload:hero']);
check('a texture and a sound may share a name',
  types(planSync([L('zap', 'a', 'texture'), L('zap', 'b', 'sound')], {}, [], new Set())), ['upload:zap', 'upload:zap']);
check('a tombstone with nothing here and no base: nothing',
  types(planSync([], {}, [S('old', 'h', 'i', 5)], new Set())), []);
check('freshName keeps within 40 characters', freshName('a'.repeat(40), new Set()).length, 40);
check('freshName counts past taken names', freshName('hero', new Set(['hero_2', 'hero_3'])), 'hero_4');

console.log(`\ntest-library-sync: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
