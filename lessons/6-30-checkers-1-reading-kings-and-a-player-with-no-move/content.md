## Crowning a king

**Read before 6.30.2 Sub-build: Crown a king.** About 12 minutes.

A piece that reaches the far side of the board becomes a **king**. Red moves up, so its far row
is row 0; black moves down, so its far row is the last one, row `N - 1`. A king gets its own
letter, the capital one: `'R'` for a red king and `'B'` for a black king.

| Letter | What is on the square |
| --- | --- |
| `''` | nothing |
| `'r'` and `'b'` | a red piece, a black piece |
| `'R'` and `'B'` | a red king, a black king |

Crowning is a change to one letter, right after the piece lands:

```js
function crown(r, c) {
  const p = grid[r][c];
  if (p === 'r' && r === 0) { grid[r][c] = 'R'; return true; }
  if (p === 'b' && r === N - 1) { grid[r][c] = 'B'; return true; }
  return false;
}
```

It answers `true` when it has just crowned a piece, because that matters for the turn (below).
`p === 'r'` and not `'R'`: a piece that is already a king is not crowned twice.

## A king still belongs to its colour

Every rule so far asks `colorOf(p) === turn`, and `turn` is `'r'` or `'b'`. A red king is `'R'`,
and `'R' === 'r'` is false: without a change, red could never move its own king. This is why
`colorOf` has been there since day one. `toLowerCase()`, a string method, gives the small letter
of a capital, and leaves a small letter (or `''`) as it is:

```js
function colorOf(p) { return p.toLowerCase(); }   // 'R' -> 'r', 'r' -> 'r', '' -> ''
function isKing(p) { return p === 'R' || p === 'B'; }
```

One line changed, and every rule that asks about colour, in `moveKind`, `clickAt` and the
drawing, now treats a king as its own side's piece.

**A king moves backward too.** In `moveKind`, a move that is not ahead is refused only for a
piece that is not a king:

```js
if (!ahead && !isKing(p)) return '';
```

A king can step back and jump back. `canJumpFrom` already tries all four directions, so a king
that jumps can go on jumping backward with no other change.

**Crowning ends the turn.** A piece that is crowned in the middle of a chain stops there, even if
it could jump again. So `doMove` crowns first, then asks about a chain only when nothing was
crowned:

```js
const crowned = crown(tr, tc);
if (kind === 'jump' && !crowned && canJumpFrom(tr, tc)) {
  // ...jump again, as in 6.29.1
}
```

## A player with no move loses

The game ends when the player whose turn it is cannot move at all: every piece is gone, or every
piece is stuck. One function answers that question, and it does not need a single rule of its
own. It asks `moveKind` about every square, in every direction, one and two squares away:

```js
function hasAnyMove() {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      for (const d of [-2, -1, 1, 2]) {
        if (moveKind(r, c, r + d, c + d) !== '' || moveKind(r, c, r + d, c - d) !== '') return true;
      }
    }
  }
  return false;
}
```

`moveKind` already refuses an empty square, the other player's pieces, a square off the board and
a blocked move, so the loop finds a move only if the player really has one. A player with no
pieces left has no move either, so the same test covers "all taken" without counting anything.

At the very end of `doMove`, below the line that says whose turn it is (`message = nameOf(turn) + "'s turn";`),
ask it about the new player. Below that line, not above it: the win message has to be the last
thing written into `message`, or the turn message writes over it.

```js
if (!hasAnyMove()) {
  winner = turn === 'r' ? 'b' : 'r';
  message = nameOf(winner) + ' wins! Press R to play again';
}
```

`winner` starts as `''`. While it is `''` the game goes on; once it holds a letter, clicks stop
(`if (mouse.presses() && winner === '')`) and R starts a new game:
`if (kb.presses('r') && winner !== '') newGame();`. `newGame()` puts `winner` back to `''`.
