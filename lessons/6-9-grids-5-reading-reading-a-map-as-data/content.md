## Reading a map as data

**Read before `6.14.6 Lab: Find the start`.** About 12 minutes.

By the end of this reading you should be able to answer:

- How does your own code find the `P` in a map, and why does it have to?
- How do you turn a row and column into the pixel centre of a tile, and a pixel back into a row and column?
- Why must you check the row and column exist before reading `map[r][c]`?

**One map, two uses.** In 6.14.2 `Tiles` turned the map into sprites. But the map is also just an array of strings, so your own code can read it as data, for things `Tiles` cannot do. The first one is finding where the player starts.

**Scan it with two loops.** To look at every letter, loop over the rows with `r`, and inside that loop over the letters of the row with `c`. This is the nested loop from 2.4.24: the inner loop finishes for every step of the outer one. Test `map[r][c]` inside. For example, to count the coins:

```js
let n = 0;
for (let r = 0; r < map.length; r++) {
  for (let c = 0; c < map[r].length; c++) {
    if (map[r][c] === 'c') {
      n += 1;
    }
  }
}
```

**`P` is not in the legend.** The legend names `#`, `c` and `G`. A letter the legend does not name is an empty cell, so `Tiles` ignores the `P`. Your scan is how you find it.

**Handing back two numbers.** A function can `return` one value, but that value can be an object holding two numbers (3.5.3, 3.2.11):

```js
function findStart(map) {
  // ... scan the map ...
  return { x: 60, y: 60 };
}

const start = findStart(map);
player.x = start.x;
```

Decide what to hand back when the letter is missing: the lab returns the centre of the top-left tile.

**Cells to pixels.** The map speaks in rows and columns. Sprites speak in pixels. The centre of column `c` is `c * TILE + TILE / 2`: column 3 of 40-pixel tiles starts at 120 and its centre is half a tile further, 140. The row works the same way with `r`. This is the same rule as 5.13.2's `cellToPixel`, now applied to a map you did not place yourself.

**Pixels back to a cell.** Going the other way, the column is `floor(x / TILE)` and the row is `floor(y / TILE)`. With `x = 150` and `TILE = 40`, `150 / 40` is 3.75, and `floor` cuts off the 0.75 and leaves 3, the tile the pixel is inside. `round` would say 4, which is the next tile along. Use `floor`.

**Where pixels and cells meet.** These two conversions are the only place the two meet. The lab calls the pair `findStart` (cells to pixels) and `tileAt` (pixels to a cell). Every game that mixes a map with sprites needs exactly these two.

**A row or column can fall off the map.** A pixel in a canvas bigger than the map, or a tile one step past an edge, gives a row of -1 or 10, and there is no `map[-1]`. A row that does not exist is `undefined`, and reading a letter from `undefined` stops the sketch with an error. Check that the row and column exist first:

```js
if (r >= 0 && r < map.length && c >= 0 && c < map[r].length) {
  // safe to read map[r][c]
}
```

`&&` stops at the first test that is false, so the row tests come before anything reads `map[r]`.

**A string cannot be changed letter by letter.** `map[1][2] = 'x'` does nothing, and nothing warns you. The map is text you can read but not edit. To change a grid while the game runs you need an array of arrays, which is 6.14.9.

**A game with several levels keeps a list of maps.** `levels[0]` is a whole map, `levels[1][3][2]` is one letter of the second level, and `levels.length` is how many levels there are. The last lab of the maze uses exactly this.

Try the live block. It scans for the `P` and shows its pixel position; move the mouse over the maze and the bottom line says which letter is under it.

```js live
// Scan the map for the letter P, then show which tile is under the mouse.
const TILE = 40;   // one tile is 40 by 40 pixels

const map = [
  '##########',
  '#P  c    #',
  '# ###### #',
  '#c      c#',
  '# # #### #',
  '#   #  c #',
  '### # ## #',
  '#c  #    #',
  '#  ## ##G#',
  '##########',
];

let walls, coins, hero, startX, startY;

function setup() {
  new Canvas(400, 400);

  walls = new Group();
  walls.collider = 'static';
  walls.color = 'dimgray';
  coins = new Group();
  coins.collider = 'none';
  coins.diameter = 14;
  coins.color = 'gold';
  new Tiles(map, TILE / 2, TILE / 2, TILE, TILE, { '#': walls, 'c': coins });

  // Look at every letter. When it is the P, turn its row and column into pixels.
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      if (map[r][c] === 'P') {
        startX = c * TILE + TILE / 2;
        startY = r * TILE + TILE / 2;
      }
    }
  }
  hero = new Sprite(startX, startY, 26, 26, 'static');
  hero.color = 'deepskyblue';
}

function drawTop() {
  // Back: turn the mouse's pixels into a column and a row.
  const c = floor(mouse.x / TILE);
  const r = floor(mouse.y / TILE);
  fill('white');
  textSize(16);
  text('P was found at ' + startX + ', ' + startY, 12, 24);
  // Check the row and column exist before reading them.
  if (r >= 0 && r < map.length && c >= 0 && c < map[r].length) {
    text('row ' + r + ', column ' + c + ' holds [' + map[r][c] + ']', 12, 392);
  }
}
```

**What you'll see:** the maze with a blue square standing on the `P`. The top line says where the `P` was found. The bottom line follows the mouse: `row 3, column 6 holds [c]`.

**Try this:**

1. Change `'P'` in the scan to `'G'`. The blue square jumps to the goal, because the scan found a different letter.
2. Change `floor(mouse.x / TILE)` to `round(mouse.x / TILE)`. The row and column are now wrong for the right half of each tile.
3. Change `new Canvas(400, 400)` to `new Canvas(400, 440)` and delete `r < map.length && ` from the test. Press Run and move the mouse into the empty strip under the maze. The row is 10, `map[10]` is `undefined`, and the sketch stops with an error. Put it back.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **scan** | look at every cell of a grid with two loops |
| **floor** | round down: 3.75 becomes 3 |
| **bounds** | the edges of the grid; a row or column outside them does not exist |
| **undefined** | what you get from an index that is not there; reading a cell of it stops the sketch |
