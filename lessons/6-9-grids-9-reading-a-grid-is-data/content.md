## A grid is data

**Read before `6.9.10 Lab: Light the grid`.** About 12 minutes.

By the end of this reading you should be able to answer:

- Why does a click change the grid and not the picture?
- What does `rect(x, y, w, h)` take as its x and y?
- How do you turn a click into a row and a column when the grid does not start at the top of the canvas?
- What must you check before you read a cell, and why?

**The Coin Maze map was text you could read but not change.** `map[1][2] = 'x'` does nothing, because a string cannot be changed one letter at a time. A grid you want to change while the game runs needs to be an **array of arrays**, like the tic-tac-toe board in 3.3.21: `grid[r][c]` is row `r`, cell `c`, and `grid.length` counts the rows.

**The grid is the truth. The screen is a picture drawn from it, every frame.** This is the one idea of the rest of the module. To change what the player sees, you do not touch the picture: you change the data, and the next `draw()` paints the new data. A lit cell that must go dark is not "repaint this square"; it is `grid[r][c] = false`.

**Building a grid.** Make an empty list for the grid, then for each row make an empty list for the row, push the cells into it, and push the finished row onto the grid. The whole row goes in as ONE item, which is why there are two loops, one inside the other (2.4.24):

```js
const g = [];
for (let r = 0; r < 3; r++) {
  const row = [];
  for (let c = 0; c < 4; c++) {
    row.push(false);
  }
  g.push(row);
}
```

That is 3 rows of 4 cells, every cell `false`. Row first, then column: `r` before `c` everywhere in this module.

**Drawing it.** Two loops visit every cell, and each cell is one `rect`:

```js
for (let r = 0; r < grid.length; r++) {
  for (let c = 0; c < grid[r].length; c++) {
    fill(grid[r][c] ? 'gold' : '#334');
    rect(c * CELL, r * CELL, CELL, CELL);
  }
}
```

Three things in those four lines are new:

- **`rect(x, y, w, h)`: x and y are the TOP-LEFT corner.** A sprite's x and y are its centre, but a `rect` hangs down and to the right from the point you give it. So the cell in column `c` starts at `c * CELL`, with no half-cell added. (The half is for a sprite sitting in the middle of a cell, as in 5.13.2.)
- **`fill(...)` comes first, and it colours everything drawn after it.** The colour of a `rect` is whatever the last `fill` said. The thin black outline is the default, and it is what makes the grid lines.
- **Loop over the data's own size**, `grid.length` and `grid[r].length`, so the loop can never disagree with the data. A cell that holds `true` or `false` can be tested on its own: `grid[r][c] ? 'gold' : '#334'` means "gold if lit, dark if not" (the `? :` from 2.1.20). A grid of 1s and 0s can do the same by drawing only where the cell is 1, and a gap draws nothing.
- **Test a cell the way the grid stores it.** The live block below holds numbers, so it asks `=== 1`. A grid of `true` and `false` (the next lab) is tested on its own, as in `grid[r][c] ? 'gold' : '#334'`. Copy the `=== 1` onto a grid of booleans and `true === 1` is `false`: nothing ever lights, and no error tells you.

**Click to cell.** The mouse gives pixels. The grid speaks rows and columns. Divide by the cell size and cut off the fraction with `floor`, the same conversion as `tileAt` in 6.9.5:

```js
const c = floor(mouse.x / CELL);
const r = floor((mouse.y - TOP) / CELL);
```

**If the grid does not start at pixel 0, take the offset off before dividing, and add it back when drawing.** In the example below the grid starts `TOP = 40` pixels down, because the words live in a strip above it. A click at y = 70 is only 30 pixels into the grid, so it is row `floor(30 / 60)`, row 0. Dividing 70 by 60 without taking the 40 off would say row 1: the click would land on the row below the one you can see it in. When you draw, the offset goes back on: `TOP + r * CELL`.

**Check the cell exists before you touch it.** The click can land anywhere: in the strip, below the grid, off the edge. A row that does not exist is `undefined`, and reading a cell of `undefined` stops the whole sketch with an error. So test first:

```js
if (r >= 0 && r < grid.length && c >= 0 && c < grid[r].length) {
  // safe: row r and column c are really there
}
```

`&&` stops at the first part that is false (2.1.29), so the row tests come before anything reads `grid[r]`. Put `c < grid[r].length` before `r < grid.length` and a bad row would be read too soon.

**Changing a cell.** A boolean flips with `!` (2.1.33): `grid[r][c] = !grid[r][c]` turns lit into dark and dark into lit. A cell that holds 1 or 0 can be set with `grid[r][c] = 0`, or flipped with `grid[r][c] = grid[r][c] === 1 ? 0 : 1`.

**Counting cells.** Two loops and an `if`: start `n` at 0, and add 1 for every cell that passes the test. The same shape counts lit cells and bricks left.

**Words.** Text uses the last `fill` too, so write `fill('white')` before `text(...)`. Words go in `drawTop()`, as in the other moSHion labs.

**Where this goes next.** In the Coin Maze, `Tiles` made sprites from letters that could not change. A grid of numbers can change, and sprites made from it would be one more picture of it. The next two labs draw straight from the data with `rect`, because a wall of 40 rectangles costs the computer almost nothing.

The grid below is 6 columns by 5 rows and starts 40 pixels down. Click a cell to flip it between orange and dark. The line at the top prints row 0.

```js live
// A grid is data. The picture is drawn FROM the grid, and a click changes the grid.
const CELL = 60;   // each cell is 60 by 60 pixels
const TOP = 40;    // the grid starts 40 pixels down; the words live in the strip above it

const grid = [
  [0, 1, 0, 0, 1, 0],
  [1, 1, 0, 0, 1, 1],
  [0, 0, 1, 1, 0, 0],
  [1, 0, 0, 0, 0, 1],
  [0, 1, 1, 1, 1, 0],
];

function setup() {
  new Canvas(360, 360);
}

function draw() {
  background('#111');

  if (mouse.presses()) {
    const c = floor(mouse.x / CELL);          // pixels -> column
    const r = floor((mouse.y - TOP) / CELL);  // pixels -> row (take the top strip off first)
    // The click can land anywhere, so check the cell exists before touching it.
    if (r >= 0 && r < grid.length && c >= 0 && c < grid[r].length) {
      grid[r][c] = grid[r][c] === 1 ? 0 : 1;
    }
  }

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      fill(grid[r][c] === 1 ? 'orange' : '#334');
      rect(c * CELL, TOP + r * CELL, CELL, CELL);   // x, y is the TOP-LEFT corner
    }
  }
}

function drawTop() {
  fill('white');
  textSize(16);
  text('row 0 is: ' + grid[0].join(' '), 12, 24);
}
```

**What you'll see:** a grid of orange and dark squares. Clicking one flips it, and the numbers on the top line change when you click in row 0.

**Try this:**

1. Click in the strip above the grid, and under it. Nothing happens: the bounds check refuses a row that is not there.
2. Delete the `r >= 0 &&` half of the test, press Run, and click the strip above the grid. The click gives row -1, `grid[-1]` is `undefined`, and the sketch stops with an error. Put it back.
3. Change `TOP` to `0` and Run. The grid sits against the top and the words are covered by it, but the clicks still work, because the same `TOP` is used to draw and to divide.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **grid** | an array of arrays: rows of cells you can change |
| **cell** | one place in the grid, read as `grid[r][c]` |
| **offset** | how far the grid starts from the top-left of the canvas; take it off before dividing, add it back when drawing |
| **bounds** | the edges of the grid; a row or column outside them is `undefined` |
