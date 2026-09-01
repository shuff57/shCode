## sprite.bounciness

**Read before attempting `6.7.15 Worked Example: Bounciness Comparison`.**

`sprite.bounciness` controls how much energy a sprite keeps after it collides with something. It is a number from 0 to 1:

- `0`: dead thud. The sprite hits and stops. No bounce at all.
- `1`: nearly lossless. The sprite bounces back with almost the same speed it had going in.

Set it once in `setup`, before the simulation runs:

```js
ball.bounciness = 0.8;
```

One thing to know: even at `1.0`, the ball will slowly bleed energy. Air drag, contact friction, and tiny rounding errors inside the physics engine all steal a little speed each bounce. True perpetual motion is not achievable, but `0.9` or `1.0` will bounce a long time before it noticeably slows down.

**What you'll learn from it:**
- `bounciness` is a per-sprite property: each sprite can have a different value.
- Lower values feel heavy or sticky; higher values feel light and lively.
- The property is part of moSHion's physics simulation: you do not write any bounce math yourself.
- Setting it in `setup` is enough; you can also change it during the game to make surfaces feel different.

**Try it:** run the sketch. The ball drops onto the floor and bounces. Change `0.8` to `0.2` and run again: the ball barely comes back up. Change it to `1.0` and watch how long it keeps going.

```js live
let ball;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 8;

  let floor = new Sprite(200, 290, 400, 20);
  floor.collider = 'static';
  floor.color = '#444';

  ball = new Sprite(200, 50, 30);
  ball.color = '#ff79c6';
  ball.bounciness = 0.8;
}

function draw() {
  background('#282a36');
  fill('#f8f8f2');
  textSize(14);
  text('bounciness = 0.8  (try changing it)', 10, 20);
}
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`bounciness`** | Per-sprite property. Controls how much speed the sprite keeps after a collision. Range: 0 to 1. |
| **Restitution** | Physics term for the same idea: how elastic a collision is. `bounciness` is moSHion's name for restitution. |
| **`0`** | Dead thud: the sprite hits and stops, no energy returned. |
| **`1`** | Nearly lossless: the sprite bounces back with almost the same speed (tiny bleed still occurs). |
