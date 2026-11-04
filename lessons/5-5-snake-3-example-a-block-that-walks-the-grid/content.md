## A block that walks the grid

**Read before `5.13.4 Lab: Steer it`.** About 8 minutes.

The block keeps its column and row, moves them on a beat, and only then turns them into pixels.

```js live
const CELL = 20;
let block;

function cellToPixel(n) {
  return n * CELL + CELL / 2;
}

function setup() {
  new Canvas(400, 400);
  block = new Sprite(cellToPixel(0), cellToPixel(10), CELL - 2, CELL - 2, 'static');
  block.color = 'limegreen';
  block.col = 0;
  block.row = 10;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('col ' + block.col, 20, 28);

  if (frameCount % 8 === 0) {
    block.col += 1;
    if (block.col >= 20) block.col = 0;
    block.x = cellToPixel(block.col);
  }
}
```

**What you'll see:** the block jumps one cell about seven times a second, and when it reaches the right edge it reappears on the left. The number shows its column.

**Try this:**

1. Change `frameCount % 8` to `frameCount % 3`. The block is faster because the beat is shorter.
2. Change `block.col += 1` to `block.col += 2`. It moves two cells per step.
3. Remove the line `block.x = cellToPixel(block.col);`. The column keeps counting but the block never moves. The sprite's position only changes when you set it.
