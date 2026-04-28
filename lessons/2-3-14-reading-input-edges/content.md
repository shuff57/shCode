## Level-triggered with `kb.pressing`
**Read before attempting `2.3.15 Edge-triggered Input`.**

What you'll learn from it:
- `kb.pressing(k)` returns `true` **every frame the key is held** — at 60 fps, that's 60 reads per second of holding.
- This is the right tool for **continuous** motion: walking, running, holding-to-charge, hold-to-aim.
- It's the **wrong** tool for one-shot actions like jump or shoot — you'll fire 60 times per held second.
- Common keys: `'a'`, `'d'`, `'w'`, `'s'`, `'space'`, single-letter aliases for arrows in some setups.

**Try it:** hold left/right; the player slides smoothly because the velocity is set every frame. Try swapping `pressing` to `presses` — motion becomes one tiny twitch per tap.

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
  text('hold A / D — kb.pressing fires every frame', 14, 24);
}
```

## Edge-triggered with `kb.presses`
**Read before attempting `2.3.15 Edge-triggered Input`.**

What you'll learn from it:
- `kb.presses(k)` fires **exactly once** on each key-down — the moment the key transitions from "not held" to "held."
- This is the right tool for **one-shot** actions: jump, shoot, fire, dash, toggle.
- The classic super-jump bug: `if (kb.pressing('space')) player.vel.y = -10;` resets vel.y every frame the key is held → infinite upward acceleration.
- The fix is changing exactly one word: `kb.pressing` → `kb.presses`.

**Try it:** tap space — one jump per tap. Hold space — still one jump. Then swap `presses` → `pressing` in the editor and tap-and-hold again to see the bug.

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

  // EDGE-TRIGGERED — fires once per tap.
  if (kb.presses('space')) {
    player.vel.y = -10;
  }

  fill('white');
  textSize(14);
  text('tap SPACE — kb.presses fires once', 14, 24);
}
```

---

## Short glossary (quick reference)

| Term | Definition |
|------|-----------|
| **Edge-triggered input** | `kb.presses(k)` — fires exactly once on each key-down transition. Right for jump, shoot, toggle. |
| **Level-triggered input** | `kb.pressing(k)` — `true` every frame the key is held. Right for continuous motion (walk, run). |
| **Super-jump bug** | Setting `vel.y = -10` inside `if (kb.pressing('space'))` — fires 60×/sec, accelerates upward forever. The fix is `kb.presses`. |
| **Impulse** | A sudden, one-frame velocity change (as opposed to continuous force). Edge-triggered input is how you usually deliver one. |
