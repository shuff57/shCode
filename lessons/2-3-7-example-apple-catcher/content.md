**Goal:** put the `overlaps(group, callback)` idiom to work — a basket that catches falling apples, scoring on contact, with safe per-frame cleanup of off-screen sprites.

## Step 1 — Hit Run

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
    apple.remove();
  });

  for (let a of [...apples]) {
    if (a.y > 450) apples.remove(a);
  }

  fill('white');
  textSize(24);
  text('Score: ' + score, 14, 30);
}
```

Click the canvas to focus, then hold **A** / **D** to slide the basket. Every catch increments the score — that's the overlap callback firing.

## Step 2 — Notice the callback shape

The collision-handling line is:

```js
basket.overlaps(apples, (b, apple) => {
  score++;
  apple.remove();
});
```

`overlaps(group, callback)` walks every sprite in the group, calls the callback once per pair currently overlapping, and passes both sprites in. The callback is the right place to call `apple.remove()` — q5play has already finished iterating, so removing doesn't trip the iteration bug.

The boolean form (`basket.overlaps(apples)`) returns `true` if any apple is overlapping. Use that for "did anything hit me this frame" gates (game-over checks, hit flashes). Use the callback form for per-pair work.

## Step 3 — Why two cleanup passes?

The callback removes apples that the basket caught. But an apple that **misses** the basket and falls off the bottom never overlaps anything — it would live forever, slowing the sketch down.

The trailing manual loop handles those:

```js
for (let a of [...apples]) {
  if (a.y > 450) apples.remove(a);
}
```

`[...apples]` makes a shallow copy of the Group's array so removing during iteration doesn't shift the index under the loop. (You'll see the bug live in `2.3.10 Worked Example — Safe Despawn`.)

## Step 4 — Spawn rate as the difficulty knob

`if (frameCount % 30 === 0)` spawns once every 30 frames — about twice per second at 60 fps. Try `% 60` (one per second, easier) or `% 10` (six per second, frantic). The same pattern drives nearly every "spawn enemies on a timer" mechanic.

## Key takeaways

- `overlaps(group, callback)` is the cleanest idiom for "do X to every sprite touching me right now." Remove inside the callback freely.
- Use the boolean form `overlaps(group)` only when you want a yes/no signal, not per-pair work.
- Off-screen / out-of-bounds cleanup is a separate loop — iterate a copy `[...group]` so `remove()` doesn't shift the index.
- `frameCount % N === 0` is the q5play timed-spawn idiom. `N` is your difficulty knob.
- A `kinematic` body moves with `vel` but isn't pushed by gravity or collisions — perfect for a controllable basket / paddle.
