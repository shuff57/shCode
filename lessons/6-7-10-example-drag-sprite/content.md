**Goal:** Combine hit-testing (2.7.6), one-shot click (2.7.5), held-button detection (2.7.5), and position-override with velocity zeroing (2.7.9) to drag a sprite with the mouse.

## Step 1: Hit Run and drag

Click on the square and drag it around. Release the button and it stays where you dropped it.

```js live
let s;
let dragging = false;

function setup() {
  new Canvas(400, 400);
  s = new Sprite(200, 200, 40, 40);
}

function draw() {
  background('#222');
  if (mouse.presses() && world.getSpriteAt(mouse.x, mouse.y) === s) {
    dragging = true;
  }
  if (!mouse.pressing()) dragging = false;
  if (dragging) {
    s.pos.x = mouse.x;
    s.pos.y = mouse.y;
    s.vel.x = 0; s.vel.y = 0;
  }
}
```

## Step 2: Three separate jobs

There are three `if` blocks and each has one job. Read them in order.

**Start the drag**: `mouse.presses()` fires only on the first frame the button goes down (one-shot, from 2.7.5). The `&&` check calls `world.getSpriteAt(mouse.x, mouse.y)` to ask which sprite is under the cursor (from 2.7.6). The drag only starts if that sprite is exactly `s`. Clicking empty canvas does nothing.

**End the drag**: `!mouse.pressing()` is true on every frame the button is up. As soon as you release, `dragging` flips back to `false`. Using `pressing()` here (held check) lets us monitor the button state continuously every frame.

**Move the sprite**, while dragging, `s.pos.x` and `s.pos.y` are forced to the cursor position. `s.vel.x = 0; s.vel.y = 0` erases any velocity the physics engine might have assigned (from 2.7.9). Without the velocity zero, the physics engine fights the position override and the sprite shakes or drifts.

```js live
let s;
let dragging = false;

function setup() {
  new Canvas(400, 400);
  s = new Sprite(200, 200, 40, 40);
}

function draw() {
  background('#222');

  // Job 1: start the drag on the first click frame, only if cursor is on the sprite
  if (mouse.presses() && world.getSpriteAt(mouse.x, mouse.y) === s) {
    dragging = true;
  }

  // Job 2: end the drag the moment the button is released
  if (!mouse.pressing()) dragging = false;

  // Job 3: snap position to cursor and zero velocity each frame while dragging
  if (dragging) {
    s.pos.x = mouse.x;
    s.pos.y = mouse.y;
    s.vel.x = 0; s.vel.y = 0;
  }
}
```

## Key takeaways

- `mouse.presses()` gates the drag start: one-shot so a held click on empty canvas can't accidentally start a drag mid-hold.
- `world.getSpriteAt(x, y) === s` is the hit-test: it returns the topmost sprite at those coordinates, or `null` if none.
- `mouse.pressing()` monitors button state every frame: the moment it becomes false, the drag ends.
- Zeroing velocity each drag frame is required; position override alone leaves the physics engine's own velocity intact, which causes drift.
