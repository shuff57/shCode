## `update()` runs before physics

**Read before `5.2.22 Lab: Rules in update(), picture in draw()`.** About 8 minutes.

By the end of this reading you should be able to answer:

- What is `update()`, and when does moSHion run it?
- Why do the keys and the movement go in `update()`, while the background and the words stay in `draw()`?

**A third function moSHion looks for.** Every sketch so far has had two functions: `setup()` runs once at the start, and `draw()` runs on every frame (5.1.3). moSHion looks for one more name, `update()`. You write it the same way, `function update() { ... }`, and moSHion runs it on every frame too. You never call it yourself. It is optional: a sketch without it works exactly as before, which is why none of yours needed it.

**Every frame happens in the same order.** On each frame, moSHion:

1. runs your `update()`,
2. moves every sprite: gravity, velocity and collisions all happen here (this is the physics step),
3. runs your `draw()`,
4. paints the sprites on top of whatever `draw()` drew.

**Why you would want it.** `update()` runs *before* the physics step, so a velocity you set there moves the sprite in that same frame; the same line in `draw()` comes *after* the physics step, so it waits for the next one. That makes `update()` the place for the rules of the game (which key does what, how things move, when a jump is allowed), and `draw()` the place for the picture (the background and the words).

At 60 frames a second you will not see one frame of waiting by eye. The bigger gain is a sketch that reads in two halves: the rules in one function, the picture in the other. Many of the examples in the moSHion docs drawer are written this way, so now you can read them too.

**Try it: the order, in the console.** This sketch writes one line from each function for the first three frames, then stops writing.

```js live console
function setup() {
  new Canvas(300, 120);
}

function update() {
  if (frameCount <= 3) {
    console.log('frame ' + frameCount + ': update');
  }
}

function draw() {
  background('#222');
  if (frameCount <= 3) {
    console.log('frame ' + frameCount + ': draw');
  }
}
```

**What you'll see:** six lines, in this order: `frame 1: update`, `frame 1: draw`, `frame 2: update`, `frame 2: draw`, `frame 3: update`, `frame 3: draw`. Both run on every frame, and `update()` always comes first. (`frameCount` is the frame number from 5.2.1.)

**Try it: the jump scene, split in two.** This is the jump from 5.2.10. The keys, the movement and the jump now live in `update()`; `draw()` keeps only the picture.

```js live
let player, ground;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  player = new Sprite(200, 60, 40, 40);
  player.color = 'deepskyblue';

  ground = new Sprite(200, 380, 400, 20, 'static');
  ground.color = 'gray';
}

// the rules: keys and movement, before physics moves anything
function update() {
  if (kb.pressing('a'))       player.vel.x = -4;
  else if (kb.pressing('d'))  player.vel.x = 4;
  else                        player.vel.x = 0;

  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -7;
  }
}

// the picture: background and words, after physics
function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('a and d move, space jumps', 20, 26);
}
```

Click the canvas first so it hears your keys (5.1.13). It plays exactly like the 5.2.10 version. Nothing new happens on the screen: the same lines simply moved to the function that runs before physics.

**Four things that stay true:**

- **`background()` stays in `draw()`.** `update()` runs before `draw()`, so the `background()` at the top of `draw()` paints over anything `update()` drew.
- **`kb.presses()` works the same in both.** A key that goes down is "pressed" for that whole frame, and `update()` and `draw()` both run in it, so either one sees the press once (5.2.9).
- **The variables at the top are shared.** `player` is made with `let` at the top and set in `setup()`, so `update()` can reach it, exactly as `draw()` always could (5.1.8).
- **Spell it exactly.** moSHion finds the function by its name: `update`, all lower case, written `function update() { ... }` like `setup` and `draw`. `Update` or `updates` is just a function nobody calls, and it never runs.

**Both ways work.** Doing everything in `draw()`, as you have so far, is not wrong. The starters in the rest of this chapter keep their rules in `draw()`; when a lab hands you a starter, build in the function it already uses.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`update()`** | Function you define. moSHion runs it every frame, before the physics step. The place for keys and movement. |
| **physics step** | The part of each frame where moSHion moves the sprites: gravity, velocity and collisions. |
| **`draw()`** | Runs every frame after the physics step, before the sprites are painted. The place for the background and words. |
