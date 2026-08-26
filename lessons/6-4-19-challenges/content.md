## Challenge 1: Parallax background (easy)

Add a second set of sprites: clouds, mountains, distant trees: that scroll *slower* than the foreground. The illusion is depth: things farther away appear to move less when the camera moves.

The trick is to draw them on a lower `layer` (so the foreground covers them) and to position them based on a *fraction* of `camera.x`, not the raw value.

**Target shape:**

```js
let clouds = [];

function setup() {
  // ...your foreground level...
  for (let i = 0; i < 6; i++) {
    let c = new Sprite(i * 220, 60, 60, 30);
    c.collider = 'none';
    c.image = '☁️';
    c.layer = -10;        // behind the foreground
    clouds.push(c);
  }
}

function draw() {
  // ...your existing follow code...
  camera.x = player.x;

  // Re-position each cloud based on camera with a slow factor.
  for (let i = 0; i < clouds.length; i++) {
    clouds[i].x = i * 220 + camera.x * 0.3;  // 30% of camera = parallax
  }
}
```

**Hints:**

- Pick a small `layer` (e.g. `-10`) for the parallax sprites; they'll draw under everything else.
- The `0.3` is the parallax factor: smaller = more "distant," larger = closer to foreground.
- The grader accepts any `sprite.layer = …` assignment as the parallax signal.

---

## Challenge 2: Mirror the sprite when walking left (medium)

When your player walks left, the visual still faces right: that looks wrong. Set `sprite.scale.x` to `-1` to flip the visual horizontally, and back to `1` to face right again, based on the direction of motion.

**Target shape:**

```js
function draw() {
  background('#224');

  if (kb.pressing('d')) {
    player.vel.x = 4;
    player.scale.x = 1;    // facing right
  } else if (kb.pressing('a')) {
    player.vel.x = -4;
    player.scale.x = -1;   // facing left
  } else {
    player.vel.x = 0;
  }

  camera.x = player.x;
}
```

**Hints:**

- `sprite.scale.x = -1` flips the visual along the vertical axis. `sprite.scale.x = 1` puts it back.
- Don't reset `scale.x` on every frame unconditionally, only flip it when direction changes, otherwise the sprite snaps facing-right whenever no key is held.
- The grader looks for any `scale.x = …` assignment as the mirror signal.

---

## Challenge 3: Vertical camera follow (hard)

For tall levels (vertical platformers, cave dives), the camera also needs to follow `y`. Add a second follow line for `camera.y`. Smooth it with `lerp` if you want: vertical follow especially benefits from lag because rapid vertical motion (jumping) jerks the camera otherwise.

**Target shape:**

```js
function draw() {
  background('#224');

  // ...input + horizontal follow...
  camera.x = lerp(camera.x, player.x, 0.1);

  // Vertical follow with extra lag so jumps don't shake the screen.
  camera.y = lerp(camera.y, player.y, 0.05);
}
```

**Hints:**

- Build a tall level: stack platforms vertically so the player needs to climb out of the canvas to test `camera.y`.
- Use a smaller `t` for the vertical `lerp` (e.g. `0.05`): vertical motion in a platformer is bursty, and a snappy vertical camera causes motion sickness.
- The grader accepts any `camera.y = …` assignment inside `draw()` as the vertical-follow signal.

---

## If you finish all three

- Combine: a tall, parallaxing level with a mirroring player and a smooth `lerp` follow on both axes: that's a real platformer camera.
- Read the moSHion `Camera` docs section. There may be a built-in `camera.follow(sprite)` that does much of this for you. How does yours compare?
- Show a classmate your favorite stretch and explain why you tuned the lerp factor the way you did.
