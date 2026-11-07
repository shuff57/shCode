## Jumping over

**Read before 6.29.2 Sub-build: Jump and take.** About 12 minutes.

A jump is a move of **two** squares diagonally, over a piece of the other colour, onto an empty
square. The piece that was jumped is taken off the board. In `moveKind` (6.28.1) a jump is just
a second answer, one line after the step:

```js
if (abs(dr) === 1) return 'step';
if (abs(dr) === 2) {
  const mid = grid[fr + dr / 2][fc + dc / 2];
  if (mid !== '' && colorOf(mid) !== turn) return 'jump';
}
return '';
```

Everything above those lines still holds: the piece is yours, the landing square is empty and
on the board, the move is diagonal and forward. So a jump only has to add the one new rule: the
square in between holds an enemy piece.

**The halfway square.** A jump from row 5 to row 3 passes over row 4, and from column 2 to column
0 passes over column 1. The square in the middle is halfway between the two ends: add them and
halve the sum.

```js
const mr = (fr + tr) / 2;   // (5 + 3) / 2 is 4
const mc = (fc + tc) / 2;   // (2 + 0) / 2 is 1
```

`fr + dr / 2` is the same square written another way: `dr` is `-2`, half of it is `-1`, and one
row up from 5 is 4. Both are whole numbers, because a jump always moves exactly two.

**Taking the piece** happens in `doMove`, which empties the halfway square when the move was a
jump. Ask `moveKind` what the move is FIRST, before the piece moves: once the letter has been
copied away, the starting square is empty and `moveKind` would answer `''`.

```js
function doMove(fr, fc, tr, tc) {
  const kind = moveKind(fr, fc, tr, tc);
  grid[tr][tc] = grid[fr][fc];
  grid[fr][fc] = '';
  if (kind === 'jump') grid[(fr + tr) / 2][(fc + tc) / 2] = '';
  // ...then the turn passes, as before
}
```

## Jumping again

After a jump, if the same piece can jump again from where it landed, it must: the turn does not
pass. That run of jumps is a **chain**. One variable remembers that a chain is going on,
`let chain = false;`, and one function asks whether a piece has a jump. A piece can jump in four
directions, so `canJumpFrom` asks `moveKind` about each one (`for...of` visits each item of a
list, 3.3.5):

```js
function canJumpFrom(r, c) {
  for (const dr of [-2, 2]) {
    for (const dc of [-2, 2]) {
      if (moveKind(r, c, r + dr, c + dc) === 'jump') return true;
    }
  }
  return false;
}
```

`r + dr` can be off the board, at row -1 or row 9. That is safe, because the first line of
`moveKind` answers `''` for a square that is not on the board. It is also why the rule check is
worth having in one place: `canJumpFrom` did not need a single rule of its own.

At the end of a jump, `doMove` asks it:

```js
if (kind === 'jump' && canJumpFrom(tr, tc)) {
  picked = { r: tr, c: tc };
  chain = true;
  message = nameOf(turn) + ' jumps again!';
  return;
}
chain = false;
```

`return` leaves before the turn passes, so it is still the same player's turn, and the piece that
jumped stays picked up.

**Only that piece, and only a jump.** During a chain, the player must not walk away with a
different piece or take a step instead. That is a rule, so it goes where the rules are asked,
in `isLegal`:

```js
function isLegal(fr, fc, tr, tc) {
  const kind = moveKind(fr, fc, tr, tc);
  if (kind === '') return false;
  if (chain) return kind === 'jump' && fr === picked.r && fc === picked.c;
  return true;
}
```

and the click must not pick up another piece while `chain` is true: the test in `clickAt`
becomes `if (!chain && p !== '' && colorOf(p) === turn)`.
