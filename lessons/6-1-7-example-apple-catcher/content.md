**Goal:** put the `overlaps(group, callback)` idiom to work: a basket that catches falling apples, scoring on contact, with safe per-frame cleanup of off-screen sprites.

## Step 1: Hit Run

WASD-controlled basket at the bottom; apples spawn at the top every 30 frames and fall with constant velocity. Each catch increments the score; misses get cleaned up off-screen.

```js live
let basket, apples, score = 0;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0;

  basket = new Sprite(200, 370, 70, 15, 'kinematic');
  basket.color = 'saddlebrown';

  apples = new Group();
  apples.color = 'red';
  apples.diameter = 22;
  apples.collider = 'none';
}

function draw() {
  background('#113311');

  if (kb.pressing('a')) basket.vel.x = -4;
  else if (kb.pressing('d')) basket.vel.x = 4;
  else basket.vel.x = 0;

  if (frameCount % 30 === 0) {
    let a = new apples.Sprite(20 + Math.random() * 360, -20);
    a.vel.y = 3;
  }

  basket.overlaps(apples, (b, apple) => {
    score++;
    apple.delete();
  });

  for (let a of [...apples]) {
    if (a.y > 450) a.delete();
  }

  fill('white');
  textSize(24);
  text('Score: ' + score, 14, 30);
}
```

Click the canvas to focus, then hold **A** / **D** to slide the basket. Every catch increments the score: that's the overlap callback firing.

## Step 2: Notice the callback shape

The collision-handling line is:

```js
basket.overlaps(apples, (b, apple) => {
  score++;
  apple.delete();
});
```

`overlaps(group, callback)` walks every sprite in the group, calls the callback once per pair currently overlapping, and passes both sprites in. The callback is the right place to call `apple.delete()`: moSHion has already finished iterating, so destroying a sprite doesn't trip the iteration bug.

The boolean form (`basket.overlaps(apples)`) returns `true` if any apple is overlapping. Use that for "did anything hit me this frame" gates (game-over checks, hit flashes). Use the callback form for per-pair work.

## Step 3: Why two cleanup passes?

The callback deletes apples that the basket caught. But an apple that **misses** the basket and falls off the bottom never overlaps anything: it would live forever, slowing the sketch down.

The trailing manual loop handles those:

```js
for (let a of [...apples]) {
  if (a.y > 450) a.delete();
}
```

`[...apples]` makes a shallow copy of the Group's array so deleting during iteration doesn't shift the index under the loop. (You'll see the bug live in `6.2.5 Worked Example: Safe Despawn`.)

## Step 4: `sprite.delete()` vs `group.remove(sprite)`

Two different operations that look almost identical at the call site:

- **`sprite.delete()`**: destroys the sprite. Tears down its physics body and removes it from **every** group it belongs to (including the implicit `allSprites`). After this, the sprite is gone from the world. Use this whenever the sprite should disappear from the game (caught apple, defeated enemy, off-screen projectile).
- **`group.remove(sprite)`**, only **unparents** the sprite from that one group. The sprite still exists, still draws, still runs physics. Use this when you want to move a sprite *between* groups (e.g., promoting an enemy out of the `easy` group into the `boss` group), not for cleanup.

The catch callback and the off-screen loop both want the apple **gone**, so both call `apple.delete()`. There is no `sprite.remove()`: that name only exists on `Group`.

## Step 5: Spawn rate as the difficulty knob

`if (frameCount % 30 === 0)` spawns once every 30 frames, about twice per second at 60 fps. Try `% 60` (one per second, easier) or `% 10` (six per second, frantic). The same pattern drives nearly every "spawn enemies on a timer" mechanic.

## Key takeaways

- `overlaps(group, callback)` is the cleanest idiom for "do X to every sprite touching me right now." Call `sprite.delete()` inside the callback freely: moSHion has finished its own iteration before invoking your callback.
- Use the boolean form `overlaps(group)` only when you want a yes/no signal, not per-pair work.
- Off-screen / out-of-bounds cleanup is a separate loop: iterate a copy `[...group]` so `delete()` doesn't shift the index.
- `sprite.delete()` destroys; `group.remove(sprite)` only unparents. For cleanup, you almost always want `delete()`.
- `frameCount % N === 0` is the moSHion timed-spawn idiom. `N` is your difficulty knob.
- A `kinematic` body moves with `vel` but isn't pushed by gravity or collisions: perfect for a controllable basket / paddle.
