## Forces vs Velocity

**Read before `5.2.9 Lab: Wind Zone`.**

**What you'll learn from it:**

- `sprite.applyForce(fx, fy)` is measured in Newtons, respects mass, and adds to whatever motion the sprite already has.
- Setting `.vel` directly (5.1's idiom) overrides motion outright instead of nudging it.
- `.vel` is right for "the player controls this directly"; `applyForce` is right for a continuous push layered on top of physics, like wind or thrust.

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
  player.applyForce(0, -3);
}
```

Run it. Gravity still pulls the player down, but the constant upward force slows the fall instead of stopping it: the player drifts down more gently than gravity alone would allow. Now replace that line with `player.vel.y = -3` and rerun: the player's vertical speed gets overridden every single frame instead, fighting gravity outright.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| applyForce | Pushes a sprite in Newtons, respecting mass, additive to existing motion |
