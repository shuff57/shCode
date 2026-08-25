// 7.1.1 Arcade Cabinet — Q2 Synthesis (reference solution).
//
// SALVAGE RUN. Crates fall from a wrecked freighter; you fly the collector
// underneath and catch them. Catch a crate, score it. Miss three and the run
// ends. Every score is banked, so the cabinet remembers its best.
//
// This is ONE way to tick the twelve boxes, not the way. A tower defence, a
// fishing game and a typing trainer could all tick the same list and share
// no code with this at all. That is the point of the spec.

// ---------------------------------------------------------------- data
// Item 10: an array of game data that a loop reads. Adding a kind here is
// the whole edit -- nothing below is written per-kind.
const CRATE_KINDS = [
  { name: 'supply', color: '#6c9', points: 1, speed: 2.2, size: 30 },
  { name: 'medical', color: '#c67', points: 3, speed: 3.0, size: 24 },
  { name: 'fuel', color: '#fc6', points: 5, speed: 3.8, size: 20 },
];

const SAVE_KEY = 'salvageRun.best';
const MAX_MISSES = 3;

// ---------------------------------------------------------------- class
// Item 2: a class of my own, used to make many objects.
class Crate {
  constructor(kind, x) {
    this.kind = kind;
    // Two size arguments, so a crate is a crate. One argument would make a
    // circle -- see the bouncy-ball lab, which relies on exactly that.
    this.sprite = new Sprite(x, -20, kind.size, kind.size);
    this.sprite.color = kind.color;
    this.sprite.collider = 'kinematic';   // falls at MY speed, not gravity's
    this.sprite.vel.y = kind.speed;
    this.counted = false;
  }

  // Off the bottom of the screen and never caught.
  get escaped() {
    return this.sprite.y > 620;
  }

  remove() {
    this.sprite.remove();
  }
}

let collector;
let crates = [];
let crateGroup;              // item 3: a Group
let state = 'title';         // item 7
let score = 0;
let misses = 0;
let best = 0;
let spawnTimer = 0;

function setup() {
  new Canvas(800, 600);

  // Item 6: motion tuned on purpose. No world gravity -- crates fall at the
  // speed their kind says, which keeps the difficulty readable instead of
  // accelerating everything off the bottom of the screen.
  world.gravity.y = 0;

  crateGroup = new Group();

  collector = new Sprite(400, 540, 90, 18);
  collector.color = '#9cf';
  collector.collider = 'kinematic';
  collector.friction = 0;

  // Item 8: something that survives closing the tab.
  let saved = getItem(SAVE_KEY);
  best = saved === null ? 0 : saved;

  runTests();
}

// Item 9: a function of my own that takes a parameter and returns a value.
// Kept separate from the sprite work so runTests() can check it without a
// canvas, which is what makes it testable at all.
function scoreFor(kind, comboCount) {
  let bonus = comboCount >= 3 ? 2 : 1;
  return kind.points * bonus;
}

function pickKind(roll) {
  // roll is 0..1. Rarer kinds are worth more.
  if (roll > 0.85) return CRATE_KINDS[2];
  if (roll > 0.55) return CRATE_KINDS[1];
  return CRATE_KINDS[0];
}

function spawnCrate() {
  let kind = pickKind(random(0, 1));
  let crate = new Crate(kind, random(40, 760));
  crates.push(crate);
  crateGroup.add(crate.sprite);
}

function startRun() {
  for (let crate of crates) crate.remove();
  crates = [];
  score = 0;
  misses = 0;
  spawnTimer = 0;
  state = 'play';
}

function endRun() {
  state = 'gameover';
  if (score > best) {
    best = score;
    storeItem(SAVE_KEY, best);
  }
}

function updatePlay() {
  // Item 5: player input.
  if (kb.pressing('a') || kb.pressing('left')) collector.vel.x = -7;
  else if (kb.pressing('d') || kb.pressing('right')) collector.vel.x = 7;
  else collector.vel.x = 0;

  // Hold a direction long enough and the collector simply leaves. A kinematic
  // sprite ignores walls, so the edges have to be arithmetic. Half the
  // collector's own width keeps it fully on screen rather than half out.
  if (collector.x < 45) collector.x = 45;
  if (collector.x > 755) collector.x = 755;

  if (kb.presses('p')) {
    state = 'paused';
    return;
  }

  spawnTimer = spawnTimer + 1;
  if (spawnTimer > 45) {
    spawnCrate();
    spawnTimer = 0;
  }

  // Item 11 loop: walk the live crates, resolve each one.
  let survivors = [];
  for (let crate of crates) {
    // Item 4: an overlap that changes the game.
    if (!crate.counted && collector.overlaps(crate.sprite)) {
      crate.counted = true;
      score = score + scoreFor(crate.kind, score);
      crate.remove();
      continue;
    }
    if (crate.escaped) {
      misses = misses + 1;
      crate.remove();
      continue;
    }
    survivors.push(crate);
  }
  crates = survivors;

  if (misses >= MAX_MISSES) endRun();
}

function draw() {
  background('#10131c');
  fill('white');
  textSize(16);

  switch (state) {
    case 'title':
      textSize(28);
      text('SALVAGE RUN', 300, 240);
      textSize(16);
      text('a / d to fly, catch the crates', 280, 285);
      text('miss ' + MAX_MISSES + ' and the run ends', 285, 310);
      text('best so far: ' + best, 330, 345);
      text('press enter to launch', 300, 385);
      if (kb.presses('enter')) startRun();
      break;

    case 'play':
      updatePlay();
      text('score ' + score, 20, 30);
      text('misses ' + misses + ' / ' + MAX_MISSES, 20, 55);
      text('best ' + best, 700, 30);
      text('p pauses', 700, 55);
      break;

    case 'paused':
      text('PAUSED — p to resume', 320, 300);
      if (kb.presses('p')) state = 'play';
      break;

    case 'gameover':
      textSize(24);
      text('RUN OVER — ' + score, 320, 270);
      textSize(16);
      text('best ' + best, 370, 305);
      text('enter returns to the title', 285, 345);
      if (kb.presses('enter')) state = 'title';
      break;

    default:
      text('unknown state: ' + state, 20, 300);
      break;
  }
}

// ---------------------------------------------------------------- tests
// Item 12: three PASS / FAIL tests of my own logic. These check scoreFor and
// pickKind, which are the two places a wrong number would be invisible on
// screen -- you would just feel that scoring was "off".
function check(label, got, want) {
  let ok = got === want;
  console.log((ok ? 'PASS' : 'FAIL') + ' — ' + label + ' (got ' + got + ', wanted ' + want + ')');
  return ok;
}

function runTests() {
  let supply = CRATE_KINDS[0];
  let fuel = CRATE_KINDS[2];

  check('a supply crate below combo is worth its face value', scoreFor(supply, 0), 1);
  check('combo doubles once the score reaches 3', scoreFor(fuel, 3), 10);
  check('a high roll picks the rarest kind', pickKind(0.99).name, 'fuel');
}
