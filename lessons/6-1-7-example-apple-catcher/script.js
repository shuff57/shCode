// 2.3.7 Worked Example — Apple Catcher
// catch falling apples with a basket; demonstrates the overlaps(group, callback) idiom.

let basket, apples, score = 0;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 0; // apples have their own vel

  basket = new Sprite(200, 370, 70, 15, 'kinematic');
  basket.color = 'saddlebrown';

  apples = new Group();
  apples.color = 'red';
  apples.diameter = 22;
  apples.collider = 'none';
}

function draw() {
  background('#113311');

  // WASD-only — arrow keys scroll the editor iframe.
  if (kb.pressing('a')) basket.vel.x = -4;
  else if (kb.pressing('d')) basket.vel.x = 4;
  else basket.vel.x = 0;

  // Spawn an apple every 30 frames at a random x.
  if (frameCount % 30 === 0) {
    let a = new apples.Sprite(20 + Math.random() * 360, -20);
    a.vel.y = 3;
  }

  // Callback form: fires once per overlapping pair, with both sprites passed in.
  // Cleaner than a manual loop because delete() inside the callback can't trip
  // the iterate-then-remove bug — shPlay has finished its own iteration first.
  // delete() destroys the sprite (body + every group it's in); group.remove(s)
  // would only unparent it, leaving it drawing via allSprites.
  basket.overlaps(apples, (b, apple) => {
    score++;
    apple.delete();
  });

  // Off-screen cleanup still needs a manual loop — iterate a copy so deleting
  // doesn't shift the array under us.
  for (let a of [...apples]) {
    if (a.y > 450) a.delete();
  }

  fill('white');
  textSize(24);
  text('Score: ' + score, 14, 30);
}
