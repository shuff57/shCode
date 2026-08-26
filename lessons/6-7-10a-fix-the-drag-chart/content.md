## Fix the Broken Chart: Dragging a Sprite

**What you'll practise:**
- Finding the half of an interaction nobody thought about
- Reading a self-loop as a frozen frame
- Repairing a chart instead of restarting it

Someone charted drag-and-drop. They charted **picking the sprite up** carefully, and then stopped: which is the single most common shape of an unfinished interaction, because grabbing is the interesting part and letting go is the part that feels like it happens by itself.

Press **Check my diagram** before changing anything. You should see **five** red.

### Five red, two mistakes

| Red check(s) | The unfinished job |
|---|---|
| `decision-two-exits` + `no-orphans` + `one-start` | **Releasing was never charted.** `mouse.pressing()` has no `no` arrow: no frame where the mouse is *up* is described at all. And `set velocity to zero`, the step that belongs on exactly that path, is sitting there unconnected. |
| `no-self-loop` | **`move sprite to the mouse` points at itself.** |
| `reaches-end` | Not a third mistake. It cannot trace anything until there is one clear start, so it is waiting on the row above. |

Three checks, one gap. The floating `set velocity to zero` box is the giveaway: they knew the step existed, they just never found the arrow that reaches it. That arrow is the `no` off `mouse.pressing()`.

### Why the self-loop matters here

`move sprite to the mouse` → itself says: move it to the mouse, then move it to the mouse, then move it to the mouse. Within a single frame. The mouse has not moved between those, so nothing changes, and the frame never ends.

That is a hung game, drawn. Moving a sprite is one ordinary step. It happens once per frame and flow carries on to the end of the frame: the loop you are thinking of is `draw()` being called again, and that loop is *outside* this chart entirely.

This is worth holding on to, because it is the same confusion twice: **a chart of `draw()` covers one frame.** It does not loop back on itself. What repeats is the whole chart, sixty times a second, and nothing on the page has to say so.

### Your job

1. **Give `mouse.pressing()` its `no` exit** and label it. That is the release path.
2. **Wire `set velocity to zero` onto it.** Ask yourself why that step exists: a sprite dragged across the screen has picked up speed, and if you let go without zeroing it the sprite flies off. That is the bug this box exists to prevent.
3. **Break the self-loop.** Send `move sprite to the mouse` where every other path goes: the end of the frame.
4. Check all three paths: pressing on the sprite, pressing off it, not pressing: reach **end of frame**.

Press **Check my diagram** after each fix. Notice that adding the one `no` arrow clears `decision-two-exits` immediately, but `no-orphans` stays red until you actually connect the velocity box to it.

### The one no check will catch

When it is green, trace this: the player presses the mouse **somewhere empty**, then drags across the sprite while still holding.

Does your chart pick the sprite up mid-drag? Should it? Most games say no: you grab on the press, not on the hover, and charting it is how you find out whether yours agrees.
