// 5.9.4 Challenges: Polish it your way (reference: all three).
// My polish: popups fade out, shaking the table more than 3 times in 120 frames
// tilts it and loses the ball, and from round 2 the ball is heavier. Without the
// tilt a player could hold the arrows and never lose a ball.

let ball, ground, score;
let chime;   // the sound, loaded once in setup()
let bumpers = [];
let pops = [];        // Challenge 1: every popup, so draw() can fade it
let nudges = 0;       // Challenge 2: nudges in this 120-frame window
let tilted = false;
let roundNumber = 1;  // Challenge 3: which round this is (not 'round': moSHion uses that name)

function setup() {
  new Canvas(440, 420);
  world.gravity.y = 10;

  // two walls keep the ball on the table
  const leftWall = new Sprite(5, 210, 10, 420, 'static');
  leftWall.color = 'gray';
  const rightWall = new Sprite(435, 210, 10, 420, 'static');
  rightWall.color = 'gray';

  // three bumpers in a zigzag: the ball rolls down b1, then b2, then b3
  const b1 = new Sprite(130, 110, 160, 14, 'static');
  b1.color = 'sienna';
  b1.rotation = 18;
  b1.worth = 1;
  b1.wasTouching = false;
  b1.text = b1.worth;

  const b2 = new Sprite(310, 200, 160, 14, 'static');
  b2.color = 'sienna';
  b2.rotation = -18;
  b2.worth = 5;
  b2.wasTouching = false;
  b2.text = b2.worth;

  const b3 = new Sprite(130, 290, 160, 14, 'static');
  b3.color = 'sienna';
  b3.rotation = 18;
  b3.worth = 10;
  b3.wasTouching = false;
  b3.text = b3.worth;

  bumpers.push(b1, b2, b3);

  ground = new Sprite(220, 405, 440, 20, 'static');
  ground.color = 'gray';

  // a heavy ball: bounciness 0 makes it roll instead of bounce,
  // so it touches each bumper once on the way down
  ball = new Sprite(80, 40, 22);
  ball.color = 'deepskyblue';
  ball.bounciness = 0;
  ball.mass = 1;
  ball.debug = true;

  score = 0;

  chime = loadSound('/moshion/assets/coin.wav');
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('click the game, then press R to drop the ball', 20, 26);
  textSize(22);
  text('score: ' + score, 280, 58);
  textSize(14);
  text('round: ' + roundNumber, 280, 80);

  for (const b of bumpers) {
    const touching = ball.colliding(b);
    if (touching && !b.wasTouching) {
      score += b.worth;
      chime.play();

      // the popup: made once, on the frame the hit starts
      const pop = new Sprite(b.x, b.y - 24, 28);
      pop.collider = 'none';
      pop.color = 'gold';
      pop.text = '+' + b.worth;
      pop.textColor = 'black';
      pop.textSize = 13;
      pop.vel.y = -1;
      pop.life = 40;
      pops.push(pop);
    }
    b.wasTouching = touching;
  }

  // Challenge 1: each popup fades from solid to invisible as its life runs out
  for (const p of pops) {
    p.opacity = p.life / 40;
  }

  // Challenge 2: count the nudges, and start counting again every 120 frames
  if (kb.presses('left') || kb.presses('right')) nudges += 1;
  if (frameCount % 120 === 0) nudges = 0;
  if (nudges > 3) tilted = true;

  if (tilted) {
    textSize(40);
    text('TILT', 300, 120);
    ball.y = 500;   // the ball is lost below the table
  } else {
    // nudge the table: a held arrow key pushes the ball
    if (kb.pressing('left')) ball.applyForce(-5, 0);
    if (kb.pressing('right')) ball.applyForce(5, 0);
  }

  if (kb.presses('r')) {
    tilted = false;
    nudges = 0;
    // Challenge 3: the next round, and a heavier ball from round 2
    roundNumber += 1;
    if (roundNumber >= 2) ball.mass = 3;
    ball.x = 80;
    ball.y = 40;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
