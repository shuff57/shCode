## Play the finished game

**Read before `5.3.3 Plan: Sketch your pinball game`.** About 5 minutes. There is nothing to write here: you play.

By the end of this you should be able to answer:

- What does a finished pinball game have that your 5.2.24 scene does not?
- Which of those parts do you build in the next seven modules (5.3 to 5.9)?

In 5.2.24 you built a pinball scene: gravity, things to bounce off, a bouncy ball. The next seven modules turn that scene into a game. Before you start, play the game you are building towards.

**Try it:** click the game once so it hears your keys, then press ENTER.

```js live id=pinball-finished-game
// PINBALL: the finished game. Play it first; you build the pieces one at a time.
//
//   hold SPACE, let go     launch the ball (the red bar is the power)
//   LEFT or Z              left flipper
//   RIGHT or M             right flipper
//   UP                     nudge the table
//   ENTER                  start, and play again after GAME OVER
//
// You do not need to follow this code yet. It is long on purpose.

const W = 420;
const H = 660;

let state;            // 'title', 'play' or 'over'
let score, lives, best;
let ball;
let bumpers = [];
let flippers = [];    // { bar, side, keys }
let popSound, hitSound, loseSound, launchSound;
let power = 0;        // plunger charge, 0 to 1
let ballInLane = true;
let message = '';

// ---------- building the table ----------

function wall(x, y, w, h, angle) {
  const s = new Sprite(x, y, w, h, 'static');
  s.color = '#44475a';
  s.bounciness = 0.4;
  s.friction = 0;
  if (angle) s.rotation = angle;
  return s;
}

function makeBumper(x, y, d, worth) {
  const b = new Sprite(x, y, d, d, 'static');
  b.shape = 'circle';
  b.color = '#ff79c6';
  b.bounciness = 1.4;       // above 1 = the bumper kicks the ball back harder
  b.worth = worth;
  b.wasTouching = false;
  b.text = '' + worth;
  b.textColor = 'black';
  b.textSize = 14;
  bumpers.push(b);
}

// A flipper is a bar on a hinge. side = 1 for the left flipper, -1 for the right.
function makeFlipper(pivotX, pivotY, side, keys) {
  const len = 78;
  const rest = 28 * side;     // tip hangs down when resting
  const up = -38 * side;      // tip lifts when the key is held (a wider swing than the rest angle, so it can kick)
  const pivot = new Sprite(pivotX, pivotY, 8, 8, 'static');
  pivot.color = '#6272a4';

  const bar = new Sprite(pivotX + side * len / 2, pivotY, len, 14);
  bar.color = '#f1fa8c';
  bar.bounciness = 0.35;
  bar.friction = 0.2;
  bar.mass = 8;
  bar.rotation = 0;
  // place the bar so its pivot end sits on the pivot at the resting angle
  bar.x = pivotX + side * (len / 2) * Math.cos(rest * Math.PI / 180);
  bar.y = pivotY + side * (len / 2) * Math.sin(rest * Math.PI / 180);
  bar.rotation = rest;
  new HingeJoint(pivot, bar);

  flippers.push({ bar, side, keys, rest, up, pivotX, pivotY });
}

function setup() {
  new Canvas(W, H);
  world.gravity.y = 12;

  // side walls and ceiling
  wall(5, H / 2, 10, H);
  wall(W - 5, H / 2, 10, H);
  wall(W / 2, 5, W, 10);

  // the plunger lane: a divider plus a floor the ball rests on
  wall(375, 395, 8, 530);
  wall(397, H - 36, 40, 10);

  // top-right corner arch (steers the launched ball onto the table)
  wall(375, 45, 100, 10, 45);
  // top-left corner
  wall(48, 48, 110, 10, -40);

  // funnels that feed the flippers
  wall(50, 525, 120, 12, 28);
  wall(325, 525, 120, 12, -28);

  makeFlipper(100, 586, 1, ['left', 'z']);
  makeFlipper(275, 586, -1, ['right', 'm']);

  // bumpers (worth, size)
  makeBumper(120, 190, 56, 10);
  makeBumper(250, 150, 56, 10);
  makeBumper(240, 270, 56, 25);
  makeBumper(95, 330, 40, 5);
  makeBumper(310, 360, 40, 5);

  // two little slingshot-style kickers above the flippers
  const sl = new Sprite(78, 440, 12, 70, 'static');
  sl.rotation = -22;
  sl.color = '#8be9fd';
  sl.bounciness = 1.3;
  sl.worth = 2;
  sl.wasTouching = false;
  bumpers.push(sl);
  const sr = new Sprite(297, 440, 12, 70, 'static');
  sr.rotation = 22;
  sr.color = '#8be9fd';
  sr.bounciness = 1.3;
  sr.worth = 2;
  sr.wasTouching = false;
  bumpers.push(sr);

  ball = new Sprite(397, H - 56, 16);
  ball.color = '#f8f8f2';
  ball.bounciness = 0.5;
  ball.friction = 0;
  ball.isSuperFast = true;      // checks hits every step so it cannot tunnel through a flipper

  popSound = loadSound('/moshion/assets/coin.wav');
  hitSound = loadSound('/moshion/assets/blip.wav');
  loseSound = loadSound('/moshion/assets/lose.wav');
  launchSound = loadSound('/moshion/assets/powerup.wav');

  best = Number(getItem('pinballBest')) || 0;
  state = 'title';
  resetGame();
}

// ---------- game flow ----------

function resetGame() {
  score = 0;
  lives = 3;
  message = '';
  servBall();
}

function servBall() {
  ball.x = 397;
  ball.y = H - 56;
  ball.vel.x = 0;
  ball.vel.y = 0;
  ball.rotation = 0;
  ballInLane = true;
  power = 0;
}

function popup(x, y, str) {
  const p = new Sprite(x, y, 30);
  p.collider = 'none';
  p.color = 'gold';
  p.text = str;
  p.textColor = 'black';
  p.textSize = 13;
  p.vel.y = -1;
  p.life = 40;
}

function drainBall() {
  lives -= 1;
  loseSound.play();
  if (lives <= 0) {
    state = 'over';
    if (score > best) {
      best = score;
      storeItem('pinballBest', best);
      message = 'NEW HIGH SCORE!';
    } else {
      message = '';
    }
  } else {
    servBall();
  }
}

// ---------- each frame ----------

// The flippers run in EVERY state, so they hold their resting angle on the
// title and game-over screens instead of sagging under gravity.
function moveFlippers(playing) {
  for (const f of flippers) {
    const held = playing && (kb.pressing(f.keys[0]) || kb.pressing(f.keys[1]));
    const target = held ? f.up : f.rest;
    const diff = target - f.bar.rotation;
    // rotationSpeed is degrees per frame, so "the angle still to go" lands
    // exactly on the target: no overshoot, and it stays put once it arrives.
    // The cap is the flipper's top speed (fast up, slower back down).
    const topSpeed = held ? 20 : 10;
    const turn = Math.max(-topSpeed, Math.min(topSpeed, diff));
    f.bar.rotationSpeed = turn;
    // The bar turns about its END, not its middle. Spinning it alone makes the
    // hinge fight us (it lags, then overshoots), so also give the middle the
    // sideways speed that goes with that turn: speed = turn (radians) x distance.
    const w = turn * Math.PI / 180;
    f.bar.vel.x = -(f.bar.y - f.pivotY) * w;
    f.bar.vel.y = (f.bar.x - f.pivotX) * w;
    if (held && !f.wasHeld) hitSound.play();
    f.wasHeld = held;
  }
}

function draw() {
  background('#1e1f29');
  moveFlippers(state === 'play');

  if (state === 'title') {
    if (kb.presses('enter') || kb.presses('space')) {
      resetGame();
      state = 'play';
    }
    servBall();       // keep the ball parked in the lane
    return;
  }

  if (state === 'over') {
    if (kb.presses('enter')) {
      resetGame();
      state = 'play';
    }
    servBall();
    return;
  }

  // ----- state === 'play' -----

  // plunger: hold SPACE to charge, let go to launch (only while the ball is in the lane)
  if (ballInLane) {
    if (kb.pressing('space')) {
      power = Math.min(1, power + 0.02);
    }
    if (kb.released('space') && power > 0.05) {
      ball.vel.y = -(8 + power * 7);
      ballInLane = false;
      launchSound.play();
      power = 0;
    }
  }
  // if the launched ball falls back into the lane, it is plunger-ready again
  if (!ballInLane && ball.x > 380 && ball.y > H - 70 && ball.vel.y > -1) ballInLane = true;

  // score each bumper once per hit
  for (const b of bumpers) {
    const touching = ball.colliding(b);
    if (touching && !b.wasTouching) {
      score += b.worth;
      popSound.play();
      popup(b.x, b.y - 30, '+' + b.worth);
    }
    b.wasTouching = touching;
  }

  // nudge the table
  if (kb.presses('up')) {
    ball.applyForce((Math.random() < 0.5 ? -1 : 1) * 40, -60);
  }

  // drain
  if (ball.y > H + 20) drainBall();
}

// Text goes in drawTop(): sprites are painted AFTER draw(), so anything drawn
// there would be hidden behind the bumpers.
function drawTop() {
  textAlign(LEFT);
  if (state === 'title') {
    drawTitle();
    return;
  }
  drawHud();
  if (state === 'play' && ballInLane) drawPlungerMeter();
  if (state === 'over') {
    fill('#1e1f29');
    rect(60, 215, 255, 160);
    fill('white');
    textAlign(CENTER);
    textSize(30);
    text('GAME OVER', W / 2 - 22, 250);
    textSize(16);
    text('score ' + score + '   best ' + best, W / 2 - 22, 285);
    if (message) { fill('gold'); text(message, W / 2 - 22, 315); }
    fill('white');
    text('press ENTER to play again', W / 2 - 22, 350);
    textAlign(LEFT);
  }
}

function drawHud() {
  fill('white');
  textAlign(LEFT);
  textSize(14);
  text('SCORE ' + score, 20, 28);
  text('BEST ' + best, 20, 46);
  text('BALLS ' + lives, 330, 28);
}

function drawPlungerMeter() {
  fill('#44475a');
  rect(386, 300, 8, 200);
  fill('#ff5555');
  rect(386, 500 - 200 * power, 8, 200 * power);
  fill('white');
  textSize(10);
  textAlign(CENTER);
  text('hold SPACE', 390, 290);
  textAlign(LEFT);
}

function drawTitle() {
  const cx = W / 2 - 22;     // centre of the table, left of the plunger lane
  fill('#1e1f29');
  rect(20, 165, 340, 270);
  fill('#ff79c6');
  textAlign(CENTER);
  textSize(44);
  text('PINBALL', cx, 210);
  fill('white');
  textSize(14);
  text('hold SPACE, release to launch', cx, 270);
  text('LEFT / Z and RIGHT / M: flippers', cx, 295);
  text('UP nudges the ball', cx, 320);
  fill('gold');
  textSize(18);
  text('press ENTER to start', cx, 380);
  fill('#8393c4');
  textSize(13);
  text('best ' + best, cx, 415);
  textAlign(LEFT);
}
```

**What you'll see:** a tall table with five pink bumpers and two blue kickers, two yellow flippers at the bottom, and a long lane on the right where the ball waits. Each key does what the comment at the top says.

**Try this, in order:**

1. Hold SPACE until the red bar is about half full, then let go. The ball shoots up the lane and onto the table.
2. Watch the score. Every bump adds the number printed on the bumper, and a gold **+10** floats up from it. A bump counts **once**, however long the ball stays in contact.
3. Press LEFT and RIGHT to swing the flippers. Catch the ball and send it back up before it falls out of the bottom.
4. Press UP to nudge the ball when it is about to drain.
5. Let all three balls drain. The game says **GAME OVER** and shows your best score. Press ENTER and play again.

## What the game is made of

Every part of it is something you can name, and most of it you build in this unit.

| What you saw | Where you build it |
| --- | --- |
| the walls, the ball, the bumpers | 5.3 (this module) |
| a score that counts each bump once | 5.4 |
| a ball you can lose, and a way to start again | 5.5 |
| the chime on every hit | 5.6 |
| the numbers on the bumpers and the +10 popups | 5.7 |
| nudging the table, and how heavy the ball feels | 5.8 |
| playing it and polishing it | 5.9 |

Three parts are **not** built in this unit, and that is fine:

- **The flippers** are bars on a hinge. Hinges are 6.13 (Joints), so until then your table has no flippers and the R key puts the ball back at the top.
- **The title screen and GAME OVER screen** are a game that knows which screen it is on. That is 6.11 (Game State Machines).
- **The best score that survives closing the page** is saving and loading, 6.10.

The three-balls counter and the launch lane are extras: nothing in the unit asks you to write them, but the pieces to try them are all in 5.3 to 5.9.

**Try this next:** look at the table above and think about the game you just played. In 5.3.3 you will be asked to list at least four parts of a pinball game. You have just seen more than that.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **flipper** | a bar you swing with a key to hit the ball back up the table |
| **plunger** | the spring in the lane that launches the ball when you let go |
| **bumper** | a fixed shape the ball bounces off, and that scores when it does |
| **best score** | the highest score so far, kept so the next game has something to beat |
