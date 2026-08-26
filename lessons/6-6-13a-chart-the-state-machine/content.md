## Chart the Code: The Three-State Machine

**What you'll practise:**
- Drawing one frame of a state machine
- Separating "what state am I in" from "should I change state"
- Finding a transition nobody wrote

Of every chart in this course, this is the one that pays for itself most. A state machine written as a `switch` is a list; a state machine drawn is a **shape**, and you can see immediately which screens can reach which, including the ones that cannot be reached at all.

### The code

```js
let state = "title";

function draw() {
  if (state === "title") {
    drawTitle();
    if (kb.presses("space")) { state = "play"; }
  } else if (state === "play") {
    updateGame();
    if (playerDead) { state = "gameover"; }
  } else if (state === "gameover") {
    drawGameOver();
    if (kb.presses("r")) { state = "title"; }
  }
}
```

### What to draw

Chart **one frame**: one run of `draw()`, from the top to the end of the frame. The Start and End ovals are already placed and named for you.

| Shape | Use it for |
|---|---|
| **Decision** (diamond) | `state === "title"`, `state === "play"`, `state === "gameover"`, and each transition check |
| **Function call** (double rail) | `drawTitle()`, `updateGame()`, `drawGameOver()` |
| **Task** (rectangle) | Each `state = "..."` assignment |

At least nine shapes and at least three diamonds.

### The distinction this chart exists to teach

There are **two different kinds of diamond** on this chart and mixing them up is the whole difficulty:

| Kind | Asks | Example |
|---|---|---|
| **Which state am I in?** | routing: where does this frame go | `state === "play"` |
| **Should I change state?** | a transition: does the next frame go somewhere else | `playerDead` |

Every state does its drawing *first*, and only then asks whether to leave. That order matters: if you flip it, the frame where the player dies never draws.

Notice too that changing `state` does **not** jump anywhere. It sets a variable and the frame ends. The change only takes effect next frame, when the routing diamonds run again. On your chart, every path, including one that just changed the state: arrives at **end of frame**.

That is the thing beginners get wrong in code and can see instantly in a picture.

### Then find the missing arrow

With your chart green, look at it as a map of screens. Draw yourself a quick note of which state can reach which:

```
   title ──space──▶ play ──dead──▶ gameover ──r──▶ title
```

Now ask: **is there any way to get from `play` back to `title` without dying?** There is not. This game has no quit, no pause, no way back to the menu except by losing.

That may be fine. But you found it by looking, in about four seconds, and nobody reading the `switch` would have noticed.

### Before you submit

Press **Check my diagram**, then trace three frames by hand: one on the title screen with space held, one during play with the player alive, one on the game-over screen with nothing pressed. All three should reach **end of frame**. If any of them stops early, you have a missing arrow.
