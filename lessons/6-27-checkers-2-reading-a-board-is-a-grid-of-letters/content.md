## A board is a grid of letters

**Read before 6.27.3 Sub-build: A checkered board.** About 12 minutes.

In 6.14.9 a grid you can change was an array of arrays: `grid[r][c]` is row `r`, column `c`,
and the picture is drawn from the grid every frame. A checkers board is the same idea. Each cell
holds one letter that says what is on that square:

| Letter | What is on the square |
| --- | --- |
| `''` | nothing: an empty square |
| `'r'` | a red piece |
| `'b'` | a black piece |

(On day four two more letters arrive, for kings.) The board has 8 rows and 8 columns, so
`const N = 8;` and every loop runs to `N`.

**Building the grid** is 6.14.9's two loops: an empty list for the board, an empty list for each
row, one cell pushed per column, and the finished row pushed onto the board.

```js
function makeBoard() {
  const g = [];
  for (let r = 0; r < N; r++) {
    const row = [];
    for (let c = 0; c < N; c++) {
      let p = '';
      row.push(p);
    }
    g.push(row);
  }
  return g;
}
```

That board is all `''`: 64 empty squares. `p` is `let` because the next part changes it.

## Light and dark squares

Look at a board: the colours take turns along every row, and each row starts with the other
colour. Add the row and the column together. Square (0, 0) adds to 0, square (0, 1) adds to 1,
square (1, 0) adds to 1, square (1, 1) adds to 2. One step in any direction changes the sum by
one, so the sum takes turns between even and odd, exactly like the colours. **A square is dark
when `(r + c) % 2 === 1`**: `%` is the remainder (6.23.1), and an odd number leaves 1 when you
divide it by 2.

Drawing the board is two loops and one `rect` per square. `rect(x, y, w, h)` starts at the
top-left corner (6.14.9), so column `c` starts at `c * CELL`. The `? :`, as in 6.14.9's grid, picks the colour:

```js
for (let r = 0; r < N; r++) {
  for (let c = 0; c < N; c++) {
    fill((r + c) % 2 === 1 ? '#7a5a40' : '#ead9b6');
    rect(c * CELL, r * CELL, CELL, CELL);
  }
}
```

`noStroke()` (6.1.2) first takes away the thin outline, so the squares meet edge to edge.

## Which rows get which letter

Pieces only ever stand on dark squares. Black fills the dark squares of the top three rows
(rows 0, 1 and 2) and red the dark squares of the bottom three (rows 5, 6 and 7). Rows 3 and 4
start empty, so the two sides have room to meet. Each side gets 4 squares in each of 3 rows:
twelve pieces.

So inside `makeBoard`, before `row.push(p)`, a square gets a letter only when it is dark AND in
the right rows:

```js
if ((r + c) % 2 === 1 && r < 3) p = 'b';
```

`r < 3` is true on rows 0, 1 and 2. The red line is the same with the bottom rows instead:
`r > 4` is true on rows 5, 6 and 7.

## The picture is drawn from the grid

The pieces are drawn by visiting every cell, the same two loops again. An empty cell has
nothing to draw, so `continue` skips the rest of the loop's body and goes straight on to the next cell. A piece is a circle at
the centre of its square, `c * CELL + CELL / 2`, and its colour comes from its letter:

```js
const p = grid[r][c];
if (p === '') continue;
fill(colorOf(p) === 'r' ? 'tomato' : '#262626');
circle(c * CELL + CELL / 2, TOP + r * CELL + CELL / 2, CELL * 0.68);
```

`colorOf(p)` answers which side a piece belongs to. Today it just hands the letter back, because
a piece's letter IS its colour. On day four a king's letter will be different, and only
`colorOf` will have to change.

The board also sits `TOP` pixels down, below a strip for words, so every row is drawn at
`TOP + r * CELL` (6.14.9). Counting pieces is 6.14.9's counting shape: two loops, start at 0,
add 1 for every cell of that colour. The words go in `drawTop()`.

**Change the grid, not the picture.** To put a piece somewhere, you never draw it there: you
write its letter into `grid`, and the next frame paints it. Everything else you build in this
chain, picking up, moving, jumping and crowning, is a change to one or two letters in the grid.
