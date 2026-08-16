## Fix the Broken Chart — the Pause State

**What you'll practise:**
- Repairing somebody else's half-finished design
- Telling apart "one mistake, several alarms" and "several mistakes"
- Recognising a frozen game in a chart before you have written it

Someone started adding a pause feature to the three-state machine and stopped halfway. Their chart is on the canvas. Press **Check my diagram** before changing anything — you should see **five** red.

### Five red, but three mistakes this time

In an earlier lesson, five red checks turned out to be one missing idea. Not here. Read carefully — the checks group into three separate unfinished jobs:

| Red check(s) | The unfinished job |
|---|---|
| `no-orphans` + `one-start` | **`drawPauseScreen()` was never wired in.** They made the shape and never connected it, so it floats — and a floating shape looks exactly like a second place to start reading. |
| `decision-two-exits` | **`state == "play"` has no `no` branch.** They handled the playing frame and forgot every other frame. |
| `no-self-loop` | **`state = "paused"` has an arrow pointing at itself.** |
| `reaches-end` | Not a fourth mistake — it cannot run until there is one clear starting point, so it is waiting on the first row. |

So: count the *ideas* behind the red, not the red lines. Sometimes it is one idea and sometimes it is three, and the only way to know is to read them.

### The self-loop is a frozen game

That third one is worth staring at. An arrow from `state = "paused"` back to `state = "paused"` says: set the state to paused, then set the state to paused, then set the state to paused. The frame never ends. Nothing draws. Input is never read.

That is not a drawing error — it is **the game hanging**, visible before a line of code exists. Setting a state is an ordinary step. It does its one job and flow moves on to the end of the frame, the same as every other rectangle on the chart.

### Your job

Repair it. Do not start over.

1. **Give the `state == "play"` diamond its `no` exit,** and label it. Then decide where that arrow goes — what *should* happen on a frame when the game is not playing? That is where the pause screen belongs.
2. **Wire `drawPauseScreen()` into the flow** so it runs on the frames it should and nothing floats.
3. **Break the self-loop.** Send `state = "paused"` where every other path goes: the end of the frame.
4. Check that all three of your paths — playing, pausing, paused — arrive at **end of frame**.

Press **Check my diagram** after each fix and watch which ones clear. Notice that fixing the floating shape turns off *two* checks at once, while fixing the self-loop turns off exactly one.

### The question the checker will not ask you

When all eight are green, you will have a chart where a player can enter the pause state. Now check the thing no check covers:

**Can they get out again?**

If your repaired chart has no route from paused back to playing, the game still freezes — legally, this time. Green means legal, not finished. Add the way back.
