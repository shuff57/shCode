// 2.3.12 Challenges — pick at least one Groups stretch from content.md.
// The grader looks for: a Group, the factory form `new groupName.Sprite(...)`,
// .overlaps() somewhere, and one of the three challenge signals (lives counter,
// Math.random / random driving a sprite property, or `function cull(...)`).

function setup() {
  new Canvas(400, 400);

  // STEP 1: Create at least one `new Group()` and set its defaults
  //         (color, diameter, collider).

  // STEP 2: If your challenge needs initial state (lives, score, basket,
  //         ground sprite, etc.), set it up here.
}

function draw() {
  background('#222');

  // STEP 3: Spawn into your Group with the factory form
  //         `new groupName.Sprite(...)` — every N frames is one option.

  // STEP 4: Detect a hit / catch / collect with .overlaps(...).

  // STEP 5: Implement your chosen challenge from content.md.
}
