## Chart the Code: Tracing Parameter Values

**What you'll practise:**
- Drawing a function call as one step with the double-rail shape
- Showing where the value enters the parameter
- Charting a decision that uses the same value after the call
- Keeping the called function's body off the chart

This program passes a value into a function, which prints a result, and then decides what to do with the same value. The chart shows the flow through the call without drawing what happens inside the function.

### The code

```js
function showPriceWithTax(price) {
  console.log("With tax: " + price * 1.08);
}

const base = 100;
showPriceWithTax(base);

if (base > 80) {
  console.log("Over budget");
} else {
  console.log("Within budget");
}
```

### What to draw

Use the canvas below. **Start** and **End** are already placed.

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each |
| **Function call** (double rail) | The call `showPriceWithTax(base)`: press **+ more shapes** to reveal it |
| **Task** (rectangle) | Setting `base` |
| **Decision** (diamond) | `base > 80` |
| **Input / Output** (parallelogram) | The two prints (the call's own print happens inside the function, so it is not drawn) |

At least seven shapes, at least one diamond.

### Where the value goes

The arrow into the double-rail carries `base` as the argument. Inside the call, that value becomes `price`, the parameter. You do not draw the body: **a double-rail is one step**, and the function's own lines belong to a different chart or to no chart at all.

When the call finishes, the program carries on with the next line. `base` is unchanged, so the decision can still test it.

### The arrows that decide whether this is right

1. **Both diamond exits rejoin** at the End. `Over budget` and `Within budget` are the two prints, and after either one the program finishes.
2. **The double-rail sits between "set base" and the diamond**, not off to the side. The program calls the function first and only then reaches the decision.
3. **Nothing hangs off the double-rail** except the arrow that leads on to the decision. A function call is one step on the main path, not a branch.

### Before you submit

Press **Check my diagram**, then trace it by hand. With `base = 100`, the call runs, then `base > 80` is true, so follow the `yes` path to `Over budget`. Now change your mental `base` to `50` and trace again: the call still runs, but the answer flips to `Within budget`. If your chart sends both values the same way, the diamond is in the wrong place.

That hand-trace is the actual test here. The checker cannot do it for you.
