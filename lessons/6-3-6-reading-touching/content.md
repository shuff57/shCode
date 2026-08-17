# Colliding + Ground Detection

Read this before `6.3.7 Worked Example — Ground Detection`. About 5 minutes.

By the end of this reading you should be able to answer:

- What does `sprite.colliding(other)` return, and how is it different from `overlaps`?
- Why does a jump button without a ground check let the player fly?
- What's the one-line idiom for "single jump per landing"?

This reading is the bridge from "the player can jump" to "the player can jump *correctly*."

---

## `sprite.colliding(other)` — physical contact this frame

`colliding` returns a truthy value (a frame count) while the sprite is **in physical contact** with `other`. Compared to `overlaps`:

- `overlaps` is for sensor-style sprites (`collider = 'none'`) — they pass through each other and report bounding-box intersection.
- `colliding` asks the physics engine "are these two solid bodies actually pushing on each other?" — exactly what you want for "is the player standing on the ground?"

Both methods accept a Group, so `player.colliding(platforms)` is truthy if the player is in contact with any platform in the group.

```js live
let player, ground;

function setup() {
  new Canvas(400, 240);
  world.gravity.y = 20;

  ground = new Sprite(200, 220, 280, 12, 'static');
  ground.color = '#444';

  player = new Sprite(80, 60, 30, 30);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))      player.vel.x = -3;
  else if (kb.pressing('d')) player.vel.x = 3;
  else                       player.vel.x = 0;

  fill('white');
  textSize(16);
  text('player.colliding(ground): ' + player.colliding(ground), 12, 28);
}
```

**What you'll see:** a blue player falls onto a grey platform. The number on screen reads `0` while falling, then climbs each frame the player is resting, and drops back to `0` if you walk off the edge.

**Try this:** narrow the platform — change `new Sprite(200, 220, 280, 12, 'static')` to `new Sprite(200, 220, 80, 12, 'static')`. Now the player only has a small platform to stand on. Step off the edge with A/D and watch the count fall to `0`.

---

## Why a jump button needs a ground check

`kb.presses('space')` already prevents *one* bug — it fires only once per tap, so the player can't infinitely accelerate while holding the key. But it doesn't prevent a *second* bug: tapping mid-air.

Without a ground check:

```js
// Each tap fires once. But you can tap WHILE in the air.
if (kb.presses('space')) {
  player.vel.y = -12;
}
```

The player can chain unlimited jumps by tapping rapidly. The fix is gating on `colliding` — only accept the jump when the player is actually on the ground.

---

## The ground-gated jump idiom

```js live
let player, ground;

function setup() {
  new Canvas(400, 280);
  world.gravity.y = 20;

  ground = new Sprite(200, 270, 400, 12, 'static');
  ground.color = '#444';

  player = new Sprite(60, 100, 30, 30);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))      player.vel.x = -3;
  else if (kb.pressing('d')) player.vel.x = 3;
  else                       player.vel.x = 0;

  // The ground-gated jump idiom.
  if (kb.presses(' ') && player.colliding(ground)) {
    player.vel.y = -12;
  }

  fill('white');
  textSize(14);
  text('colliding: ' + player.colliding(ground), 14, 24);
}
```

**What you'll see:** a blue player resting on a grey platform. Tap space on the ground — they jump. Tap space mid-air — nothing happens. The frame count overlay tells you whether the next press would be accepted.

**Try this:** delete `&& player.colliding(ground)` from the `if`. Tap space, and while in the air, tap space again. The player double-jumps because the ground gate is gone. Put it back.

If your level has many platforms, swap `ground` for a Group: `player.colliding(platforms)`. Same idiom, scales for free.

---

## A note on `colliding` vs `overlaps` for jumps

You may be tempted to use `overlaps` instead of `colliding` for the ground gate. Don't:

- `overlaps` is meant for sensor-style sprites (`collider = 'none'`) that pass through each other. Bounding boxes can intersect long before a fall actually lands — letting the player jump from mid-air.
- `colliding` fires only after the physics engine has put the bodies in actual contact, which is what "standing on" means.

Use `colliding` for "am I standing on it?" and `overlaps` for "did I enter this trigger zone?"

---

## Quick reference

| Term | Meaning |
|------|---------|
| **`sprite.colliding(other)`** | Truthy (a frame count) while the sprite is in physical contact with `other` this frame. Pass a Group to test against many. |
| **Ground detection** | Checking whether the player is on the ground — the gate that prevents infinite mid-air jumps. |
| **Ground-gated jump** | The `kb.presses(' ') && player.colliding(ground)` idiom. |
| **`colliding` vs `overlaps`** | `colliding` = solid-body physics contact. `overlaps` = sensor-style (collider 'none') intersection. Use `colliding` for "am I standing on it?". |

---

Once you can explain why an `overlaps`-gated jump is wrong for this case, open `6.3.7 Worked Example — Ground Detection`.
