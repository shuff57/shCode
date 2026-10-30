## A collision is not an event

**Read before `5.3.6 Worked Example: The score that climbs by itself`.** About 6 minutes.

By the end of this reading you should be able to answer:

- Why does `if (ball.colliding(goal)) score += 1;` add sixty points a second?
- What is the difference between "touching" and "just touched"?
- How do you remember what happened on the previous frame?

`colliding()` answers a question about **this frame**: are these two sprites touching *right now*? While the ball rests against the gold block, the answer is yes on every single frame.

```js
function draw() {
  if (ball.colliding(goal)) {
    score += 1;          // runs ~60 times a second, not once per hit
  }
}
```

You have met this before, with keys. 5.2.9 drew the distinction:

| | Fires | |
| --- | --- | --- |
| `kb.pressing('space')` | every frame the key is held | level |
| `kb.presses('space')` | once, on the frame it goes down | edge |

`colliding()` is the level-triggered one. The edge-triggered version — "the ball *just* touched the goal" — is not built in, because the engine has no way to know what you consider one hit. You have to remember the previous frame yourself.

**The pattern is three lines and a variable:**

```js
let wasTouching = false;     // remembered between frames

function draw() {
  const touching = ball.colliding(goal);

  if (touching && !wasTouching) {
    score += 1;              // only on the frame contact starts
  }

  wasTouching = touching;    // remember for next frame
}
```

Read `touching && !wasTouching` as: **touching now, and not touching a moment ago.** That is the moment contact starts, and it happens exactly once per hit.

**Try it:**

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

let wasTouching = false;

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

**What you'll see:** the ball drops, lands on the gold bar, and the score reads **1** — not 600. Press R and it becomes 2. The ball resting on the bar for a thousand frames still counts once.

**Try this:** delete the line `wasTouching = touching;` and run it again. The score now climbs once and stops, because `wasTouching` stays `false` forever — a different wrong answer from the same three lines. Both mistakes are worth seeing once: the first counts too often, the second never resets.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **level-triggered** | true on every frame the condition holds (`kb.pressing`, `colliding`) |
| **edge-triggered** | true only on the frame the condition *starts* (`kb.presses`, a remembered `wasTouching`) |
| **event** | a thing that happens once, even though the thing causing it lasts many frames |
