// 6.8.13 Challenges: SliderJoint, Trebuchet, Swinging Rope
// (reference solution).
//
// Takes the SliderJoint challenge: a lift platform locked to a vertical
// track, plus a rope of HingeJoints hanging beside it so both stretch
// features are visible at once. Any ONE of the challenges is enough to pass.

let base, lift;
let ropeLinks = [];

function setup() {
  new Canvas(600, 500);
  world.gravity.y = 10;

  let ground = new Sprite(300, 480, 600, 40, 'static');
  ground.color = '#353';

  // --- Challenge: a lift on a slider ---------------------------------
  // The base is static, so the joint has something immovable to measure
  // against; without that the "track" would drift along with the platform.
  base = new Sprite(150, 440, 30, 30, 'static');
  base.color = '#557';

  lift = new Sprite(150, 380, 110, 16);
  lift.color = 'orange';

  // axis {x: 0, y: 1} = up and down only. The joint also forbids rotation,
  // so the platform stays level however it is loaded.
  new SliderJoint(base, lift, { axis: { x: 0, y: 1 } });

  // Something to carry, so the lift visibly does work.
  let crate = new Sprite(150, 350, 34, 34);
  crate.color = 'tan';

  // --- Challenge: a swinging rope ------------------------------------
  // Each link hangs off the one above it. The first hangs off a static
  // anchor, or the whole rope would simply fall.
  let anchor = new Sprite(430, 90, 16, 16, 'static');
  anchor.color = '#557';

  let previous = anchor;
  for (let i = 0; i < 7; i++) {
    let link = new Sprite(430, 110 + i * 22, 12, 20);
    link.color = '#9ac';
    new HingeJoint(previous, link);
    ropeLinks.push(link);
    previous = link;
  }

  // A weight on the end, so it swings with some authority.
  let weight = new Sprite(430, 110 + 7 * 22, 30);
  weight.color = 'crimson';
  new HingeJoint(previous, weight);
}

function draw() {
  background('#224');

  // Drive the lift ALONG its axis. Setting .y directly would fight the
  // joint; setting velocity lets the physics engine do the constraining.
  if (kb.pressing('up')) lift.vel.y = -3;
  else if (kb.pressing('down')) lift.vel.y = 3;
  else lift.vel.y = 0;

  // A shove for the rope, so you can see the hinges pass motion down it.
  if (kb.presses('space')) ropeLinks[0].vel.x = 8;
}
