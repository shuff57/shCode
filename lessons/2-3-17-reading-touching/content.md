# Touching + Ground Detection

Read this before `2.3.18 Worked Example — Ground Detection`. About 5 minutes.

By the end of this reading you should be able to answer:

- What does `sprite.touching(other)` return, and how is it different from `overlaps`?
- Why does a jump button without a ground check let the player fly?
- What's the one-line idiom for "single jump per landing"?

This reading is the bridge from "the player can jump" to "the player can jump *correctly*."

---

## `sprite.touching(other)` — physical contact this frame

`touching` returns `true` while the sprite is **in physical contact** with `other`. Compared to `overlaps`:

- `overlaps` checks bounding-box intersection (fast, generous, fires for any spatial overlap).
- `touching` asks the physics engine "are these two bodies actually in contact?" (more accurate for resting contact).

For "is the player standing on the ground?", `touching` is the right call. Bounding boxes can intersect without bodies being in contact — for example, while passing through a non-solid trigger zone.

`touching` accepts a Group, like `overlaps`. `player.touching(platforms)` is `true` if any platform is currently being touched.

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
  text('player.touching(ground): ' + player.touching(ground), 12, 28);
}
```

**What you'll see:** a blue player falls onto a grey platform. The white text reads `false` while falling, `true` while standing, and flips back to `false` if you walk off the edge.

**Try this:** narrow the platform — change `new Sprite(200, 220, 280, 12, 'static')` to `new Sprite(200, 220, 80, 12, 'static')`. Now the player only has a small platform to stand on. Step off the edge with A/D and watch the boolean flip.

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

The player can chain unlimited jumps by tapping rapidly. The fix is gating on `touching` — only accept the jump when the player is actually on the ground.

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
  if (kb.presses('space') && player.touching(ground)) {
    player.vel.y = -12;
  }

  fill('white');
  textSize(14);
  text('touching: ' + player.touching(ground), 14, 24);
}
```

**What you'll see:** a blue player resting on a grey platform. Tap space on the ground — they jump. Tap space mid-air — nothing happens. The boolean overlay tells you whether the next press would be accepted.

**Try this:** delete `&& player.touching(ground)` from the `if`. Tap space, and while in the air, tap space again. The player double-jumps because the ground gate is gone. Put it back.

If your level has many platforms, swap `ground` for a Group: `player.touching(platforms)`. Same idiom, scales for free.

---

## A note on `touching` vs `overlaps` for jumps

You may be tempted to use `overlaps` instead of `touching` for the ground gate. Don't:

- `overlaps` fires when bounding boxes intersect. The player's box overlaps the ground's box for most of a fall, including frames *before* they actually land — letting them jump from mid-air.
- `touching` fires only after the physics engine has put the bodies in contact.

Use `touching` for "am I standing on it?" and `overlaps` for "did I enter this trigger zone?".

---

## Quick reference

| Term | Meaning |
|------|---------|
| **`sprite.touching(other)`** | `true` while the sprite is in physical contact with `other` this frame. Pass a Group to test against many. |
| **Ground detection** | Checking whether the player is on the ground — the gate that prevents infinite mid-air jumps. |
| **Ground-gated jump** | The `kb.presses('space') && player.touching(ground)` idiom. |
| **`touching` vs `overlaps`** | `touching` = physics contact. `overlaps` = bounding-box intersection. Use `touching` for "am I standing on it?". |

---

Once you can explain why an `overlaps`-gated jump still lets the player fly, open `2.3.18 Worked Example — Ground Detection`.
