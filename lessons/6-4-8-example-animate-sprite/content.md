**Goal:** swap a sprite's visual when its state changes — the simplest "animation" that makes a game feel alive.

## Step 1 — Hit Run

A standing player. Press `D` (right) or `A` (left) to move. The visual swaps to a runner while you're holding the key, and back to the idler when you let go. That's a state-driven animation in two lines.

```js live
let player;

function setup() {
  new Canvas(360, 240);
  player = new Sprite(180, 200, 40, 40);
  player.collider = 'none';
  player.image = '🧍';
}

function draw() {
  background('#222');

  if (kb.pressing('d')) {
    player.x += 3;
    player.image = '🏃';
  } else if (kb.pressing('a')) {
    player.x -= 3;
    player.image = '🏃';
  } else {
    player.image = '🧍';
  }
}
```

The `else` branch is the part beginners forget — without it the visual never returns to idle. The pattern: each frame, the input drives both motion *and* the visual.

## Step 2 — Add a third state

Three states now: `idle`, `run`, and `jump`. Press `W` to "jump" — visually only; we're not adding gravity yet. Notice that the order of the `if`/`else if` matters: `jump` is checked first so it wins when you're holding `W` *and* `D` at the same time.

```js live
let player;

function setup() {
  new Canvas(360, 240);
  player = new Sprite(180, 200, 40, 40);
  player.collider = 'none';
  player.image = '🧍';
}

function draw() {
  background('#222');

  if (kb.pressing('w')) {
    player.image = '🤸';
  } else if (kb.pressing('d')) {
    player.x += 3;
    player.image = '🏃';
  } else if (kb.pressing('a')) {
    player.x -= 3;
    player.image = '🏃';
  } else {
    player.image = '🧍';
  }
}
```

This is the same shape as a state machine: priority-ordered conditions, one visual per branch, a default in the `else`.

## Key takeaways

- Animation is **state-driven**: input/state changes pick the visual; the frame loop never decides what the sprite looks like.
- `sprite.image = '🧍'` swaps a single-frame visual — emoji strings are zero-asset placeholders that work in the in-app sandbox.
- The canonical multi-frame form is `sprite.addAni('idle', 'img/idle.png')` + `sprite.addAni('run', 'img/run1.png', 'img/run2.png')` registered in `setup()`, then `sprite.changeAni('run')` / `changeAni('idle')` in `draw()` — same swap pattern, just multi-frame cycles per state. We use `sprite.image` here because the in-app sandbox can't host image files; A15.1 accepts either form.
- Always include an `else` branch so the visual can return to its default state.
- Priority ordering of `if` / `else if` decides which state wins when keys overlap (jump beats run, run beats idle).
