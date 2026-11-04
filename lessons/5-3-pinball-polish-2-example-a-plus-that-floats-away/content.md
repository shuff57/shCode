## A "+5" that floats away

**Read after `5.3.15 Reading: Words on a sprite, and sprites that run out`.** About 10 minutes.

**Goal:** on a two-bumper table, label each bumper with what it is worth, and make a little "+5" pop up on each hit, float upward and disappear by itself. Then see the same popup in the wrong place, so you can recognise that bug when it happens to you.

## Step 1: Label each bumper with its worth

Each bumper already keeps its own `worth`, the way the bumpers in 5.3.8 did. One more line per bumper in `setup()` writes that number on it:

```js
b1.worth = 2;
b1.wasTouching = false;
b1.text = b1.worth;
```

`b1.text = b1.worth` reads the bumper's own worth and writes it on the bumper. If you ever change `b1.worth`, change it on that one line and the label follows.

## Step 2: Pop the points on a hit

Here is the whole table. Run it, click the canvas, and press R to drop the ball again.

```js live
let ball, ground, score;
let bumpers = [];

function setup() {
  new Canvas(440, 340);
  world.gravity.y = 10;

  const b1 = new Sprite(130, 110, 160, 14, 'static');
  b1.color = 'sienna';
  b1.rotation = 18;
  b1.worth = 2;
  b1.wasTouching = false;
  b1.text = b1.worth;

  const b2 = new Sprite(310, 200, 160, 14, 'static');
  b2.color = 'sienna';
  b2.rotation = -18;
  b2.worth = 5;
  b2.wasTouching = false;
  b2.text = b2.worth;

  bumpers.push(b1, b2);

  ground = new Sprite(220, 330, 440, 20, 'static');
  ground.color = 'gray';

  ball = new Sprite(80, 40, 22);
  ball.color = 'deepskyblue';
  ball.bounciness = 0;

  score = 0;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('click here, then press R to drop the ball', 20, 26);
  textSize(22);
  text('score: ' + score, 300, 58);

  for (const b of bumpers) {
    const touching = ball.colliding(b);
    if (touching && !b.wasTouching) {
      score += b.worth;

      // the popup: made once, on the frame the hit starts
      const pop = new Sprite(b.x, b.y - 24, 28);
      pop.collider = 'none';
      pop.color = 'gold';
      pop.text = '+' + b.worth;
      pop.textColor = 'black';
      pop.textSize = 13;
      pop.vel.y = -1;
      pop.life = 40;
    }
    b.wasTouching = touching;
  }

  if (kb.presses('r')) {
    ball.x = 80;
    ball.y = 40;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
```

**What you'll see:** the ball rolls down the bumper marked 2, and a gold "+2" pops up above it and drifts upward. Then the ball lands on the bumper marked 5 and a "+5" pops up. Each popup is gone a moment later. The score reads 2, then 7.

The popup is eight lines, and every one of them is inside the `if (touching && !b.wasTouching)` block, next to `score += b.worth;`. That `if` is true on one frame per hit (5.3.7), so each hit makes exactly one popup. Line by line:

- `const pop = new Sprite(b.x, b.y - 24, 28);` makes a small circle 24 pixels above the middle of the bumper that was hit. It is a `const` inside the `if` because nothing outside this block ever needs to name it again: once it is made, it moves and removes itself.
- `pop.collider = 'none';` lets the ball pass straight through it (5.2.16). moSHion also switches gravity off for a sprite whose collider is `'none'`, so it floats instead of falling.
- `pop.text = '+' + b.worth;` joins the `+` sign to the bumper's worth, the same `+` as `'score: ' + score`, so it reads `+2` or `+5`. `.textColor` and `.textSize` make it black and a little smaller, to fit the circle.
- `pop.vel.y = -1;` moves it 1 pixel up on every frame (`vel` is from 5.1.15; a negative `y` is up).
- `pop.life = 40;` deletes it 40 frames later, after it has risen 40 pixels, about two-thirds of a second.

## Step 3: The same popup in the wrong place

This is the same table with one change: the popup is made under `if (touching)` instead of inside the hit's `if`. Run it and drop the ball.

```js live
let ball, ground, score;
let bumpers = [];

function setup() {
  new Canvas(440, 340);
  world.gravity.y = 10;

  const b1 = new Sprite(130, 110, 160, 14, 'static');
  b1.color = 'sienna';
  b1.rotation = 18;
  b1.worth = 2;
  b1.wasTouching = false;
  b1.text = b1.worth;

  const b2 = new Sprite(310, 200, 160, 14, 'static');
  b2.color = 'sienna';
  b2.rotation = -18;
  b2.worth = 5;
  b2.wasTouching = false;
  b2.text = b2.worth;

  bumpers.push(b1, b2);

  ground = new Sprite(220, 330, 440, 20, 'static');
  ground.color = 'gray';

  ball = new Sprite(80, 40, 22);
  ball.color = 'deepskyblue';
  ball.bounciness = 0;

  score = 0;
}

function draw() {
  background('#222');
  fill('white');
  textSize(14);
  text('click here, then press R to drop the ball', 20, 26);
  textSize(22);
  text('score: ' + score, 300, 58);

  for (const b of bumpers) {
    const touching = ball.colliding(b);
    if (touching && !b.wasTouching) {
      score += b.worth;
    }
    // the bug: true on EVERY frame the ball touches the bumper
    if (touching) {
      const pop = new Sprite(b.x, b.y - 24, 28);
      pop.collider = 'none';
      pop.color = 'gold';
      pop.text = '+' + b.worth;
      pop.textColor = 'black';
      pop.textSize = 13;
      pop.vel.y = -1;
      pop.life = 40;
    }
    b.wasTouching = touching;
  }

  if (kb.presses('r')) {
    ball.x = 80;
    ball.y = 40;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
```

**What you'll see:** the score is still right, 2 and then 7, but the popups pile up into a gold column above each bumper for as long as the ball touches it: a new one on every frame, each one pixel above the one before, so you cannot read a single "+2" in it. `if (touching)` is true on every frame of a touch, so it makes a new popup about 60 times a second. That is the climbing score from 5.3.6 again, in a different costume. `.life` still removes every one of them, so the column goes away once the ball leaves, but a player sees a smear, not a "+2". The fix is the one you already know: the popup goes where the score goes.

## Step 4: The popup wears the `.life`, nothing else does

`pop.life = 40;` is set on the new popup, and only on it. The same line on the ball, `ball.life = 40;`, would delete the ball 40 frames after its first hit, and on a bumper, `b.life = 40;`, it would delete the bumper. That is the do-not-use warning from 5.3.8: on a sprite, `life` is a countdown to being deleted, never a value of your own.

## Key takeaways

- `b1.text = b1.worth;` in `setup()` labels a bumper with its own worth.
- A popup is made inside the same `if` that adds the score, so each hit makes one.
- `collider = 'none'` lets the ball pass through it, and moSHion switches its gravity off, so a small `vel.y` floats it up.
- `.life` on the popup removes it by itself. Never put `.life` on the ball or a bumper.
- A column of popups means it is being made on every frame of a touch, not once per hit.
