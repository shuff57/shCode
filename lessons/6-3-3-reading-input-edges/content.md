# Input edges: `pressing` vs `presses`

Read this before `6.3.4 Worked Example: Edge-triggered Input`. About 5 minutes.

By the end of this reading you should be able to answer:

- What does `kb.pressing(k)` return, and how often?
- What does `kb.presses(k)` return, and how often?
- Why does `kb.pressing('space')` cause an "infinite jump" bug, and how does swapping one word fix it?

These two functions look almost identical and behave completely differently. Picking the wrong one is the source of more game-feel bugs than anything else this quarter.

---

## `kb.pressing(k)`: every frame the key is held

`kb.pressing('a')` returns `true` for **every frame** the key is held down. At 60 fps, that's 60 readings per second of holding.

This is the right tool for **continuous** actions:

- Walking and running (`vel.x = -4` while held)
- Holding to charge a shot
- Hold-to-aim, hold-to-block

It's the wrong tool for one-shot actions, because "the key is held" is true for many frames in a row.

```js live
let player;

function setup() {
  new Canvas(360, 180);
  player = new Sprite(180, 90, 30, 30, 'kinematic');
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))      player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x = 4;
  else                       player.vel.x = 0;

  fill('white');
  textSize(14);
  text('hold A / D: kb.pressing fires every frame', 14, 24);
}
```

**What you'll see:** a blue square that slides smoothly while you hold A or D, and stops the moment you let go. The smoothness comes from `kb.pressing` re-setting velocity *every* frame.

**Try this:** swap `kb.pressing` to `kb.presses` (note the **s** at the end). Tap A: the player makes one tiny twitch and stops. The new function only fired once, so the velocity was only set once, and the next frame's `else` branch reset it to 0.

---

## `kb.presses(k)`, once per key-down

`kb.presses('space')` returns `true` for **exactly one frame**: the frame on which the key transitions from "not held" to "held." If you keep holding the key, the function returns `false` for every frame after the first.

This is the right tool for **one-shot** actions:

- Jumping
- Shooting / firing
- Toggling a flag
- Triggering a dash

The shape of the input: a single edge transition: matches the shape of the action.

---

## The infinite-jump bug

The classic mistake:

```js
// BUG: fires every frame the key is held
if (kb.pressing('space')) {
  player.vel.y = -10;
}
```

Hold space for one second and `vel.y = -10` is set 60 times. Gravity pulls the player back down between sets, but each frame the upward impulse beats it. Result: the player accelerates *up* and never lands.

The fix is changing one word: `pressing` → `presses`:

```js live
let player, ground;

function setup() {
  new Canvas(360, 180);
  world.gravity.y = 20;

  ground = new Sprite(180, 170, 360, 12, 'static');
  player = new Sprite(60, 100, 30, 30);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  if (kb.pressing('a'))      player.vel.x = -3;
  else if (kb.pressing('d')) player.vel.x = 3;
  else                       player.vel.x = 0;

  // EDGE-TRIGGERED: fires once per tap.
  if (kb.presses('space')) {
    player.vel.y = -10;
  }

  fill('white');
  textSize(14);
  text('tap SPACE: kb.presses fires once', 14, 24);
}
```

**What you'll see:** a blue player on a grey ground. Tap space: one jump per tap. Hold space, still one jump (until you release and tap again).

**Try this:** change `kb.presses('space')` to `kb.pressing('space')` and tap-and-hold space. Watch the player rocket upward and never come back. Switch it back to fix.

---

## A rule of thumb

| You want | Use |
|----------|-----|
| Continuous motion (slide, accelerate, hold-to-aim) | `kb.pressing(k)` |
| One-shot action (jump, shoot, toggle) | `kb.presses(k)` |

Note the spelling: **press*ing*** is the long-running one ("currently being pressed"); **press*es*** is the discrete one ("a press happened"). The verb tense matches the timing.

---

## Quick reference

| Function | Returns `true`... |
|----------|-------------------|
| `kb.pressing('a')` | Every frame the key is held. |
| `kb.presses('a')`  | The single frame the key was first pressed. |
| `mouse.pressing()` | Every frame a mouse button is held. |
| `mouse.presses()`  | The single frame a button was first pressed. |

---

Once you can explain the infinite-jump bug in one sentence, open `6.3.4 Worked Example: Edge-triggered Input`.
