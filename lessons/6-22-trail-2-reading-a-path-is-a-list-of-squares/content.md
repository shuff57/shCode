## A board is a list of squares

**Read before 6.22.3 Sub-build: A path from a list.** About 10 minutes.

A race board is a list of squares, in the order you walk them. Each square is an object with an
`x` and a `y`: the pixel at its centre.

```js
let path = [
  { x: 60, y: 60 },
  { x: 140, y: 60 },
  { x: 220, y: 60 },
];
```

`path[0]` is the first square, `path[2].x` is the third square's x, and `path.length` is how
many squares there are. A token is just a number: `at = 2` means "standing on square 2".

**Drawing the board is one loop.** Visit every square and draw a box there. `rect(x, y, w, h)`
starts at the top-left corner (6.14.9), so take half the box off the centre. A fifth number
rounds the corners.

```js
for (let i = 0; i < path.length; i++) {
  fill('#2d3045');
  rect(path[i].x - 30, path[i].y - 30, 60, 60, 6);
  text(String(i), path[i].x - 5, path[i].y + 6, 16, 'white');
}
```

`text(words, x, y, size, color)` writes on the canvas, and `String(i)` turns the number `i` into
text so it can be written.

## The track is text

Typing 31 squares by hand is slow and easy to get wrong. In 6.14.2 a level was text, and so is
this board: ONE line of text, one letter per square.

```js
const TRACK = '....J....S..W..J.....S..W.J.S.F';
```

Inside `makePath(track)` the text arrives as `track`: `track[i]` is square i's letter and
`track.length` counts the squares. A `.` is a plain square
and `F` is the finish. The other letters will do something on day three.

**Row and column from an index.** The board is `COLS` squares wide. Square i sits in row
`floor(i / COLS)` and column `i % COLS`: the same divide-and-cut that turned a click into a cell
in 6.14.9. With `COLS = 10`, square 13 is row 1, column 3.

**Snake the odd rows.** If every row ran left to right, the path would leap from the right end
of one row to the left end of the next. So on an odd row, count the column from the right:

```js
const r = floor(i / COLS);
let c = i % COLS;
if (r % 2 === 1) c = COLS - 1 - c;
```

`c` is `let` because it may change. Square 13 now sits in column 6, and square 10 sits right
below square 9.

**The centre.** Column `c` starts at `c * SIZE`, so its centre is `c * SIZE + SIZE / 2`. A row is
the same, plus the `TOP` strip where the words go: `TOP + r * SIZE + SIZE / 2`.

**Build the list, then hand it back.** Start with an empty list, `push` one square for each
letter, and `return` the list:

```js
squares.push({ x: c * SIZE + SIZE / 2, y: TOP + r * SIZE + SIZE / 2, kind: track[i] });
```

`kind` keeps the letter with the square, so later code can ask what a square is.
