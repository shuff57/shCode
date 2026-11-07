## From a click to a square

**Read before 6.28.2 Sub-build: Pick up and put down.** About 14 minutes.

`mouse.presses()` is true on the one frame of a click (6.1.2), and `mouse.x` and `mouse.y` say
where it was, in pixels. The grid speaks rows and columns, so the click is turned into a cell the
way 6.14.9 did it: take the strip at the top off, divide by the size of a square, and cut off the
fraction with `floor`.

```js
const c = floor(x / CELL);
const r = floor((y - TOP) / CELL);
```

A click can land in the strip above the board, so check the square is really there before
reading `grid[r][c]` (6.14.9). One small helper says it once, for every later rule:

```js
function onBoard(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
```

## Picking a piece up

To pick a piece up, the game only has to *remember which one*. `picked` holds the piece's row
and column as an object, `{ r: 5, c: 2 }`, or `null` when nothing is picked up. `null` means
"no value here on purpose", and `picked !== null` asks "is something picked up?".

Whose turn it is is a letter, the same letter as that player's pieces: `let turn = 'r';`.
Your own piece is one whose colour matches the turn, so a click on it picks it up:

```js
if (p !== '' && colorOf(p) === turn) {
  picked = { r: r, c: c };
  return;
}
```

Lighting the picked square is a see-through gold `rect` drawn over it in `drawBoard()`, only
while `picked !== null`. A colour like `'rgba(255, 215, 0, 0.45)'` has a fourth number for how
solid it is: 0 is invisible and 1 is solid.

## A step

A step moves a piece **one row and one column**. Write the change in rows and columns as two
numbers, `dr = tr - fr` and `dc = tc - fc` (`f` for "from" and `t` for "to"). A diagonal step
up and to the left has `dr = -1` and `dc = -1`; down and to the right, `1` and `1`.

The sign does not matter for "one away", only the size, so the test uses `abs`. `abs(n)` gives a
number without its minus sign: `abs(-1)` is 1 and `abs(1)` is 1.

```js
if (abs(dr) === 1 && abs(dc) === 1) ...   // one square diagonally, any direction
```

Two more rules make a step:

- **Forward only.** Red starts at the bottom and moves up the screen, so for red the rows get
  smaller: `dr < 0`. Black moves down: `dr > 0`. One line says both, with `? :` (6.14.9):
  `const ahead = turn === 'r' ? dr < 0 : dr > 0;`
- **Onto an empty square.** `grid[tr][tc]` must be `''`.

## Every rule in one function

Here is the most important idea of the whole game. A click does not decide whether a move is
allowed. **One function answers what a move is, and everything else only asks it.**

```js
function moveKind(fr, fc, tr, tc) {
  if (!onBoard(fr, fc) || !onBoard(tr, tc)) return '';
  const p = grid[fr][fc];
  if (p === '' || colorOf(p) !== turn || grid[tr][tc] !== '') return '';
  const dr = tr - fr;
  const dc = tc - fc;
  if (abs(dr) !== abs(dc)) return '';
  const ahead = turn === 'r' ? dr < 0 : dr > 0;
  if (!ahead) return '';
  if (abs(dr) === 1) return 'step';
  return '';
}

function isLegal(fr, fc, tr, tc) {
  return moveKind(fr, fc, tr, tc) !== '';
}
```

Read it top to bottom: every line that is not happy with the move answers `''` (not allowed) and
leaves. `abs(dr) !== abs(dc)` throws out anything that is not diagonal. Only a move that gets
past every test reaches `return 'step'`. Tomorrow `moveKind` learns a second answer, `'jump'`;
on day four it learns kings. Each time, it is the only function that changes, because the click,
the jump-again check and the online check all just ask it.

## Making the move

When the move is legal, `doMove` changes the grid and passes the turn. Moving a piece is two
letters: write it at the new square, and empty the old one.

```js
function doMove(fr, fc, tr, tc) {
  grid[tr][tc] = grid[fr][fc];
  grid[fr][fc] = '';
  picked = null;
  turn = turn === 'r' ? 'b' : 'r';
  message = nameOf(turn) + "'s turn";
}
```

`turn === 'r' ? 'b' : 'r'` is "black if it was red, red if it was black". `nameOf(t)` turns the
letter into a word for the top strip: `return t === 'r' ? 'Red' : 'Black';`.

The click ties it together. `clickAt(x, y)` turns the pixel into a square, picks up your own
piece if you clicked one, and otherwise asks `isLegal` and, only if it says yes, calls `doMove`:

```js
if (picked !== null && isLegal(picked.r, picked.c, r, c)) doMove(picked.r, picked.c, r, c);
```
