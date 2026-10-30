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
  text('press R to drop the ball again', 20, 28);

  if (kb.presses('r')) {
    ball.x = 70;
    ball.y = 60;
    ball.vel.x = 0;
    ball.vel.y = 0;
  }
}
```

**What you'll see:** the ball drops onto the bumper and rolls down it, flies off the end into the right wall, bounces across the floor, and falls out through the gap at the bottom left. That gap is the **drain**. Press R and it starts again. This is the same kind of scene you built in 5.2.18, with two walls and a drain added — and there is still no goal, no score, nothing happens when the ball drains, and no reason to press R except to watch it fall again.

**Try this:** let the ball settle, then look at what is missing. If you wanted to tell a friend how well you just did, what number would you show them? That number does not exist yet. 5.3.3 adds it.

---

## Short glossary (quick reference)

| Term | Meaning |
| --- | --- |
| **scene** | sprites plus physics: something to look at that obeys the rules |
| **game** | a scene with a goal, a score, a way to lose and a way to start again |
| **round** | one attempt, from starting the ball to losing it |
| **drain** | the gap at the bottom of the table; a ball that falls through it has left the table |
