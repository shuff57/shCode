// 2.3.5 Groups Sandbox — spawn many sprites from a factory and clean up safely.

let stars;

function setup() {
  new Canvas(400, 400);

  // STEP 1: Create a Group — it's both a container and a factory.
  //   stars = new Group();

  // STEP 2: Set defaults on the Group — every spawned sprite inherits these.
  //   stars.color = 'yellow';
  //   stars.diameter = 10;
  //   stars.collider = 'none';
}

function draw() {
  // STEP 5: Clear to a dark blue background.
  //   background('#001133');

  // STEP 3: Every 10 frames, spawn a star at a random x at the top.
  //   if (frameCount % 10 === 0) {
  //     let s = new stars.Sprite(Math.random() * 400, 0);
  //     s.vel.y = 2 + Math.random() * 2;
  //   }

  // STEP 4: Remove stars that fall past the bottom.
  //   Iterate a copy ([...group]) when removing — otherwise you skip items.
  //   for (let s of [...stars]) {
  //     if (s.y > 450) stars.remove(s);
  //   }
}
