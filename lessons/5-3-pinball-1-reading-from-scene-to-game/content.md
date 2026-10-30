## From scene to game

**Read before `5.3.3 Worked Example: The table and the goal`.** About 5 minutes.

By the end of this reading you should be able to answer:

- What is the difference between a scene and a game?
- What four things does this module add to the scene you already built?

In 5.2.18 you built a scene: gravity, static obstacles, a bouncy ball, and a key that puts the ball back at the top. Run it and it looks like pinball. Nothing is at stake, though — the ball falls, bounces, and nothing counts.

A game adds four things on top of a scene:

| | In this game |
| --- | --- |
| **a goal** | a target the ball can reach |
| **a score** | a number that goes up when you hit something |
| **a way to lose** | a condition that ends the round |
| **a way to start again** | a key that puts ball and score back |

This module adds them one at a time, and every one of them is built with things you already have: sprites, `colliding()`, `text()`, variables and `if`.

**Try it:**

```js live
let ball, bumper, floor;

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
  text('press R to drop the ball again', 20, 28);

  if (kb.presses('r')) {
    ball.x = 200;
    ball.y = 40;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
```

**What you'll see:** the ball falls, hits the bumper, and rolls down to the floor. Press R and it starts again. That is the whole scene from 5.2.18 — and there is still no goal, no score, no way to lose, and no reason to press R except to watch it fall again.

**Try this:** let the ball settle, then look at what is missing. If you wanted to tell a friend how well you just did, what number would you show them? That number does not exist yet. 5.3.3 adds it.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **scene** | sprites plus physics: something to look at that obeys the rules |
| **game** | a scene with a goal, a score, a way to lose and a way to start again |
| **round** | one attempt, from starting the ball to losing it |
