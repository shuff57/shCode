**Goal:** Prove that a canvas + sprite + background is the smallest possible moSHion program.

## Step 1: Hit Run

You'll see a dark canvas with a square in the middle.

```js live
function setup() {
  new Canvas(400, 400);
}

function draw() {
  background('#222');
  new Sprite(200, 200, 40, 40);
}
```

## Step 2: Notice the bug

**Where is the sprite being created?** Inside `draw()`. That means a **new sprite is being made every frame**: 60 per second. If you run this for 5 seconds, 300 sprites exist. You just can't see them because they're all in the same spot.

Let it run for a while. The frame rate slowly drops as sprites pile up.

```js live
function setup() {
  new Canvas(400, 400);
}

function draw() {
  background('#222');
  new Sprite(200, 200, 40, 40);
}
```

## Step 3: Hoist the sprite

Move the sprite creation OUT of `draw()` and INTO `setup()`. Store it in a variable so we can still reach it later.

Run. **One** sprite exists. It's rendered automatically every frame: you don't call any render function. The engine sees the sprite in its world and draws it for you.

```js live
let player;

function setup() {
  new Canvas(400, 400);
  player = new Sprite(200, 200, 40, 40);
  player.color = 'deepskyblue';
}

function draw() {
  background('#222');
}
```

## Key takeaways

- `setup()` runs **once**. Create long-lived things here.
- `draw()` runs **every frame**. Do per-frame things here (input, movement, scoring).
- You don't call a render method on a sprite. moSHion handles rendering.
- `background(...)` is the first thing in `draw()`. Skip it and old frames stack up like a long-exposure photo.
