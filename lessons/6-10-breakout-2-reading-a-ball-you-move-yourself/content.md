## A ball you move yourself

**Read before `6.10.4 Lab: The paddle`.** About 10 minutes.

By the end of this reading you should be able to answer:

- Why is the ball moved by your own code instead of by physics?
- What does flipping the sign of `vx` do?
- Why does the ball touch the left wall at `x = R`, not at `x = 0`?
- Why does the paddle bounce the ball only while it is coming down?
- How does the paddle steer the ball?

**The ball is moved by your code.** Like the drone and the shots in Defender (7.4.5), the ball has `collider = 'none'`: nothing pushes it, nothing slows it down, and gravity leaves it alone. Two variables hold its speed in pixels per frame. `vx` is the speed across: plus is right, minus is left. `vy` is the speed down: plus is down and minus is up, because y grows downward on the canvas (5.1.15). Every frame the ball takes one step:

```js
ball.x += vx;
ball.y += vy;
```

Why not let physics bounce it, with the `bounciness` of 5.2.11? Because the bricks will not be sprites at all: they are data, a list of rows (6.9.9), so there would be nothing for a physics ball to bounce off. And the paddle steers the ball by setting its speed, which is simplest when the speed is two numbers your own code owns.

**A bounce is a flipped sign.** When the ball reaches the right wall it has to go left at the same speed. `vx = -vx` turns `3` into `-3`. At the left wall the same line turns `-3` back into `3`. The top flips `vy` the same way. The speed never changes, only its direction.

**`x` is the centre, so the wall is `R` away.** A sprite's x and y are its centre (5.1.6). The ball is 12 pixels wide, so its radius, `R`, is 6, and its left side touches the left wall when `ball.x` is 6, not 0. The canvas is 400 wide, so its right side touches the right wall when `ball.x` is `400 - R`. Each side wall turns only a ball that is moving into it, `vx < 0` (going left) at the left wall and `vx > 0` (going right) at the right one; the paddle section below says why:

```js
if (ball.x < R && vx < 0) vx = -vx;
if (ball.x > 400 - R && vx > 0) vx = -vx;
if (ball.y < R) vy = -vy;
```

Test against 0 and 400 instead and half of the ball goes into the wall before it turns.

**The bottom is open.** There is no fourth wall. A ball whose y is more than `400 + R` has gone right past the bottom edge, and the game serves a new one: `serve()` puts the ball back above the paddle with its starting speed.

**The paddle.** The paddle is a `'static'` sprite, like Defender's ship (7.4.5): it never falls and nothing pushes it, and your code moves it. A variable `control` says how the player steers, `'mouse'` or `'keys'`:

- with the mouse: `paddle.x = mouse.x;` every frame (6.7.3), so the paddle sits under the pointer;
- with the keys: `if (kb.pressing('left')) paddle.x -= 6;`, and the same with `'right'` and `+= 6` (5.1.13).

Only `paddle.x` changes, so the paddle slides along its row. Like the ball, its x is its centre. It is 80 wide (`PADDLE_W`), so it is fully on the screen while its x is at least `PADDLE_W / 2` (40) and at most `400 - PADDLE_W / 2` (360). If it goes past, put it back on the edge:

```js
if (paddle.x < PADDLE_W / 2) paddle.x = PADDLE_W / 2;
if (paddle.x > 400 - PADDLE_W / 2) paddle.x = 400 - PADDLE_W / 2;
```

**Off the paddle, only while coming down.** `ball.overlaps(paddle)` is true on every frame the two touch, not only the first (7.4.5). If the paddle slides into the ball from the side, they can touch for several frames in a row, and flipping `vy` on every one of them sends the ball up, down, up: it shivers along the paddle. So the bounce happens only while the ball is falling, `vy > 0`. Inside the `if`, the first line flips `vy`; the second sets `vx` from where the ball landed on the paddle, which aims it ("The paddle steers", below):

```js
if (ball.overlaps(paddle) && vy > 0) {
  vy = -vy;
  vx = (ball.x - paddle.x) / 10;
}
```

After the flip `vy` is negative, so the test stays false until the ball comes down again. The side walls test the direction for the same reason: the paddle can steer a ball back toward a wall it is still touching, and a wall that flipped on `ball.x < R` alone would flip it again on every frame and glue it to the wall, so `&& vx < 0` (and `&& vx > 0` on the right) lets a wall turn only a ball that is moving into it.

**The paddle steers.** The second line inside that `if` is what makes Breakout a game you play rather than watch. `ball.x - paddle.x` is how far from the paddle's centre the ball landed: the "from A to B" subtraction of 6.8.8. It is negative on the left half of the paddle, positive on the right half, and near 0 in the middle. Divided by 10 it becomes the new `vx`. Catch the ball on the left end and it flies off to the left; on the right end, to the right; in the middle, nearly straight up. Without that line the player cannot aim: the paddle only sends the ball back up, and where it goes next was decided before it landed.

The next screen puts all of this in one running sketch.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **`vx`, `vy`** | the ball's speed in pixels per frame: across (+ right) and down (+ down) |
| **flip the sign** | `vx = -vx`: the same speed, the other way |
| **`R`** | the ball's radius, half its width: how far its edge is from its centre |
| **serve** | put the ball back in play with its starting speed |
| **steer** | set `vx` from where the ball landed on the paddle |
