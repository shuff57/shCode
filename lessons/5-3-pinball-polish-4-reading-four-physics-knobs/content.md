## Four knobs: mass, gravityScale, rotationLock, debug

**Read before `5.8.3 Lab: Nudge the table`.** About 10 minutes.

In 5.2 you set the knobs every sprite shares with the whole world: gravity (5.2.8), bounciness and friction (5.2.15). This reading adds four knobs that belong to **one sprite** at a time. You set each one like `.color`: once, on the sprite that needs it, usually in `setup()`.

By the end of this reading you should be able to answer:

- What does a sprite's `.mass` change, and what does it not change?
- How do you make one sprite float or drift while everything else falls?
- How do you stop a sprite from turning?
- How can you see the shape moSHion is really using for a sprite?

**1. `.mass`: how heavy a body is.** Every sprite starts with a mass worked out from its size: a bigger sprite is heavier. A 22-pixel pinball starts at about 0.4, and a 30-pixel ball at about 0.8. Set it to any number above 0:

```js
ball.mass = 4;
```

A push from `applyForce` (5.2.18) moves a heavy body less than a light one: four times the mass, a quarter of the speed. The same push can be a gentle nudge for a heavy ball and a launch for a light one. What mass does **not** change is falling: gravity pulls a heavy ball and a light ball down at the same speed. So on your pinball table a new mass leaves the drop the same and changes only what a push does. (You may also see `.density` in the docs: it is the same idea measured per pixel of size, and setting `.mass` changes it for you. This course uses `.mass`.)

**Try it:** two balls of the same size, one with mass 1 and one with mass 4 (each wears its mass as a label, 5.7.1). Holding the right arrow gives both exactly the same push. There is no gravity in this one, so they stay put until pushed.

```js live
let light, heavy, wall;

function setup() {
  new Canvas(440, 240);

  wall = new Sprite(435, 120, 10, 240, 'static');
  wall.color = 'gray';

  light = new Sprite(40, 90, 30);
  light.color = 'deepskyblue';
  light.mass = 1;
  light.text = 1;

  heavy = new Sprite(40, 170, 30);
  heavy.color = 'tomato';
  heavy.mass = 4;
  heavy.text = 4;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('click, hold the right arrow; R resets', 20, 26);

  if (kb.pressing('right')) {
    light.applyForce(5, 0);
    heavy.applyForce(5, 0);
  }

  if (kb.presses('r')) {
    light.x = 40;
    light.vel.x = 0;
    heavy.x = 40;
    heavy.vel.x = 0;
  }
}
```

**What you'll see:** the blue ball (mass 1) speeds off to the right and reaches the wall first. The red one (mass 4) creeps along behind it. Same push, same size, different weight.

**2. `.gravityScale`: this sprite's own share of gravity.** `world.gravity.y` pulls on every sprite the same. `.gravityScale` is a multiplier for one sprite: `1` is normal (where every sprite starts), `0.5` is half the pull, so it drifts down slowly, and `0` means no pull at all, so it floats where it is.

```js
leaf.gravityScale = 0.5;
```

You have already seen a `0` without knowing it: when a sprite's collider is `'none'`, moSHion sets its gravity share to 0 for you. That is why the popup in 5.7.2 floated.

**Try it:** three balls let go together. Press Run again to watch it again.

```js live
let ground, a, b, c;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  ground = new Sprite(200, 290, 400, 20, 'static');
  ground.color = 'gray';

  a = new Sprite(100, 50, 40);
  a.color = 'deepskyblue';
  a.gravityScale = 1;
  a.text = a.gravityScale;

  b = new Sprite(200, 50, 40);
  b.color = 'gold';
  b.gravityScale = 0.5;
  b.text = b.gravityScale;
  b.textColor = 'black';

  c = new Sprite(300, 50, 40);
  c.color = 'tomato';
  c.gravityScale = 0;
  c.text = '0';   // a plain 0 would show nothing (5.7.1)
}

function draw() {
  background('#222');
}
```

**What you'll see:** the blue ball (1) falls like everything has so far. The gold one (0.5) drifts down more slowly and lands later. The red one (0) stays in the air.

**3. `.rotationLock`: a body that will not turn.** Set it to `true` and the sprite can still move, fall and be pushed, but it never turns.

```js
player.rotationLock = true;
```

**Try it:** two boxes land on a point. Only the red one is locked.

```js live
let ground, peak1, peak2, free, locked;

function setup() {
  new Canvas(440, 300);
  world.gravity.y = 10;

  ground = new Sprite(220, 290, 440, 20, 'static');
  ground.color = 'gray';

  peak1 = new Sprite(120, 250, 50, 50, 'static');
  peak1.color = 'gray';
  peak1.rotation = 45;
  peak2 = new Sprite(320, 250, 50, 50, 'static');
  peak2.color = 'gray';
  peak2.rotation = 45;

  free = new Sprite(130, 40, 60, 60);
  free.color = 'deepskyblue';
  free.text = 'free';

  locked = new Sprite(330, 40, 60, 60);
  locked.color = 'tomato';
  locked.text = 'locked';
  locked.rotationLock = true;
}

function draw() {
  background('#222');
}
```

**What you'll see:** the blue box lands a little off the point, tips over and tumbles to the ground. The red box cannot turn, so it cannot tip: it sits level on top of the point. A player that should always stand up straight, however it lands, wants this knob.

**4. `.debug`: see the body, not the picture.** What you see on the canvas is the sprite's picture. What moSHion uses for bumping and for `colliding()` is its **body**, the collider. Usually they match. When a ball stops on nothing, passes through a wall or bounces off thin air, they may not. `.debug = true` draws the body's outline in bright green on top of the sprite:

```js
ball.debug = true;
```

It changes nothing about how the game plays. It is a flashlight for finding bugs: switch it on for every sprite you suspect, look, and switch it off when you are done.

**Try it:** this ball stops in mid-air. Press D to switch debug on for all three sprites and find out why.

```js live
let ball, ground, shelf;

function setup() {
  new Canvas(400, 260);
  world.gravity.y = 10;

  ground = new Sprite(200, 250, 400, 20, 'static');
  ground.color = 'gray';

  shelf = new Sprite(200, 150, 140, 14, 'static');
  shelf.color = '#222';

  ball = new Sprite(200, 30, 24);
  ball.color = 'deepskyblue';
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('click here, then press D for debug', 20, 26);

  if (kb.presses('d')) {
    ball.debug = !ball.debug;
    ground.debug = !ground.debug;
    shelf.debug = !shelf.debug;
  }
}
```

**What you'll see:** the ball falls and stops halfway down, on nothing. Press D: a thin green ring appears on the edge of the ball, a green box round the ground, and a green box round a shelf in the middle that was there all along, painted `'#222'`, the same colour as the background. The ball is sitting on it. `!ball.debug` is "the opposite of what it is now", so each press of D flips debug on or off.

**Try this:**

1. In the mass sketch, change both 4s on the red ball to `0.25` (`heavy.mass = 0.25;` and its label, `heavy.text = 0.25;`) and hold the right arrow. Now the red ball is the light one and wins the race.
2. In the gravity sketch, change `c.gravityScale = 0;` to `c.gravityScale = -0.2;` and its label to `c.text = '-0.2';`. A negative share pulls the other way: the red ball rises slowly and floats off the top.
3. In the box sketch, add `free.rotationLock = true;` under `free.text = 'free';`. Now neither box can tip, and both sit on their points.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`.mass`** | How heavy a sprite is. A heavier body moves less under the same push; gravity pulls every mass at the same speed. |
| **`.gravityScale`** | This sprite's share of gravity: `1` normal, `0.5` drifts, `0` floats. |
| **`.rotationLock`** | `true` means the sprite never turns. |
| **`.debug`** | `true` draws the sprite's body (its collider) in green, for finding bugs. |
