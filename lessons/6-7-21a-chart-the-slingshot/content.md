## Chart the Code: The Slingshot

**What you'll practise:**
- Charting an interaction that spans many frames
- Finding the stage where nothing is happening yet
- Seeing why the launch is one frame and the stretch is hundreds

A slingshot is the hardest thing you have charted, and not because the maths is hard. It is hard because **the interaction happens across hundreds of frames and your chart only covers one.**

### The code

```js
let held = false;

function draw() {
  if (mouse.presses() && ball.mouse.hovering()) {
    held = true;
  }

  if (held && mouse.pressing()) {
    ball.x = mouse.x;
    ball.y = mouse.y;
    drawBand(anchor, ball);
  }

  if (held && mouse.released()) {
    let fx = (anchor.x - ball.x) * POWER;
    let fy = (anchor.y - ball.y) * POWER;
    ball.applyForce(fx, fy);
    held = false;
  }
}
```

### What to draw

Chart **one frame**. The Start and End ovals are placed and named.

| Shape | Use it for |
|---|---|
| **Decision** (diamond) | the three questions the frame asks |
| **Task** (rectangle) | `held = true`, moving the ball, working out the force, `held = false` |
| **Function call** (double rail) | `drawBand(...)` and `applyForce(...)` |

At least eight shapes, at least two diamonds.

### Three stages, and the one people forget

Say the interaction out loud and you get three stages: **grab**, **stretch**, **release**. Most first charts have all three and are still wrong, because there is a fourth:

| Stage | What the frame does | How many frames |
|---|---|---|
| **Idle** | nothing: `held` is false and the mouse is up | most of them |
| Grab | set `held = true` | exactly one |
| Stretch | move the ball, draw the band | hundreds |
| Release | work out the force, apply it, clear `held` | exactly one |

**Idle is a real path through your chart**, and it is the one that runs most often. If every route through your diagram does something, you have drawn a program that cannot sit still. Follow a frame where the player has not touched anything: it should enter, answer `no` three times, and leave.

### `held` is the whole design

Look at what `held` is doing. Without it, the stretch stage would grab any ball the mouse happened to pass over while pressed, and the release would fire whether or not anything had been picked up.

On your chart, `held` shows up as a diamond that guards two of the three stages. **That is what a state variable looks like drawn**: you met the idea in 6.6, and this is the same thing wearing different clothes: one variable deciding which parts of a frame are allowed to run.

### The frame count is the insight

Notice which boxes are on paths that run once and which are on paths that run hundreds of times. `ball.applyForce(...)` is on a path taken in exactly one frame of the entire throw: that is what makes a launch feel like an event rather than a push.

If you accidentally chart `applyForce` on the stretch path instead, you get a ball that accelerates every frame while you hold it. Draw the wrong version deliberately for a second and look at it. That shape: force inside the hold: is one of the most common physics bugs in the whole unit, and it is obvious on a diagram and invisible in the code.

### Before you submit

Press **Check my diagram**, then trace four frames by hand: one idle, one where the player presses on the ball, one mid-stretch, one where they let go. All four reach **end of frame**, and exactly one of them applies a force.
