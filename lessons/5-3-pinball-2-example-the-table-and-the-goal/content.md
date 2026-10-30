## The table and the goal

**Read after `5.3.1 Reading: From scene to game`.**

**Goal:** give the scene a target and a number that goes up when the ball reaches it.

## Step 1: The table, with bumpers you can name

Same table as 5.2.14. The only change is that the obstacles have names, so the code can ask about them.

```js live
let ball, bumper, floor, goal;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  bumper = new Sprite(200, 160, 140, 16, 'static');
  bumper.color = 'sienna';
  bumper.rotation = -12;

  floor = new Sprite(200, 385, 400, 20, 'static');
  floor.color = 'gray';

  ball = new Sprite(200, 40, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.9;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('press R to drop the ball', 20, 28);
  if (kb.presses('r')) { ball.x = 200; ball.y = 40; ball.vel.x = 0; ball.vel.y = 0; }
}
```

**What you'll see:** exactly the scene from 5.3.1. Nothing new is visible — `bumper` and `floor` are the same sprites, now held in variables so the code can reach them.

## Step 2: A target at the bottom

A goal is just another static sprite, in a place the ball can reach if it is aimed right.

```js live
let ball, bumper, floor, goal, score;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  bumper = new Sprite(200, 160, 140, 16, 'static');
  bumper.color = 'sienna';
  bumper.rotation = -12;

  floor = new Sprite(200, 385, 400, 20, 'static');
  floor.color = 'gray';

  goal = new Sprite(330, 250, 60, 60, 'static');
  goal.color = 'gold';

  ball = new Sprite(200, 40, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.9;

  score = 0;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('press R to drop the ball', 20, 28);
  if (kb.presses('r')) { ball.x = 200; ball.y = 40; ball.vel.x = 0; ball.vel.y = 0; }
}
```

**What you'll see:** a gold block on the right. The ball falls past it and lands on the floor. Nothing happens when they touch, because nothing is looking yet.

## Step 3: Count the touch

```js live
let ball, bumper, floor, goal, score;

function setup() {
  new Canvas(400, 400);
  world.gravity.y = 10;

  bumper = new Sprite(200, 160, 140, 16, 'static');
  bumper.color = 'sienna';
  bumper.rotation = -12;

  floor = new Sprite(200, 385, 400, 20, 'static');
  floor.color = 'gray';

  goal = new Sprite(330, 250, 60, 60, 'static');
  goal.color = 'gold';

  ball = new Sprite(200, 40, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.9;

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

  if (kb.presses('r')) { ball.x = 200; ball.y = 40; ball.vel.x = 0; ball.vel.y = 0; }
}
```

**What you'll see:** push the ball into the gold block and the score does not go up by one. It climbs so fast the number is unreadable, and it keeps climbing for as long as the ball rests against the block.

That is not a mistake in your typing — it is the whole subject of the next lesson. `colliding()` answers a question about *this frame*, and `draw()` runs sixty times a second. Leave the number counting for now; 5.3.4 explains it and 5.3.6 fixes it.

## Key takeaways

- A goal is a sprite, and a score is a variable — neither needs anything new.
- `text()` shows a variable that changes, which is what makes a score readable.
- The score in Step 3 is wrong, and wrong in a way worth understanding rather than patching.
