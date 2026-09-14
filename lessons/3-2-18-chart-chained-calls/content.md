## Chart the Code: Data Flow Through Chained Calls

**What you'll practise:**
- Drawing two calls on one path, in the order they run
- Showing the value the inner call hands to the outer one
- Charting a decision that tests the final result
- Seeing why the nesting order changes the answer

When one call is written inside another, the inner one runs first and its value travels into the outer one. The chart makes that trip visible, which is the whole reason nested calls are easy to get wrong.

### The code

```js
function double(n) {
  return n * 2;
}

function addTen(n) {
  return n + 10;
}

const result = addTen(double(5));

if (result > 25) {
  console.log("Big");
} else {
  console.log("Small");
}
```

### What to draw

Use the canvas below. **Start** and **End** are already placed.

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each |
| **Function call** (double rail) | Two of them, one after the other: `double(5)` then `addTen(...)`. Press **+ more shapes** |
| **Task** (rectangle) | Setting `result` to the final value |
| **Decision** (diamond) | `result > 25` |
| **Input / Output** (parallelogram) | The two prints |

At least seven shapes, at least one diamond.

### Read it inside out

The inner call runs first. On the chart, `double(5)` is the **first** double-rail: it takes `5` and hands back `10`. That `10` is the argument to `addTen`, the **second** double-rail, which hands back `20`. Only then is `result` set, and the diamond tests it.

Drawing the outer call first is the classic error. On your chart the order of the two double-rails has to match the order the calls actually run: inner then outer. Nothing can be handed to `addTen` until `double` has returned.

### The arrows that decide whether this is right

1. **One arrow leaves the first double-rail and enters the second.** That arrow *is* the chained value: the result of `double` becomes the argument of `addTen`.
2. **The diamond comes after both calls**, not between them. `result` does not exist until the outer call has returned.
3. **Both diamond exits rejoin** at the End. `Big` and `Small` are alternative prints, and after either one the program is done.

### Before you submit

Press **Check my diagram**, then trace it with `5`. Inner call: `double(5)` is `10`. Outer call: `addTen(10)` is `20`. The diamond asks `20 > 25`, which is false, so the path is `Small`. If your chart reaches `Big`, either the calls are in the wrong order or the diamond tests the wrong value.

That hand-trace is the actual test here. The checker cannot do it for you.
