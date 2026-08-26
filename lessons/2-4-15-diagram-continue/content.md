## Chart the Code: continue Skips, Doesn't Leave

**What you'll practise:**
- Routing `continue`'s arrow back to the loop-setup hexagon, not to End
- Seeing the one-shape difference between a `break` chart and a `continue` chart
- Reading the hexagon as "come back here" instead of "leave from here"

### The code

```js
for (let i = 1; i <= 6; i++) {
  if (i % 2 === 0) {
    continue;
  }
  console.log(i);
}
```

### What to draw

You'll need the loop-setup hexagon again: press **+ more shapes** if it isn't already on your canvas.

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Loop setup** (hexagon) | `i = 1 to 6`: the whole `for` header |
| **Decision** (diamond) | `i % 2 === 0` |
| **Input / Output** (parallelogram) | The print. |

### The one-shape difference from break

Route both exits of the diamond back toward the hexagon area, but not to the same place:

- The `yes` exit (even: skip it) goes **straight back to the hexagon**. Nothing else happens that round.
- The `no` exit (odd: keep it) goes to the print, and *then* back to the hexagon.

Now put this next to the search-until-found chart from lesson 2.4.11. There, the `yes` exit of the diamond left the loop for End: that was `break`. Here, every exit of the diamond eventually returns to the hexagon: nothing ever leaves the loop early. That's the entire visual difference between `break` and `continue`: where the arrow goes when the diamond fires.

### Before you submit

Press **Check my diagram**. The checks confirm a legal flowchart: one Start, one End, nothing floating, at least five shapes, the diamond has two labelled exits, every path reaches the End.

No points, no AI grader. Redraw as often as you like.
