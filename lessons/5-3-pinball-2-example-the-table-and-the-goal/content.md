## The table and the goal

**Read after `5.3.2 Reading: From scene to game`.**

**Goal:** give the scene a target and a number that goes up when the ball reaches it.

## Step 1: The table, with bumpers you can name

The table from 5.3.2. The bumper and the floor are held in variables, so the code can ask about them later. The two walls are never asked about, so they stay inside `setup()`.

```js live
let ball, bumper, floor, goal;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  // two walls keep the ball on the table
  const leftWall = new Sprite(5, 200, 10, 400, 'static');
  leftWall.color = 'gray';
  const rightWall = new Sprite(395, 200, 10, 400, 'static');
  rightWall.color = 'gray';

  bumper = new Sprite(140, 115, 200, 14, 'static');
  bumper.color = 'sienna';
  bumper.rotation = 14;

  // the floor stops short of the left wall: that gap is the drain
  floor = new Sprite(250, 385, 280, 20, 'static');
  floor.color = 'gray';

  ball = new Sprite(70, 60, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.75;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('press R to drop the ball', 20, 28);
  if (kb.presses('r')) { ball.x = 70; ball.y = 60; ball.vel.x = 0; ball.vel.y = 0; }
}
```

**What you'll see:** exactly the scene from 5.3.2. Nothing new is visible — `bumper` and `floor` are the same sprites, now held in variables so the code can reach them.

## Step 2: A target on the ball's path

A goal is just another static sprite, in a place the ball can reach. This one is a gold bar at the low end of the bumper, tilted the same way, so the ball rolls straight onto it.

```js live
let ball, bumper, floor, goal, score;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  // two walls keep the ball on the table
  const leftWall = new Sprite(5, 200, 10, 400, 'static');
  leftWall.color = 'gray';
  const rightWall = new Sprite(395, 200, 10, 400, 'static');
  rightWall.color = 'gray';

  bumper = new Sprite(140, 115, 200, 14, 'static');
  bumper.color = 'sienna';
  bumper.rotation = 14;

  // the floor stops short of the left wall: that gap is the drain
  floor = new Sprite(250, 385, 280, 20, 'static');
  floor.color = 'gray';

  goal = new Sprite(286, 151, 100, 14, 'static');
  goal.color = 'gold';
  goal.rotation = 14;

  ball = new Sprite(70, 60, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.75;

  score = 0;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('press R to drop the ball', 20, 28);
  if (kb.presses('r')) { ball.x = 70; ball.y = 60; ball.vel.x = 0; ball.vel.y = 0; }
}
```

**What you'll see:** a gold bar at the end of the bumper. The ball rolls down the bumper, straight across the gold, into the right wall, and on to the floor and the drain. Nothing happens when the ball crosses the gold, because nothing is looking yet.

## Step 3: Count the touch

```js live
let ball, bumper, floor, goal, score;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  // two walls keep the ball on the table
  const leftWall = new Sprite(5, 200, 10, 400, 'static');
  leftWall.color = 'gray';
  const rightWall = new Sprite(395, 200, 10, 400, 'static');
  rightWall.color = 'gray';

  bumper = new Sprite(140, 115, 200, 14, 'static');
  bumper.color = 'sienna';
  bumper.rotation = 14;

  // the floor stops short of the left wall: that gap is the drain
  floor = new Sprite(250, 385, 280, 20, 'static');
  floor.color = 'gray';

  goal = new Sprite(286, 151, 100, 14, 'static');
  goal.color = 'gold';
  goal.rotation = 14;

  ball = new Sprite(70, 60, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.75;

  score = 0;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('press R to drop the ball', 20, 28);
  textSize(22);
  text('score: ' + score, 20, 60);

  if (ball.colliding(goal)) {
    score += 1;
  }

  if (kb.presses('r')) { ball.x = 70; ball.y = 60; ball.vel.x = 0; ball.vel.y = 0; }
}
```

**What you'll see:** the ball crosses the gold bar once, and the score does not go up by one. It shoots up to **33** in about half a second while the ball rolls across the gold, then stops when the ball leaves it. Press R and the next drop adds another 33. One crossing, thirty-three points.

That is not a mistake in your typing — it is the whole subject of the next lesson. `colliding()` answers a question about *this frame*, and `draw()` runs sixty times a second. The ball touched the gold for 33 frames, so the score counted 33. Leave the number counting for now; 5.3.5 explains it and 5.3.7 fixes it.

## Key takeaways

- A goal is a sprite, and a score is a variable — neither needs anything new.
- `text()` shows a variable that changes, which is what makes a score readable.
- The score in Step 3 is wrong, and wrong in a way worth understanding rather than patching.
