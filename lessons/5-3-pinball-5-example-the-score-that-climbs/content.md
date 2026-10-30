## The score that climbs by itself

**Read after `5.3.4 Reading: A collision is not an event`.**

**Goal:** see the same game counted two ways — the wrong way and the right one — and learn to tell them apart by watching the number.

## Step 1: Counted every frame

```js live
let ball, goal, score;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  goal = new Sprite(200, 240, 200, 20, 'static');
  goal.color = 'gold';

  ball = new Sprite(200, 40, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.2;

  score = 0;
}

function draw() {
  background('#222');
  fill('white');
  textSize(20);
  text('score: ' + score, 20, 40);
  textSize(13);
  text('press R to drop the ball', 20, 280);

  if (ball.colliding(goal)) {
    score += 1;
  }

  if (kb.presses('r')) { ball.x = 200; ball.y = 40; ball.vel.x = 0; ball.vel.y = 0; }
}
```

**What you'll see:** the ball lands and the score races — several hundred within a second — and it keeps going while the ball sits on the bar. The number is not measuring "hits". It is measuring **frames spent touching**, which is a different quantity that no one asked for.

The tell is the speed. A correct score changes once per hit. A number that flies is counting time.

## Step 2: Counted once per touch

```js live
let ball, goal, score, wasTouching;

function setup() {
  new Canvas(400, 300);
  world.gravity.y = 10;

  goal = new Sprite(200, 240, 200, 20, 'static');
  goal.color = 'gold';

  ball = new Sprite(200, 40, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.2;

  score = 0;
  wasTouching = false;
}

function draw() {
  background('#222');
  fill('white');
  textSize(20);
  text('score: ' + score, 20, 40);
  textSize(13);
  text('press R to drop the ball', 20, 280);

  const touching = ball.colliding(goal);
  if (touching && !wasTouching) score += 1;
  wasTouching = touching;

  if (kb.presses('r')) { ball.x = 200; ball.y = 40; ball.vel.x = 0; ball.vel.y = 0; }
}
```

**What you'll see:** one point per landing. Press R three times and the score reads 3.

## Step 3: The same shape, for a different thing

Nothing about this pattern is specific to pinball. Any time a lasting condition should count once, you keep last frame's answer:

```js
// a goal area the ball should register once
const inZone = ball.y > 200 && ball.y < 240;
if (inZone && !wasInZone) { hits += 1; }
wasInZone = inZone;
```

The variable name (`wasTouching`, `wasInZone`) is the message to the next person reading your code: *this holds last frame's answer.*

## Key takeaways

- `colliding()` is a question about this frame. A score is a count of events. They are different.
- The fix is a variable that survives between frames plus `touching && !wasTouching`.
- The update `wasTouching = touching;` must run on **every** frame, not only when it is true — otherwise the count never resets and the second hit is lost.
- A score that moves at a suspicious speed is counting frames, not events.
