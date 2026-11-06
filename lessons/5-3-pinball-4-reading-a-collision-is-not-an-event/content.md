## A collision is not an event

**Read before `5.4.2 Worked Example: The score that climbs by itself`.** About 6 minutes.

By the end of this reading you should be able to answer:

- Why does `if (ball.colliding(goal)) score += 1;` add sixty points a second?
- What is the difference between "touching" and "just touched"?
- How do you remember what happened on the previous frame?

`colliding()` answers a question about **this frame**: are these two sprites touching *right now*? While the ball rests on the gold, the answer is yes on every single frame.

```js
function draw() {
  if (ball.colliding(goal)) {
    score += 1;          // runs ~60 times a second, not once per hit
  }
}
```

You have met this before, with keys. 5.2.12 drew the distinction, and it has two names. **Level-triggered** means true on every frame the thing is still going on, like a key that is held down. **Edge-triggered** means true only on the one frame it starts, like the moment the key goes down.

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

**One catch: `colliding()` gives a number, not `true` or `false`.** It is 0 while the sprites are apart, and a count above 0 while they touch. An `if` treats 0 as false and any other number as true, so `touching && !wasTouching` works. But after the first frame the memory holds 0, not `false`, so `wasTouching === false` is never true and a score written that way never goes up. Test the memory with `!wasTouching`.

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
  ball.bounciness = 0;

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

**What you'll see:** the ball drops, lands on the gold bar, and the score reads **1** — not hundreds. Press R and it becomes 2, then 3, then 4. The ball resting on the bar for a thousand frames still counts once.

This ball has `bounciness` 0, so it lands and stays. A ball that bounces touches the bar, leaves it, and touches it again, and every one of those touches starts a new contact, so each one counts. That is correct: a bounce really is a second hit. 5.4.2 shows it.

**Try this:** delete the line `wasTouching = touching;` and run it again. The score races again, about sixty points a second while the ball sits on the bar, exactly like the version with no memory. Nothing ever changes `wasTouching`, so it stays `false`, `!wasTouching` is always `true`, and the test is just `touching`. A memory that is never updated remembers nothing.

Then try the other way to get it wrong: move the update *inside* the `if`, by changing the `if` line to `if (touching && !wasTouching) { score += 1; wasTouching = touching; }` (with the separate `wasTouching = touching;` line still deleted). Now the first landing counts, and pressing R never adds another point: `wasTouching` takes the first touch's number, which counts as true, and nothing sets it back to 0. That is why the update goes on its own line, outside the `if`, where it runs every frame.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **level-triggered** | true on every frame the condition holds (`kb.pressing`, `colliding`) |
| **edge-triggered** | true only on the frame the condition *starts* (`kb.presses`, a remembered `wasTouching`) |
| **event** | a thing that happens once, even though the thing causing it lasts many frames |
