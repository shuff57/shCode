#!/usr/bin/env node
// lib/game-merge.ts: the three-way line merge behind Accept, "after accepting", Try it and "Bring in the
// newest version". What has to hold:
//   1. nothing changed on one side → the other side's text, exactly;
//   2. edits in different places both land; edits that touch the same lines are a conflict with no text;
//   3. the same edit made on both sides is not a conflict (merging a change already in);
//   4. CRLF reads as LF; an empty file; inserts at the very start and end;
//   5. a merge result, merged again with the same change, is stable.
// Run: node --import ./scripts/register-ts.mjs scripts/test-game-merge.mjs

import { mergeChange, hunksOf, clash, changeSize } from '../lib/game-merge.ts';

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.error(`FAIL  ${name}${detail !== undefined ? ' -- ' + JSON.stringify(detail).slice(0, 400) : ''}`); }
}

const BASE = [
  'function setup() {',
  '  new Canvas(400, 300);',
  '  player = new Sprite(50, 150, 20, 20);',
  '  speed = 3;',
  '}',
  '',
  'function draw() {',
  '  background(20);',
  '  if (kb.pressing("up")) player.y -= speed;',
  '  if (kb.pressing("down")) player.y += speed;',
  '  text("score: " + score, 10, 20);',
  '}',
  '',
].join('\n');

const edit = (text, from, to) => {
  if (!text.includes(from)) throw new Error('fixture: ' + from);
  return text.replace(from, to);
};

// 1. one side unchanged
let r = mergeChange(BASE, edit(BASE, 'speed = 3;', 'speed = 5;'), BASE);
check('game unchanged since the remix: the proposal, exactly', r.ok && r.text === edit(BASE, 'speed = 3;', 'speed = 5;'), r);
r = mergeChange(BASE, BASE, edit(BASE, 'background(20);', 'background(0);'));
check('proposal equal to base: the game as it is', r.ok && r.text === edit(BASE, 'background(20);', 'background(0);'), r);

// 2. different places
const theirs = edit(BASE, 'speed = 3;', 'speed = 5;');
const current = edit(BASE, 'text("score: " + score, 10, 20);', 'text("Score: " + score, 10, 24);');
r = mergeChange(BASE, theirs, current);
check('edits in different places both land', r.ok && r.text.includes('speed = 5;') && r.text.includes('"Score: "') && r.text.split('\n').length === BASE.split('\n').length, r);
r = mergeChange(BASE, current, theirs);
check('the merge is the same whichever side is which', r.ok && r.text === mergeChange(BASE, theirs, current).text, r);

// adjacent lines, different lines: not a conflict
r = mergeChange(BASE, edit(BASE, '  if (kb.pressing("up")) player.y -= speed;', '  if (kb.pressing("w")) player.y -= speed;'),
  edit(BASE, '  if (kb.pressing("down")) player.y += speed;', '  if (kb.pressing("s")) player.y += speed;'));
check('changes on neighbouring lines both land', r.ok && r.text.includes('"w"') && r.text.includes('"s"'), r);

// an added block plus an edit elsewhere
const added = edit(BASE, '  speed = 3;\n', '  speed = 3;\n  coin = new Sprite(200, 150, 10);\n  coin.color = "gold";\n');
r = mergeChange(BASE, added, current);
check('an added block and an edit elsewhere merge', r.ok && r.text.includes('coin.color') && r.text.includes('"Score: "'), r);

// 2b. same lines → conflict, no text
r = mergeChange(BASE, edit(BASE, 'speed = 3;', 'speed = 5;'), edit(BASE, 'speed = 3;', 'speed = 8;'));
check('both changed the same line: conflict, and no merged text', !r.ok && r.conflicts === 1 && r.lines[0] === 4 && !('text' in r), r);
r = mergeChange(BASE,
  edit(BASE, '  speed = 3;\n', '  speed = 3;\n  lives = 3;\n'),
  edit(BASE, '  speed = 3;\n', '  speed = 3;\n  gravity = 1;\n'));
check('two inserts at the same spot: conflict', !r.ok, r);
r = mergeChange(BASE, edit(BASE, '  speed = 3;\n}', '}'), edit(BASE, 'speed = 3;', 'speed = 4;'));
check('one deleted a line the other changed: conflict', !r.ok, r);

// 3. same edit on both sides
r = mergeChange(BASE, theirs, theirs);
check('the same edit on both sides is not a conflict', r.ok && r.text === theirs, r);
const both = mergeChange(BASE, theirs, current).text;
r = mergeChange(BASE, theirs, both);
check('accepting a change that is already in changes nothing', r.ok && r.text === both, r);

// 4. line endings, empty, ends
r = mergeChange(BASE.replace(/\n/g, '\r\n'), theirs.replace(/\n/g, '\r\n'), current);
check('CRLF reads as LF', r.ok && r.text === both, r);
r = mergeChange('', 'hello();\n', '');
check('an empty base and an empty game take the proposal', r.ok && r.text === 'hello();\n', r);
r = mergeChange(BASE, '// my game\n' + BASE, BASE + '// the end\n');
check('an insert at the very top and one at the very bottom both land', r.ok && r.text.startsWith('// my game\n') && r.text.endsWith('// the end\n'), r);

// 5. stability: merging the merged text against itself
r = mergeChange(BASE, both, both);
check('a merge merged with itself is the same text', r.ok && r.text === both, r);

// hunks and clash, directly
const h = hunksOf(['a', 'b', 'c'], ['a', 'B', 'c', 'd']);
check('hunksOf: a replace and an append', JSON.stringify(h) === JSON.stringify([{ start: 1, end: 2, lines: ['B'] }, { start: 3, end: 3, lines: ['d'] }]), h);
check('clash: overlapping ranges', clash({ start: 1, end: 3, lines: [] }, { start: 2, end: 4, lines: [] }));
check('clash: touching ranges do not', !clash({ start: 1, end: 3, lines: [] }, { start: 3, end: 5, lines: [] }));
check('clash: an insert at the start of a replaced block does', clash({ start: 3, end: 3, lines: ['x'] }, { start: 3, end: 5, lines: [] }));
check('clash: an insert at the end of a replaced block does not', !clash({ start: 5, end: 5, lines: ['x'] }, { start: 3, end: 5, lines: [] }));

const size = changeSize(BASE, added);
check('changeSize counts added and removed lines', size.added === 2 && size.removed === 0, size);
const size2 = changeSize(BASE, theirs);
check('changeSize: a changed line is one added and one removed', size2.added === 1 && size2.removed === 1, size2);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
