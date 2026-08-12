**Goal:** Put two independent key schemes into one running sketch — WASD for Player 1, arrow keys for Player 2 — so you can feel how they work together before writing your own. Composes the two-scheme reading from 2.7.23.

## Step 1 — Hit Run and move both paddles

Both players can move at the same time without either input blocking the other. Player 1 uses W/S. Player 2 uses Up/Down arrow.

```js live
let p1, p2;
function setup() {
  new Canvas(600, 400);
  world.gravity.y = 0;
  p1 = new Sprite(100, 200, 20, 80);
  p2 = new Sprite(500, 200, 20, 80);
}
function draw() {
  background('#222');
  if (kb.pressing('w')) p1.vel.y = -3;
  if (kb.pressing('s')) p1.vel.y = 3;
  if (kb.pressing('up'))   p2.vel.y = -3;
  if (kb.pressing('down')) p2.vel.y = 3;
}
```

## Step 2 — Why two separate sprites, two separate key sets

`p1` and `p2` are completely independent variables — each has its own position and velocity. The four `if` blocks each check one key and write to one paddle's velocity. There is no shared state between the two schemes. `world.gravity.y = 0` keeps the paddles floating in place so vertical movement is purely input-driven, not physics-driven.

Notice what is missing: the sketch has no ball, no scoring, and no walls. That is deliberate — isolate the input pattern before layering game logic on top.

```js live
let p1, p2;
function setup() {
  new Canvas(600, 400);
  world.gravity.y = 0;
  p1 = new Sprite(100, 200, 20, 80);  // Player 1: left side
  p2 = new Sprite(500, 200, 20, 80);  // Player 2: right side
}
function draw() {
  background('#222');
  // Player 1 — WASD
  if (kb.pressing('w')) p1.vel.y = -3;
  if (kb.pressing('s')) p1.vel.y = 3;
  // Player 2 — arrow keys
  if (kb.pressing('up'))   p2.vel.y = -3;
  if (kb.pressing('down')) p2.vel.y = 3;
}
```

## Key takeaways

- Two players need two sprite variables — each carries independent position and velocity.
- `kb.pressing` is the right call here: movement should be continuous while the key is held.
- The two key sets do not interfere — both players can move simultaneously.
- `world.gravity.y = 0` is the arena default for Pong-style games — paddles float, not fall.
