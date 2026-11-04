// 5.4.5 Lab: Three bumpers, three values.

let ball, ground, score;
let bumpers = [];

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

  const b2 = new Sprite(310, 200, 160, 14, 'static');
  b2.color = 'sienna';
  b2.rotation = -18;
  b2.worth = 5;

  const b3 = new Sprite(130, 290, 160, 14, 'static');
  b3.color = 'sienna';
  b3.rotation = 18;
  b3.worth = 10;

  bumpers.push(b1, b2, b3);

  ground = new Sprite(220, 405, 440, 20, 'static');
  ground.color = 'gray';

  // a heavy ball: bounciness 0 makes it roll instead of bounce,
  // so it touches each bumper once on the way down
  ball = new Sprite(80, 40, 22);
  ball.color = 'deepskyblue';
  ball.bounciness = 0;

  score = 0;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('press R to drop the ball', 20, 26);
  textSize(22);
  text('score: ' + score, 280, 58);

  // STEP 1: only bumpers[0] counts, and it counts on every frame it is
  //   touched. Loop over every bumper instead, and let each one remember
  //   whether it was touched last frame.

  if (ball.colliding(bumpers[0])) {
    score += 1;
  }

  if (kb.presses('r')) {
    ball.x = 80;
    ball.y = 40;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
