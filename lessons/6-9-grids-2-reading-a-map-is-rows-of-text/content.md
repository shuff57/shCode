## A map is rows of text

**Read before `6.14.3 Worked Example: A level from text`.** About 8 minutes.

By the end of this reading you should be able to answer:

- How can a whole level be written as text?
- What is the legend, and what happens to a letter it does not name?
- Where does `new Tiles(...)` put the level, and what does it give back?

**A level can be an array of strings.** Each string is one row of the level and each letter in it is one tile. Here is a small one:

```js
const map = [
  '##########',
  '#        #',
  '#  c  c  #',
  '#  ##    #',
  '# c    c #',
  '##########',
];
```

`#` is a wall and `c` is a coin. A space is an empty floor tile. You can read the level straight off the screen, and you can change it by changing a letter.

**Reading the map.** A map is an array (3.3.2), so `map[2]` is the third row, a whole string. A string is read by position like the words in 2.2.19, so `map[2][5]` is **row 2, column 5**: the letter in that row at that place. Row first, then column, counting from 0. `map.length` is the number of rows and `map[0].length` is the number of letters in a row.

**Every row must be the same length.** If one row is a letter short, that row has a hole at its end and nothing warns you. When a level looks wrong, count the letters.

**Building it with `Tiles`.** moSHion's `Tiles` turns a map into sprites, one per letter:

```js
level = new Tiles(map, 20, 20, 40, 40, { '#': walls, 'c': coins });
```

| Argument | Meaning |
| --- | --- |
| `map` | the array of strings |
| `20, 20` | the **centre** of the top-left tile |
| `40, 40` | the width and height of one tile |
| `{ ... }` | the **legend**: an object from a letter to a Group |

This is moSHion's `Tiles`. If you search online you will find a different form from another library (`group.tile = '#'`); it does not work here.

**The legend names the letters.** `'#': walls` says "every `#` becomes a sprite of the Group `walls`". **A letter the legend does not name is an empty cell.** A space is empty because it is not in the legend, and so is any other letter you leave out. In the next reading you will use that on purpose.

**A Group's defaults are copied onto every sprite made through it**, so you set them once on the Group instead of on each tile:

```js
walls.collider = 'static';   // never moves when something bumps it
coins.collider = 'none';     // the player walks through
coins.diameter = 14;         // a small circle instead of a full tile
```

The Group's own size wins over the tile size, which is why the coins are small circles even though each coin sits in a 40 by 40 tile.

**`x, y` is the centre of the first tile.** Like a sprite's `x` and `y`, the two numbers after `map` are a centre. Tiles are 40 wide, so the first tile fills pixels 0 to 40 and its centre is at 20, not 0. Pass `0, 0` and the whole level sits half a tile up and to the left, with its first row and column cut off by the edge of the canvas. For tiles that start in the corner of the canvas, use `TILE / 2, TILE / 2`.

**`Tiles` gives back a Group.** The result holds every tile it made, so `level.length` counts them and **`level.delete()` removes the whole level in one call**. A tile that is deleted on its own, such as a coin the player picked up, leaves the group. You will use `level.delete()` in 6.14.8 to clear a level before building the next.

**Seen from above, nothing falls.** This maze is a top-down view, so gravity stays off. 5.2.8 set `world.gravity.y` to 10; here it is 0, where every world starts, and the setup writes it out so a reader can see that nothing falls:

```js
world.gravity.y = 0;
player.rotationLock = true;   // so the player does not spin when it catches a corner
```

**Keep a map small.** Every tile is a sprite, and moSHion checks sprites against each other every frame. A map of about 20 by 12 tiles or fewer is comfortable. This module's maps are 10 by 10.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **tile** | one square of the map; one letter |
| **map** | an array of strings, one string per row |
| **legend** | an object that says which Group each letter builds |
| **row, column** | `map[row][column]`; row first, counting from 0 |
| **centre** | the middle of a tile, half a tile in from its corner |
