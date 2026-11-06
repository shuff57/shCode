## A world on a grid

**Read before `5.13.3 Worked Example: A block that walks the grid`.** About 7 minutes.

By the end of this reading you should be able to answer:

- What is a cell, and how is it different from a pixel?
- How do you turn a column and a row into a position on the canvas?
- How do you make something move one cell at a time instead of smoothly?

**Pinball and Flappy moved things by pixels.** Snake does not. It moves in whole steps on a grid, the way a chess piece moves from one square to the next. The canvas is 400 pixels wide and each cell is 20 pixels, so the grid is 20 cells across and 20 down.

**Name a cell by its column and row.** The cell in the top-left corner is column 0, row 0. One step right is column 1, row 0. The game keeps columns and rows as the truth, and works out the pixel position only when it needs to draw:

```js
const CELL = 20;

function cellToPixel(n) {
  return n * CELL + CELL / 2;
}
```

Adding half a cell puts the *centre* of the sprite in the centre of the cell, because a sprite's `x` and `y` are its centre. Column 3 lands at `3 * 20 + 10 = 70`.

**Store the cell on the sprite.** A sprite is an object, so you can give it your own properties, the same way the bumpers carried a `worth` in 5.4.5:

```js
const s = new Sprite(cellToPixel(3), cellToPixel(5), CELL - 2, CELL - 2, 'static');
s.col = 3;
s.row = 5;
```

The sprite is made 2 pixels smaller than the cell, so a thin gap shows between neighbouring cells.

**Pick a name moSHion does not already use.** Every sprite already has some properties, and storing your own value under one of their names does not make a new property: it changes the sprite. `s.life = 3` deletes the sprite three frames later, `speed` and `direction` change how it moves, `mass` changes how heavy it is, and `color` and `text` change how it looks. Other names a sprite already has: `x`, `y`, `w`, `h`, `d`, `rotation`, `scale`, `visible`, `layer` and `shape`. Words like `col`, `row`, `worth`, `points` and `wasTouching` are free, so use names like those.

**Move on a beat.** If the snake moved every frame it would cross the canvas in under a second. Instead the game moves it only once every few frames, using the beat from 5.11.1:

```js
if (frameCount % 8 === 0) {
  // runs every 8th frame: about 7 steps a second
}
```

Change the 8 and the whole game speeds up or slows down. A smaller number is a faster snake.

**Random cells.** The food needs a random cell. `random(20)` gives a number from 0 up to, but not including, 20, with decimals, as 5.2.2 showed. `floor` cuts off the decimals, so `floor(random(20))` is a whole column from 0 to 19:

```js
const col = floor(random(20));
```

**Words go on top, as in Flappy.** The snake's cells are sprites, and moSHion draws the sprites after `draw()` has finished, so a score written in `draw()` would disappear under the snake whenever it crosses the top of the grid. The Snake labs write their words in `drawTop()`, the function from 5.11.1 that runs after the sprites are drawn:

```js
function drawTop() {
  fill('white');
  textSize(22);
  text('score: ' + score, 20, 32);
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **cell** | one square of the grid, 20 by 20 pixels here |
| **col, row** | a cell's column and row; the game's real position |
| **beat** | how many frames pass between one step and the next |
