## The state of the game

**Read before `5.3.9 Lab: Lose and start again`.** About 5 minutes.

By the end of this reading you should be able to answer:

- What two things does a game need to know about itself while it runs?
- Where does that live in the code?
- What has to be put back when a round restarts?

A game in progress is in one of two states: **playing**, or **over**. Everything else follows from that one fact — whether the ball still moves, whether the score still counts, whether the screen says "press R".

You already have a variable that survives between frames (the `wasTouching` flag from 5.3.4). A game-over flag is the same idea with a different job:

```js
let playing = true;      // true until the round ends
```

**The losing condition.** A round ends when the ball is lost — in pinball, when it falls past the bottom of the table. There is no physics event for "lost"; it is just a question about position:

```js
if (ball.y > 400) {
  playing = false;
}
```

**Using the flag.** `draw()` asks one question at the top and takes one of two paths:

```js
function draw() {
  background('#222');

  if (playing) {
    // count hits, draw the score
  } else {
    text('Game over — press R', 20, 100);
  }

  if (kb.presses('r')) {
    playing = true;
    score = 0;
    ball.x = 200;
    ball.y = 40;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
```

**What a restart has to put back.** Everything that was true at the start of the round:

- the ball's position *and* its velocity (it might still be falling fast)
- the score
- the flag

Miss the velocity and the ball reappears at the top already moving — a bug that looks like the game "remembering" the last round.

**Try it:**

```js live
let ball, goal, score, playing, wasTouching;

function setup() {
  new Canvas(400, 320);
  world.gravity.y = 10;

  goal = new Sprite(200, 250, 200, 20, 'static');
  goal.color = 'gold';

  ball = new Sprite(200, 40, 24);
  ball.color = 'deepskyblue';
  ball.bounciness = 0.2;

  score = 0;
  playing = true;
  wasTouching = false;
}

function draw() {
  background('#222');
  fill('white');

  if (playing) {
    textSize(20);
    text('score: ' + score, 20, 40);

    const touching = ball.colliding(goal);
    if (touching && !wasTouching) score += 1;
    wasTouching = touching;

    if (ball.y > 320) playing = false;
  } else {
    textSize(20);
    text('Game over', 20, 140);
    textSize(14);
    text('score: ' + score, 20, 170);
    text('press R to play again', 20, 200);
  }

  if (kb.presses('r')) {
    playing = true;
    score = 0;
    wasTouching = false;
    ball.x = 200;
    ball.y = 40;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
```

**What you'll see:** the ball drops, touches the gold bar once (score 1), and keeps falling. Once it passes the bottom the words "Game over" replace the play area. Press R and a fresh round starts at score 0.

**Try this:** remove `ball.vel.y = 0;` from the restart and press R a few times. Eventually the ball reappears already travelling fast, overshoots the bar, and the round ends almost at once. Nothing in the code says "carry the old speed over" — the old speed was simply never cleared.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **state** | which of a few modes the game is in — here, playing or over |
| **flag** | a variable holding `true`/`false` that a later frame can read |
| **restart** | putting every value back to what it was at the start of a round |
