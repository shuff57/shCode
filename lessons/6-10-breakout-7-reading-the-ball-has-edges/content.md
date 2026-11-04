## The ball has edges

**Read before `7.13.3 Lab: Hit with the edges`.** About 10 minutes.

By the end of this reading you should be able to answer:

- Why does testing only the ball's centre let it sink into a brick?
- Which brick can the centre test miss completely?
- Which four points does the edge test ask about, and how is each one worked out?
- Why does a hit at the top or bottom flip `vy`, and a hit at the side flip `vx`?

**What the centre test asks.** In 7.13.1 the ball asked `hitAt(ball.x, ball.y)`: is there a brick under this one pixel, the middle of the ball? The ball is 12 pixels across, so its outside is `R` (6) pixels from that middle in every direction. Two things go wrong because of it.

**It sinks in.** A ball going up reaches a brick with its top first. Its centre gets there `R` pixels later, so by the time `hitAt` says yes, half of the ball is already inside the brick. It does bounce, but late, and you can see it.

**It misses a brick it scrapes.** Picture a ball whose centre goes up through the gap between two bricks, a little to the right of the left one. The ball's left side overlaps that brick by a few pixels on the way past. Its centre is never inside the brick, so `hitAt` never says yes, and the ball slides through the corner of a brick that is still there.

**Test the edges instead.** Straight up, down, left and right of the centre, `R` away, are four points on the ball's edge:

| point | x | y |
| --- | --- | --- |
| top | `ball.x` | `ball.y - R` |
| bottom | `ball.x` | `ball.y + R` |
| left | `ball.x - R` | `ball.y` |
| right | `ball.x + R` | `ball.y` |

y grows downward, so the top of the ball is `ball.y - R`. Ask `hitAt` about each one. It is the same `hitAt` as before: it does not know or care what the pixel belongs to. Only the pixel you hand it changes.

**Which way to bounce.** A brick hit by the top or bottom point is above or below the ball, so the ball must turn back up-and-down: flip `vy`. A brick hit by the left or right point is beside it, so the ball must turn back across: flip `vx`, exactly as at the canvas walls in 7.12.5.

```js
if (hitAt(ball.x, ball.y - R) || hitAt(ball.x, ball.y + R)) vy = -vy;
if (hitAt(ball.x - R, ball.y) || hitAt(ball.x + R, ball.y)) vx = -vx;
```

`||` reads left to right and stops at the first part that is true, the way `&&` stopped at the first part that was false in 6.14.9. So when the top point breaks a brick, the bottom point is not asked on that frame: one hit, one flip. A ball that meets two bricks at once, one above it and one beside it, breaks both, flips both speeds and heads back the way it came.

**Four points are enough here.** A brick's corner can poke in between the top point and the right point, where no point is tested. But the ball moves at most about 5 pixels a frame and a brick is 20 tall and 50 wide, so if the ball keeps going, the next frame's points are inside the brick. A corner that only grazes the ball between two points overlaps it by less than two pixels, which nobody can see.

The sketch below is one row of orange bricks and a big, slow ball (`R` is 12 here, so you can see it) going straight up and down. The red dot is the point the code tests in the centre test. With `useEdges` set to `true`, the four cyan dots are the points it tests instead.

```js live
// The ball's edges. A big, slow ball goes straight up past a row of bricks.
const BW = 50;          // one brick is 50 pixels wide
const BH = 20;          // and 20 tall
const TOP = 100;        // the row of bricks starts 100 pixels down
const R = 12;           // a big ball, so you can see what happens: 24 pixels wide
const START_X = 104;    // where the ball starts across

let useEdges = false;   // false: test only the centre. true: test the four edges.
let bricks = [[0, 1, 0, 1, 0, 1, 0, 1]];
let ball, vx, vy, hits;

function setup() {
  new Canvas(400, 300);
  ball = new Sprite(START_X, 260, R * 2);
  ball.collider = 'none';
  ball.color = 'gold';
  vx = 0;               // straight up and down
  vy = -1;              // one pixel a frame, upwards
  hits = 0;
}

// The same hitAt as in your brick wall, for one row of bricks.
function hitAt(x, y) {
  const c = floor(x / BW);
  const r = floor((y - TOP) / BH);
  if (r >= 0 && r < bricks.length && c >= 0 && c < bricks[r].length && bricks[r][c] === 1) {
    bricks[r][c] = 0;
    hits += 1;
    return true;
  }
  return false;
}

function draw() {
  background('#111');
  ball.x += vx;
  ball.y += vy;
  if (ball.y < R || ball.y > 260) vy = -vy;

  if (useEdges) {
    if (hitAt(ball.x, ball.y - R) || hitAt(ball.x, ball.y + R)) vy = -vy;
    if (hitAt(ball.x - R, ball.y) || hitAt(ball.x + R, ball.y)) vx = -vx;
  } else {
    if (hitAt(ball.x, ball.y)) vy = -vy;
  }

  for (let c = 0; c < bricks[0].length; c++) {
    if (bricks[0][c] === 1) {
      fill('orange');
      rect(c * BW, TOP, BW, BH);
    }
  }
}

function drawTop() {
  // The points the code tests, drawn on top of the ball: red is the centre, cyan the edges.
  fill('red');
  rect(ball.x - 2, ball.y - 2, 4, 4);
  if (useEdges) {
    fill('cyan');
    rect(ball.x - 2, ball.y - R - 2, 4, 4);
    rect(ball.x - 2, ball.y + R - 2, 4, 4);
    rect(ball.x - R - 2, ball.y - 2, 4, 4);
    rect(ball.x + R - 2, ball.y - 2, 4, 4);
  }
  fill('white');
  textSize(16);
  text(useEdges ? 'testing the four edges' : 'testing the centre only', 12, 24);
  text('bricks hit: ' + hits, 12, 290);
}
```

**What you'll see:** the ball's centre goes up through the gap between two bricks, but its left side overlaps the brick on its left as it passes. Nothing happens. It bounces off the top and slides past the brick again on the way down, and `bricks hit` stays 0.

**Try this:**

1. Change `useEdges` to `true` and press Run. The cyan dots are the four edge points. The left one enters the brick as the ball passes, and the brick breaks.
2. Change `START_X` to `75`, the middle of that brick, and set `useEdges` back to `false`. Watch the red dot: the ball is half inside the brick before it turns.
3. Keep `START_X` at `75` and set `useEdges` to `true`. Now the ball turns the moment its top touches the brick.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **centre test** | `hitAt(ball.x, ball.y)`: asks about the middle of the ball only |
| **edge point** | a point on the ball's outside, `R` from the centre: top, bottom, left or right |
| **`R`** | the ball's radius, half of its width |
| **flip `vy` / flip `vx`** | turn back up-and-down for a brick above or below; turn back across for a brick beside |
