## Moving on its own: `frameCount` and `sin()`

Read before `5.1.23 Sprite Playground`. About 8 minutes.

By the end of this reading you should be able to answer:

- What is `frameCount`, and how much does it go up each frame?
- What numbers does `sin()` give back, and why does that make a sprite swing back and forth?
- What are two simpler ways to make a sprite move with no key held?

So far a sprite moved because you held a key, or because a velocity carried it off the canvas. Sometimes you want a sprite that moves by itself and stays on screen: a platform sliding back and forth, a coin that spins. This reading shows how.

**What you'll learn from it:**

- `frameCount` is a counter moSHion keeps for you. It goes up by one every frame: `1` on the first frame, `2` on the next, and so on. At about 60 frames a second it reaches 60 after one second and 600 after ten.
- `sin(n)` takes a number and gives back a number between `-1` and `1`. As `n` grows steadily, the answer glides up to `1`, back down through `0` to `-1`, and up again, over and over: a smooth wave.
- moSHion's `sin()` counts in **radians**, not the degrees that `rotation` uses. You don't need radians here. Just know that the wave repeats each time the number inside `sin()` grows by about `6.28`.
- `sin()` is moSHion's short name for JavaScript's own `Math.sin()`: both give exactly the same number. This course writes `sin()`, but `Math.sin()` works too if you meet it somewhere else.
- Put the two together: `sin(frameCount * 0.05)` swings between `-1` and `1` all by itself, because `frameCount` never stops growing.

**Try it:**

```js live
let mover;

function setup() {
  new Canvas(400, 240);
  mover = new Sprite(200, 120, 40, 40);
  mover.color = 'orange';
}

function draw() {
  background('#222');
  mover.pos.x = 200 + sin(frameCount * 0.05) * 100;
}
```

Read the moving line from the inside out:

- `frameCount * 0.05` makes the counter grow slowly, so the wave is slow enough to see. One full swing, there and back, takes about 126 frames: a little over 2 seconds.
- `sin(...)` turns that into a number swinging between `-1` and `1`.
- `* 100` stretches it to between `-100` and `100`.
- `200 +` centres the swing on x = 200, the middle of the canvas. So `pos.x` goes back and forth between 100 and 300, forever.

**What you'll see:** an orange square sliding smoothly left and right across the middle of the canvas. It slows down at each end before it turns back.

**Try this:**

1. Change `100` to `40` and rerun. The swing gets smaller.
2. Change `0.05` to `0.1`. The square goes back and forth twice as fast.
3. Add `mover.pos.y = 120 + cos(frameCount * 0.05) * 100;` on the line below. `cos()` is the partner of `sin()`: the same wave, a quarter of a swing later. With `sin` moving x and `cos` moving y, the square goes round in a circle.
4. Add `mover.rotation = frameCount * 2;` as well. `rotation` is in degrees (5.1.10), so this turns the square 2 degrees every frame: one full turn every 3 seconds.

**Simpler ways count too.** A sprite moves on its own whenever something changes it every frame without a key. These work as well:

- `mover.pos.x = mover.pos.x + 1;` in `draw()`, as in 5.1.9: the sprite creeps right one pixel a frame, and leaves the canvas in the end.
- `mover.vel.x = 2;` once in `setup()`, as in 5.1.15: the engine carries it along, and it leaves the canvas in the end too.
- `mover.rotation = mover.rotation + 3;` in `draw()`: it spins in place.
- `mover.rotationSpeed = 3;` once in `setup()`: `rotationSpeed` is the spinning version of `vel`, in degrees per frame, and the engine keeps turning the sprite for you.

The `sin()` way is the one to pick when the sprite should stay on screen.

**Try it: one sprite you drive, one that moves itself**

This is the shape the Sprite Playground asks for. Click the canvas, then hold **a** or **d**.

```js live
let player, mover;

function setup() {
  new Canvas(400, 240);
  player = new Sprite(80, 120, 40, 40);
  player.color = 'deepskyblue';

  mover = new Sprite(280, 120, 30, 30);
  mover.color = 'orange';
  mover.collider = 'none';
}

function draw() {
  background('#222');

  if (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x = 4;
  else player.vel.x = 0;

  mover.pos.y = 120 + sin(frameCount * 0.05) * 80;
}
```

**What you'll see:** the blue square moves left and right while you hold **a** or **d** and stops when you let go. The orange square bobs up and down on its own the whole time, whether you press a key or not. Nothing stops the blue square at the edge, so if you hold a key for long it runs off the canvas: hold the other key to bring it back.

**The new line, `mover.collider = 'none';`,** makes the orange square a sprite that does not bump into anything: the blue one passes straight through it. **Try this:** delete that line, rerun, and drive the blue square into the orange one. Now they crash: both get knocked crooked, and sometimes the orange square is shoved right off its path.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`frameCount`** | A counter moSHion keeps: `1` on the first frame, then one more every frame. |
| **`sin(n)`** | Gives back a number between `-1` and `1`. As `n` grows, the answer swings smoothly back and forth. The same as `Math.sin(n)`. |
| **`cos(n)`** | The partner of `sin()`: the same wave, a quarter of a swing later. `sin` for x and `cos` for y makes a circle. |
| **Radians** | The angle unit `sin()` and `cos()` use. The wave repeats every time the number inside grows by about `6.28`. |
| **`rotationSpeed`** | How many degrees a sprite turns each frame. Set it once and the engine keeps it spinning. |
| **`collider = 'none'`** | Makes a sprite that does not bump into anything: other sprites pass straight through it. |
