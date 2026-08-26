// 2.3.5 Groups Sandbox: spawn many sprites from a factory and clean up safely.

let stars;

function setup() {
  new Canvas(400, 400);

  // STEP 1: Create a Group and assign it to `stars`.

  // STEP 2: Set defaults on the Group (color, diameter, collider).
  // Every sprite spawned into the Group will inherit them.

}

function draw() {
  // STEP 5: Clear to a dark background so old frames don't pile up.

  // STEP 3: Every N frames, spawn a star with the factory form
  // using the group factory form. Give it a downward velocity.

  // STEP 4: Walk the Group and despawn any star that fell past the bottom.
  // Iterate a copy ([...stars]) so deletion doesn't skip items.

}
