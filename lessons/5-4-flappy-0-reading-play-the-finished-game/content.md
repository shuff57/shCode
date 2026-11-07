## Play the finished game

**Read before `5.10.1 Plan: Sketch your Flappy game`.** About 5 minutes. There is nothing to write here: you play.

By the end of this you should be able to answer:

- What does a finished Flappy have that a bird which only falls does not?
- Which of those parts do you build in the next three modules (5.10 to 5.12)?

Flappy looks like one idea and is really four: a bird that falls and jumps, pipes that arrive and leave, a score that counts each pipe once, and an ending you can start again. The next three modules build them one at a time. Before you start, play the game you are building towards. The code is hidden on purpose: you are not expected to read it yet.

**Try it:** press **Play**, then press ENTER to start. The keys are in the table below the game.

```js live demo size=420x420 id=flappy-finished-game
// FLAPPY: the finished demo students play before they build their own.
//
// The core is exactly the Flappy unit's skeleton:
//   a bird sprite under world.gravity; a flap sets bird.vel.y on a key press;
//   pipes are kinematic top/bottom pairs built on a frame timer, kept in an
//   array, and deleted once they leave the left edge; a score counted once per
//   pair with a `passed` flag; a crash stops the world; Enter / R starts again.
// On top of that: a title screen, a game-over panel, a saved best score, sound,
// and some paint (sky, hills, clouds, a scrolling ground, puffs).
//
// Controls:  SPACE / UP / click = flap     ENTER = start / play again     R = restart

const W = 400;
const H = 400;
const GROUND_Y = 370;          // the top of the ground strip; the floor of the world
const BIRD_X = 100;
const BIRD_R = 12;
const PIPE_W = 50;
const GAP = 130;
const GAP_MIN = 105;           // lowest / highest gap centre: both ends of the gap
const GAP_MAX = 265;           // stay at least 40px from the top and from the ground
const MAX_GAP_STEP = 70;       // the next gap is never more than this far from the last

let state;                     // 'title', 'play' or 'over'
let score, best, newBest;
let bird, eyeWhite, eyePupil, beak;
let pipes = [];                // the top sprite of every pair (see makePipe)
let puffs = [];
let clouds = [];
let scrollSpeed = 2;           // pixels per frame the pipes move left
let spawnTimer = 0;
let lastGapY = 200;
let groundX = 0;
let hillX = 0;
let overFrames = 0;
let flashFrames = 0;
let jumpSound, coinSound, hitSound;

// ---------- the bird ----------

function flap() {
  bird.vel.y = -4;
  jumpSound.play();
  // a few little puffs behind the wings
  for (let i = 0; i < 3; i++) {
    makePuff(bird.x - 10, bird.y + 6, -random(0.8, 2), random(0.2, 1.4), random(5, 8), 'white', 14);
  }
}

// Keeps the bird's face pieces glued to it, turned with it.
function placePart(part, dx, dy) {
  const a = bird.rotation * Math.PI / 180;
  part.x = bird.x + dx * Math.cos(a) - dy * Math.sin(a);
  part.y = bird.y + dx * Math.sin(a) + dy * Math.cos(a);
  part.rotation = bird.rotation;
}

// ---------- puffs (short-lived sprites, no collisions) ----------

function makePuff(x, y, vx, vy, d, color, life) {
  const p = new Sprite(x, y, d);
  p.collider = 'none';
  p.color = color;
  p.stroke = null;
  p.layer = 4;
  p.vel.x = vx;
  p.vel.y = vy;
  p.life = life;
  p.fullLife = life;
  puffs.push(p);
}

// ---------- pipes ----------

// Builds one pair of pipes just off the right edge, with a gap of 130 at a random height.
// The pair is the `top` sprite; it carries its partner and its score flag with it.
function makePipe() {
  const lo = Math.max(GAP_MIN, lastGapY - MAX_GAP_STEP);
  const hi = Math.min(GAP_MAX, lastGapY + MAX_GAP_STEP);
  const gapY = random(lo, hi);
  lastGapY = gapY;

  const topH = gapY - GAP / 2;
  const botH = GROUND_Y - (gapY + GAP / 2);
  const x = W + 40;

  const top = new Sprite(x, topH / 2, PIPE_W, topH, 'kinematic');
  const bottom = new Sprite(x, GROUND_Y - botH / 2, PIPE_W, botH, 'kinematic');
  top.color = 'forestgreen';
  bottom.color = 'forestgreen';
  top.stroke = '#14541c';
  bottom.stroke = '#14541c';
  top.vel.x = -scrollSpeed;
  bottom.vel.x = -scrollSpeed;

  // darker lips on the pipe mouths: look only, they never collide
  const capA = new Sprite(x, topH - 9, PIPE_W + 8, 18);
  const capB = new Sprite(x, GROUND_Y - botH + 9, PIPE_W + 8, 18);
  for (const c of [capA, capB]) {
    c.collider = 'none';
    c.color = '#1f7a2a';
    c.stroke = '#14541c';
  }

  top.mate = bottom;
  top.capA = capA;
  top.capB = capB;
  top.passed = false;
  return top;
}

function removePipe(p) {
  p.mate.delete();
  p.capA.delete();
  p.capB.delete();
  p.delete();
}

function clearPipes() {
  for (const p of pipes) removePipe(p);
  pipes = [];
}

// ---------- rounds ----------

function startRound() {
  clearPipes();
  for (const q of puffs) if (!q.removed) q.delete();
  puffs = [];

  score = 0;
  newBest = false;
  scrollSpeed = 2;
  spawnTimer = 9999;           // the first pair is built on the first frame
  lastGapY = 200;
  overFrames = 0;
  flashFrames = 0;

  bird.x = BIRD_X;
  bird.y = 200;
  bird.vel.x = 0;
  bird.vel.y = 0;
  world.gravity.y = 20;
  state = 'play';
  flap();
}

function crash(hitAPipe) {
  state = 'over';
  overFrames = 0;
  flashFrames = 8;
  hitSound.play();

  // the world stops; the bird falls to the ground
  for (const p of pipes) {
    p.vel.x = 0;
    p.mate.vel.x = 0;
  }
  if (hitAPipe) bird.vel.y = -2;

  if (score > best) {
    best = score;
    newBest = true;
    storeItem('flappyBest', best);
  }

  for (let i = 0; i < 14; i++) {
    const dir = random(0, 360) * Math.PI / 180;
    const sp = random(1, 4);
    const color = random(['gold', 'orange', 'white', '#fff2a8']);
    makePuff(bird.x, bird.y, Math.cos(dir) * sp, Math.sin(dir) * sp, random(4, 9), color, 30);
  }
}

// ---------- the three states ----------

function updateTitle() {
  // the bird hovers; nothing falls until the round starts
  bird.y = 200 + Math.sin(frameCount * 0.08) * 8;
  bird.vel.y = 0;
  bird.rotation = Math.cos(frameCount * 0.08) * 8;
  scrollSpeed = 1.2;
  if (kb.presses('enter') | kb.presses('space') | mouse.presses()) startRound();
}

function updatePlay() {
  if (kb.presses('space') | kb.presses('up') | mouse.presses()) flap();

  // The ceiling holds the bird in; only the floor and the pipes are deadly.
  if (bird.y < BIRD_R) {
    bird.y = BIRD_R;
    if (bird.vel.y < 0) bird.vel.y = 0;
  }

  // a gentle ramp: 2 px/frame at the start, 3.2 by score 25, never faster
  scrollSpeed = Math.min(3.2, 2 + score * 0.048);

  // one pair about every 180 pixels of travel (90 frames at the start speed)
  spawnTimer += 1;
  if (spawnTimer >= Math.round(180 / scrollSpeed)) {
    spawnTimer = 0;
    pipes.push(makePipe());
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    if (pipes[i].x < -40) {
      removePipe(pipes[i]);
      pipes.splice(i, 1);
    }
  }

  let crashed = false;
  let hitAPipe = false;
  for (const p of pipes) {
    p.vel.x = -scrollSpeed;
    p.mate.vel.x = -scrollSpeed;

    if (p.x < bird.x && !p.passed) {
      score += 1;
      p.passed = true;
      coinSound.play();
    }
    if (bird.colliding(p) || bird.colliding(p.mate)) {
      crashed = true;
      hitAPipe = true;
    }
  }
  if (bird.y + BIRD_R >= GROUND_Y) crashed = true;

  bird.rotation = constrain(bird.vel.y * 8, -25, 75);
  if (crashed) crash(hitAPipe);
}

function updateOver() {
  overFrames += 1;
  bird.rotation = constrain(bird.vel.y * 8, -25, 80);
  if (bird.y + BIRD_R >= GROUND_Y) {
    bird.y = GROUND_Y - BIRD_R;
    bird.vel.y = 0;
    bird.rotation = 80;
  }
  if (bird.y < BIRD_R) bird.y = BIRD_R;
  // Enter and R restart at once; a click waits half a second so a flapping
  // finger cannot skip the score by accident.
  if (kb.presses('enter') | kb.presses('r') | (overFrames > 30 && mouse.presses())) startRound();
}

// ---------- paint (under the sprites) ----------

function drawScenery() {
  noStroke();

  // sky in nine bands, deep blue at the top to pale at the horizon
  const bands = 9;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const r = Math.round(60 + 150 * t);
    const g = Math.round(150 + 85 * t);
    const b = Math.round(220 + 25 * t);
    fill('rgb(' + r + ',' + g + ',' + b + ')');
    rect(0, Math.floor(i * GROUND_Y / bands), W, Math.ceil(GROUND_Y / bands) + 1);
  }

  // clouds drift slowly, whatever the state
  fill('rgba(255,255,255,0.85)');
  for (const c of clouds) {
    c.x -= c.v;
    if (c.x < -90) c.x = W + 90;
    circle(c.x, c.y, 30 * c.s);
    circle(c.x + 22 * c.s, c.y + 4 * c.s, 38 * c.s);
    circle(c.x + 46 * c.s, c.y + 6 * c.s, 28 * c.s);
    circle(c.x + 20 * c.s, c.y + 12 * c.s, 34 * c.s);
  }

  // two rows of hills, the far one slower
  const motion = state === 'over' ? 0 : scrollSpeed;
  hillX = (hillX - motion * 0.25) % 160;
  groundX = (groundX - motion) % 40;
  fill('#9bd9a8');
  for (let hx = hillX - 160; hx < W + 160; hx += 160) {
    ellipse(hx + 80, GROUND_Y, 190, 110);
  }
  fill('#7cc88f');
  for (let hx = groundX * 0.5 - 140; hx < W + 140; hx += 140) {
    ellipse(hx + 70, GROUND_Y + 6, 150, 56);
  }

  // the ground: grass lip, dirt, and stripes that slide left with the pipes
  fill('#d8c78a');
  rect(0, GROUND_Y, W, H - GROUND_Y);
  fill('#c4b273');
  for (let gx = groundX - 40; gx < W + 40; gx += 40) {
    rect(gx, GROUND_Y + 14, 16, H - GROUND_Y - 14);
  }
  fill('#76c442');
  rect(0, GROUND_Y, W, 10);
  fill('#4c9a2a');
  rect(0, GROUND_Y + 10, W, 3);
  fill('#5fae33');
  for (let gx = groundX - 40; gx < W + 40; gx += 40) {
    rect(gx, GROUND_Y, 20, 5);
  }
}

// ---------- the sketch ----------

function setup() {
  new Canvas(W, H);
  world.gravity.y = 0;                       // nothing falls until a round starts

  best = Number(getItem('flappyBest')) || 0;
  score = 0;
  newBest = false;

  jumpSound = loadSound('/moshion/assets/jump.wav');
  coinSound = loadSound('/moshion/assets/coin.wav');
  hitSound = loadSound('/moshion/assets/hit.wav');

  for (let i = 0; i < 5; i++) {
    clouds.push({ x: 40 + i * 90, y: random(40, 150), s: random(0.7, 1.3), v: random(0.15, 0.4) });
  }

  bird = new Sprite(BIRD_X, 200, 24);
  bird.color = 'gold';
  bird.stroke = '#d98a00';
  bird.strokeWeight = 2;
  bird.bounciness = 0;
  bird.layer = 5;

  eyeWhite = new Sprite(BIRD_X + 5, 196, 8);
  eyePupil = new Sprite(BIRD_X + 7, 196, 4);
  beak = new Sprite(BIRD_X + 13, 202, 10, 6);
  for (const part of [eyeWhite, eyePupil, beak]) {
    part.collider = 'none';
    part.stroke = null;
    part.layer = 6;
  }
  eyeWhite.color = 'white';
  eyePupil.color = 'black';
  beak.color = 'orangered';

  state = 'title';
}

function draw() {
  if (state === 'title') updateTitle();
  else if (state === 'play') updatePlay();
  else updateOver();

  // The bird's x never changes: the pipes do the moving. Holding it here every
  // frame means a pipe that bumps the bird cannot shove it off its spot.
  bird.x = BIRD_X;
  bird.vel.x = 0;
  bird.angularVelocity = 0;

  placePart(eyeWhite, 5, -4);
  placePart(eyePupil, 6.5, -4);
  placePart(beak, 13, 2);

  // each lip rides on its pipe
  for (const p of pipes) {
    p.capA.x = p.x;
    p.capB.x = p.x;
  }

  for (const q of puffs) {
    if (!q.removed) q.opacity = Math.max(0, q.life / q.fullLife);
  }
  puffs = puffs.filter((q) => !q.removed);

  drawScenery();
}

// ---------- text and panels (above the sprites) ----------

function shadowText(str, x, y, size, color) {
  text(str, x + 2, y + 2, size, 'rgba(0,0,0,0.45)');
  text(str, x, y, size, color);
}

function drawTop() {
  noStroke();

  if (flashFrames > 0) {
    fill('rgba(255,255,255,' + (flashFrames / 8) * 0.6 + ')');
    rect(0, 0, W, H);
    flashFrames -= 1;
  }

  if (state === 'title') {
    textAlign('center');
    shadowText('FLAPPY', 200, 105, 56, 'gold');
    fill('rgba(0,0,0,0.4)');
    rect(60, 232, 280, 96, 12);
    shadowText('press SPACE to flap', 200, 262, 18, 'white');
    shadowText('press ENTER to start', 200, 288, 18, 'white');
    shadowText('best: ' + best, 200, 316, 16, 'gold');
    textAlign('left');
    return;
  }

  // score, top left
  textAlign('left');
  shadowText('score: ' + score, 14, 32, 24, 'white');
  shadowText('best: ' + best, 14, 52, 13, '#fff2a8');

  if (state === 'over') {
    fill('rgba(0,0,0,0.6)');
    rect(60, 105, 280, 180, 14);
    textAlign('center');
    shadowText('GAME OVER', 200, 148, 32, 'white');
    shadowText('score: ' + score, 200, 184, 20, 'white');
    shadowText('best: ' + best, 200, 208, 20, 'gold');
    if (newBest) shadowText('NEW BEST!', 200, 236, 22, 'orangered');
    shadowText('press ENTER to play again', 200, 268, 14, '#d6e4ff');
    textAlign('left');
  }
}
```

| Key | What it does |
| --- | --- |
| **SPACE**, **UP** or a **click** | flap |
| **ENTER** | starts the game, and plays again after GAME OVER |
| **R** | plays again after GAME OVER |

**What you'll see:** a bird in a blue sky with hills, clouds and a scrolling ground. Green pipes slide in from the right, each with a gap. The bird falls all the time and jumps a little with each flap.

**Try this, in order:**

1. Press **Play**, then ENTER. Tap SPACE to flap. One tap is a small jump, not a flight: you tap again and again.
2. Fly through a gap. The score goes up by one for each pipe you get past, once, not every frame.
3. Watch the pipes at the left edge. They slide off and are gone: the game does not keep every pipe it ever made.
4. Touch a pipe or the ground. Everything stops and the game says **GAME OVER**.
5. Press ENTER to play again. The score is back to 0 and the old pipes are gone.

## What the game is made of

Every part of it is something you can name, and most of it you build in this unit.

| What you saw | Where you build it |
| --- | --- |
| a bird that is always falling | 5.10 |
| a flap that sets the bird going up, once per tap | 5.10 |
| pipes that slide in from the right and are removed when they leave | 5.11 |
| a score that counts each pipe once | 5.12 |
| a crash that stops the world, and a key that starts again | 5.12 |
| playing it, then making it yours | 5.12 (the playtest and the challenges) |

Some parts are **not** built in this unit, and that is fine:

- **The title screen and the GAME OVER panel** are a game that knows which screen it is on. That is 6.11 (Game State Machines). In 5.12 the game just says Game over and waits for R.
- **A best score that survives closing the page** is saving and loading, 6.10.
- **The sounds** use `loadSound()`, which you meet in the Pinball unit (5.6).
- **The sky, hills, clouds, the scrolling ground and the little puffs** are only paint. They never decide whether you crashed.

**Try this next:** look at the table above and think about the game you just played. In 5.10.1 you will be asked to list the parts of Flappy. You have just seen more than that.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **gravity** | a steady pull that makes the bird speed up as it falls |
| **flap** | one tap that sets the bird moving up |
| **pipe pair** | a top pipe and a bottom pipe with a gap between them |
| **best score** | the highest score so far, kept so the next game has something to beat |
