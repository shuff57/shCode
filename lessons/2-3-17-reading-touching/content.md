## `sprite.touching(other)` per-frame contact
**Read before attempting `2.3.18 Ground Detection`.**

What you'll learn from it:
- `touching` returns `true` while the sprite is **in physical contact** with `other` this frame — more reliable than `overlaps` for resting contact (a player standing on the ground).
- Pass a Group as `other` to test against many sprites: `player.touching(platforms)` is `true` if any platform is currently being touched.
- It reads cleanly inside an `if` for state-gating: "let the player do X only when touching Y."
- Compared to `overlaps`: `overlaps` checks bounding-box intersection; `touching` checks the physics engine's contact state. For "am I standing on something?", `touching` is the right call.

**Try it:** the grey label flips between `true` and `false` as you fall, land, and step off the edge.

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

## Ground-gated jump idiom
**Read before attempting `2.3.18 Ground Detection`.**

What you'll learn from it:
- Combining `kb.presses('space')` + `player.touching(ground)` gives a **single jump per landing** — the player can't jump again until they land.
- Without the ground check, `kb.presses` still fires once per tap — but the tap is accepted **mid-air**, so the player can chain infinite jumps by tapping rapidly.
- The full pattern is one line: `if (kb.presses('space') && player.touching(ground)) player.vel.y = -12;`.
- You can pass a Group instead of a single ground sprite: `player.touching(platforms)` if your level has many platforms — same idiom, scales for free.

**Try it:** the player can only jump when the boolean overlay reads `touching: true` on the previous frame. Tap space mid-air — nothing happens.

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

---

## Short glossary (quick reference)

| Term | Definition |
|------|-----------|
| **Ground detection** | Checking whether a sprite is currently in contact with a ground surface — the gate that prevents infinite mid-air jumps. |
| **`sprite.touching(other)`** | Returns `true` if the sprite is in physical contact with `other` this frame. Pass a Group to test against many sprites. |
| **Ground-gated jump** | The `kb.presses('space') && player.touching(ground)` idiom — accepts the jump only when the player is touching the ground. |
| **`touching` vs `overlaps`** | `touching` checks contact state from the physics engine; `overlaps` checks bounding-box intersection. Use `touching` for "am I standing on it?", `overlaps` for "did this trigger zone fire?" |
