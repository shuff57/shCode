## Ground-Gated Actions

**Read before `5.2.5 Lab: Add a Jump`.**

**What you'll learn from it:**

- `sprite.colliding(other)` returns true while two sprites are touching.
- `kb.presses(key)` fires once per press (edge-triggered), where `kb.pressing(key)` (5.1) fires every frame the key is held (level-triggered).
- A jump needs both a press check and a ground check together, or the player jumps endlessly in mid-air.

**Try it:**

```js live
let player, ground;

function setup() {
  new Canvas(360, 300);
  world.gravity.y = 10;

  player = new Sprite(180, 60, 40, 40);
  player.color = 'deepskyblue';

  ground = new Sprite(180, 280, 360, 20, 'static');
  ground.color = 'gray';
}

function draw() {
  background('#222');

  if (player.colliding(ground)) {
    console.log('touching');
  }
  if (kb.presses(' ')) {
    console.log('space pressed once');
  }
}
```

Run it. `touching` prints every frame the player rests on the ground. Now hold the space bar down: `space pressed once` prints only on the very first frame of the press, not the whole time you hold it.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| colliding() | `sprite.colliding(other)` returns true while two sprites touch |
| kb.presses | Edge-triggered key check: fires once per press, unlike level-triggered `kb.pressing` |
