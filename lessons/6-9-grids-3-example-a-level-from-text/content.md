## A level from text

**Read before `6.9.4 Lab: Build the maze`.** About 10 minutes.

This level is six rows of text. Press Run, walk the blue square with the arrow keys, and pick up the coins.

```js live
// A level written as rows of text. Change a letter, press Run, and the level changes.
const TILE = 40;   // one tile is 40 by 40 pixels

const map = [
  '##########',
  '#        #',
  '#  c  c  #',
  '#  ##    #',
  '# c    c #',
  '##########',
];

let walls, coins, player, level;

function setup() {
  new Canvas(400, 240);
  world.gravity.y = 0;   // seen from above: nothing falls

  walls = new Group();
  walls.collider = 'static';
  walls.color = 'dimgray';

  coins = new Group();
  coins.collider = 'none';
  coins.diameter = 14;
  coins.color = 'gold';

  // The first tile's centre is (20, 20). Each tile is 40 wide and 40 tall.
  level = new Tiles(map, 20, 20, TILE, TILE, { '#': walls, 'c': coins });

  player = new Sprite(60, 100, 26, 26);
  player.color = 'deepskyblue';
  player.rotationLock = true;
}

function draw() {
  background('#111');
  player.vel.x = 0;
  player.vel.y = 0;
  if (kb.pressing('left'))  player.vel.x = -3;
  if (kb.pressing('right')) player.vel.x = 3;
  if (kb.pressing('up'))    player.vel.y = -3;
  if (kb.pressing('down'))  player.vel.y = 3;

  player.overlaps(coins, (p, coin) => {
    coin.delete();
  });
}

function drawTop() {
  fill('white');
  textSize(14);
  text('tiles in the level: ' + level.length, 12, 24);
  text('walls: ' + walls.length + '   coins: ' + coins.length, 12, 224);
}
```

**What you'll see:** a small maze of dimgray walls, a blue square you move with the arrow keys, and four gold coins that disappear when you touch them. The top line counts the tiles in the level. The bottom line counts the walls and the coins.

**Try this:**

1. Change one `#` in the map to a space and press Run. That wall is gone, because a space is an empty tile.
2. Delete `'c': coins` from the legend and press Run. The coins vanish. The letter is still in the map, but the legend no longer names it, so it is an empty cell.
3. Change `TILE` to `30` and press Run. The level is the wrong size and shifted. Now change the two `20`s in the `Tiles` line to `15` and it sits right again: the centre of the first tile is half a tile in.
4. Delete one letter from one row and press Run. That row has a hole at its end. Count the letters when a level looks wrong.

**What each Try found.** Try 1: a tile is only a wall while its letter is `#`. Try 2: the legend decides which letters build something. Try 3: `x` and `y` after `map` are the centre of the first tile, so they are half a tile, and `TILE / 2` always works. Try 4: every row must be the same length, and nothing warns you.
