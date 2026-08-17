## A sprite can have multiple animations; one is active at a time

**Read before attempting `2.4.3a Reading — addAni(name, frames)`.**

shplay's animation system is **state-driven**: a sprite carries a library of named animations, only one of which renders per frame. Games swap between named animations to express what the player is doing — `idle`, `run`, `jump`. The frame loop never decides what the sprite should look like; your input/state code does.

**What you'll learn from it:**

- Sprites can register **multiple named animations**, but only one is **active** (rendering) at a time.
- The four building blocks each get their own atomic reading next: `addAni`, `changeAni`, `frameDelay`, and `sprite.image`.
- A sprite created without any `addAni` calls renders as a default colored rectangle — that's what you'll see in the try-it below.
- State-driven games swap the active animation in response to input; you'll see this composed in `6.4.8 Worked Example — Animating a Sprite`.

**Try it:** the mental model in action — one sprite, two visual "states" (idle and run), and the visible state swaps based on input. Hold `D` to put the sprite in its "run" state (orange); release for "idle" (cyan). This is the *idea* the animation system formalizes: one active visual at a time, swapped by your state code.

```js live
let player;

function setup() {
  new Canvas(360, 240);
  player = new Sprite(180, 120, 40, 40);
  player.collider = 'none';
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');

  // Two visual "states": idle (cyan) and run (orange).
  // Your input/state code decides which one is active each frame.
  if (kb.pressing('d')) {
    player.color = 'orange';
    player.vel.x = 3;
  } else {
    player.color = 'deepskyblue';
    player.vel.x = 0;
  }
}
```

Click the preview, then hold `D`. The visual flips on press, back on release. That's the same pattern shplay's animation system uses — just with named animations instead of color strings. The next four readings introduce the real API: `2.4.3a` registers a named animation with `addAni`, `2.4.3b` switches between them with `changeAni`, `2.4.3c` controls cycle speed via `frameDelay`, and `2.4.3d` covers single-frame still art with `sprite.image`.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **Animation** | A sequence of frames played in order to create the illusion of motion. |
| **Frame (animation)** | One image in the sequence. |
| **Active animation** | The animation currently rendering on a sprite (only one at a time). |
| **State-driven** | Visual swaps decided by game state (input, score, lives), not by the frame loop alone. |
