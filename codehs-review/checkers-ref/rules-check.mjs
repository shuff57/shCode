import { runSketch } from '../../scripts/moshion-harness.mjs';
import { readFileSync } from 'node:fs';
const f = process.argv[2];
const code = readFileSync(f, 'utf8') + `
const __setup = setup;
function empty() { return Array.from({ length: 8 }, () => Array(8).fill('')); }
function t(name, ok) { console.log((ok ? 'PASS ' : 'FAIL ') + name); }
setup = function () {
  __setup();
  // crown: red at (1,2) steps to (0,1) and becomes a king; turn passes
  grid = empty(); grid[1][2] = 'r'; grid[5][0] = 'b'; turn = 'r';
  doMove(1, 2, 0, 1); t('red crowned on row 0', grid[0][1] === 'R' && turn === 'b');
  // a king moves backward
  turn = 'r'; t('king moves backward', moveKind(0, 1, 1, 2) === 'step');
  t('plain piece cannot move backward', (grid[3][4] = 'r', moveKind(3, 4, 4, 5) === ''));
  // crowning ends a chain even if another jump exists
  grid = empty(); grid[2][1] = 'r'; grid[1][2] = 'b'; grid[1][4] = 'b'; grid[5][5] = 'b'; turn = 'r';
  doMove(2, 1, 0, 3); t('jump onto far row crowns and ends the turn', grid[0][3] === 'R' && turn === 'b' && !chain);
  // win: red takes the last black piece
  grid = empty(); grid[4][3] = 'r'; grid[3][4] = 'b'; turn = 'r'; winner = '';
  doMove(4, 3, 2, 5); t('last piece taken -> red wins', winner === 'r');
  // win by blocking: black has a piece but no move
  grid = empty(); grid[7][0] = 'b'; grid[5][2] = 'r'; grid[6][1] = 'r'; turn = 'r'; winner = '';
  // black at the bottom row cannot move down; red steps somewhere harmless
  doMove(5, 2, 4, 3); t('no move left -> other player wins', winner === 'r');
  // illegal: moving onto a piece, sideways, a jump over your own piece
  grid = empty(); grid[5][2] = 'r'; grid[4][3] = 'r'; grid[4][1] = 'b'; turn = 'r'; winner = ''; chain = false;
  t('onto a piece refused', moveKind(5, 2, 4, 3) === '');
  t('sideways refused', moveKind(5, 2, 5, 4) === '');
  t('jump over own piece refused', moveKind(5, 2, 3, 4) === '');
  t('jump over enemy allowed', moveKind(5, 2, 3, 0) === 'jump');
  t('wrong turn refused', (turn = 'b', moveKind(5, 2, 4, 1) === ''));
  t('junk move refused', isLegal(undefined, 'x', 99, -1) === false);
};`;
const r = runSketch(code, { frames: 2, filename: 'chk.js' });
if (r.error) console.log('ERROR', JSON.stringify(r.error).slice(0, 400));
for (const c of r.console) console.log(c.text ?? JSON.stringify(c));
