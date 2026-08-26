## The else-to-zero Rule

Read before `2.1.7d Lab: Delete the else, watch drift`. About 5 minutes.

By the end of this reading you should be able to answer:

- What value does `vel.x` have the frame after you release a key, if there is no `else` branch?
- Why does the engine not reset velocity automatically between frames?
- Where does the bug show up, and what one-line fix corrects it?

You know the movement pattern. This reading focuses on the single most common bug in this module: the missing `else` branch.

**What you'll learn from it:**

- `vel.x` is a property on the sprite object. The engine does not erase it between frames: it uses it as-is.
- If no `if` or `else if` branch matches, `vel.x` keeps whatever value it held on the previous frame.
- The result: tap a key once, release it, and the sprite drifts forever, because velocity was set to `4` and never cleared.
- The `else` branch is the fix: when no key is pressed, set `vel.x = 0` (and `vel.y = 0`) explicitly.

**Try it:**

The code below has the `else` lines intentionally removed. Run it, tap a key once, then let go.

```js live
let player;

function setup() {
  new Canvas(360, 360);
  player = new Sprite(180, 180, 40, 40);
  player.color = 'tomato';
}

function draw() {
  background('#222');

  if      (kb.pressing('a')) player.vel.x = -4;
  else if (kb.pressing('d')) player.vel.x =  4;
  // no else: vel.x keeps its last value forever

  if      (kb.pressing('w')) player.vel.y = -4;
  else if (kb.pressing('s')) player.vel.y =  4;
  // no else: vel.y keeps its last value forever
}
```

**What you'll see:** the sprite drifts off-screen after a single keypress because velocity is never reset.

**Try this:** add the two missing `else` lines: `else player.vel.x = 0;` and `else player.vel.y = 0;`, and rerun. The sprite now stops the moment you release the key.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Persistent velocity** | `vel` keeps its value across frames until your code changes it. The engine never resets it automatically. |
| **else-to-zero** | The pattern of setting `vel = 0` in the `else` branch so the sprite stops when no key is held. |
| **Frame state** | A sprite property's value at the start of a frame. Without a reset, frame N's value carries into frame N+1. |
