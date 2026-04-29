## Animation states

**Read before attempting `2.4.5 Animated Sprites Sandbox`.**

Animation in q5play is **state-driven**: register one or more named animations on a sprite, then call `changeAni(name)` whenever the player's state changes (idle → run, idle → jump, etc.). The frame loop never decides *what* the sprite should look like — your input/state code does.

The canonical API:

```js
sprite.addAni('idle', 'img/idle.png');
sprite.addAni('run',  'img/run1.png', 'img/run2.png');
sprite.changeAni('run');
```

`addAni(name, ...frames)` registers a named animation. The first one registered becomes the active animation automatically. `changeAni(name)` swaps it.

When you don't have image files, q5play accepts an emoji string for `sprite.image` (or `sprite.img`) — `EmojiImage` renders it at the sprite's size automatically. The same idea — *swap the visual when state changes* — applies, just with one frame per state instead of a multi-frame animation:

What you'll learn from it:

- Animations are *named visual states* — you register them once and swap by name.
- The first `addAni` call becomes the sprite's active animation; subsequent ones are inactive until you `changeAni`.
- `changeAni('foo')` is a no-op (with a warning) if `'foo'` was never registered.
- Without image files, `sprite.image = '🧍'` (any emoji string) renders an emoji at the sprite's size — same swap pattern, fewer assets.

**Try it:** `kb.pressing('d')` flips the visual to a runner; releasing it flips it back to an idler. The condition driving the swap is your state machine — even a one-line ternary.

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

Open the live preview, click into it, then hold `D` (right) or `A` (left). The visual flips on press and back on release — that's `changeAni` in spirit, with a single emoji frame per state.

---

## Frame timing + single-frame art

**Read before attempting `2.4.5 Animated Sprites Sandbox`.**

A multi-frame animation cycles through its frames at the rate set by `sprite.ani.frameDelay`. Higher = slower. You set it after registering the animation:

```js
sprite.addAni('run', 'img/run1.png', 'img/run2.png');
sprite.ani.frameDelay = 8;   // each frame held for ~8 game frames
```

For visuals that don't need to cycle (a coin, a flag, a rock), skip `addAni` entirely — assign `sprite.image` directly. It can be an image URL (`'img/coin.png'`), or an emoji string (`'🪙'`).

What you'll learn from it:

- `sprite.ani.frameDelay = N` slows the animation cycle (higher N = slower).
- Single-frame art uses `sprite.image = '…'` — no `addAni` needed.
- Emoji strings like `'🪙'`, `'🚩'`, `'🌳'` work as instant zero-asset art for static sprites.
- `changeAni` only switches between animations registered via `addAni` on this sprite — it doesn't load anything new.

**Try it:** three sprites, three roles. The flag is static art (`sprite.image`), the coin is too, and the player swaps emojis when you press `W` to "jump" (visual cue only). No animations are *registered* here — these are all single-frame visuals.

```js live
let player, coin, flag;

function setup() {
  new Canvas(360, 240);
  world.gravity.y = 0;

  flag = new Sprite(320, 200, 24, 24);
  flag.collider = 'none';
  flag.image = '🚩';

  coin = new Sprite(180, 120, 24, 24);
  coin.collider = 'none';
  coin.image = '🪙';

  player = new Sprite(40, 200, 32, 32);
  player.collider = 'none';
  player.image = '🧍';
}

function draw() {
  background('#112');

  // Spin the coin slowly so the scene isn't static.
  coin.rotation = frameCount / 30;

  // "Jump" cue: while W is held, swap the emoji.
  player.image = kb.pressing('w') ? '🤸' : '🧍';
}
```

Try changing the player's `image` to a different emoji, or the flag's. The sprite's size doesn't change — `EmojiImage` paints into the sprite's `w × h` box.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Animation** | A sequence of frames played in order to create the illusion of motion. |
| **Frame (animation)** | One image in the sequence. |
| **`addAni(name, ...frames)`** | Registers a named animation on a sprite. The first call also activates it. |
| **`changeAni(name)`** | Switches the sprite's active animation to a previously-registered one. |
| **`sprite.image`** | Single-frame visual. Accepts an image URL or an emoji string. |
| **`sprite.ani.frameDelay`** | How many engine frames each animation frame is held for. Higher = slower. |
| **Layer** | The draw order — higher numbers draw on top of lower. |
