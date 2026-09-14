## Chart the Code: Tracing Parameter Values

**What you'll practise:**
- Drawing a function call as one step with the double-rail shape
- Showing where the value enters the parameter and where the result comes back
- Charting a decision that uses the returned value
- Keeping the called function's body off the chart

This program passes a value into a function, gets a value back, and then decides what to do with it. The chart shows the flow through the call without drawing what happens inside the function.

### The code

```js
function priceWithTax(price) {
  return price * 1.08;
}

const base = 100;
const total = priceWithTax(base);

if (total > 100) {
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
| **Function call** (double rail) | The call `priceWithTax(base)`: press **+ more shapes** to reveal it |
| **Task** (rectangle) | Setting `base`, and setting `total` to the returned value |
| **Decision** (diamond) | `total > 100` |
| **Input / Output** (parallelogram) | The two prints |

At least seven shapes, at least one diamond.

### Where the value goes

The arrow into the double-rail carries `base` as the argument. Inside the call, that value becomes `price`, the parameter. You do not draw the body: **a double-rail is one step**, and the function's own lines belong to a different chart or to no chart at all.

The arrow out of the double-rail carries the returned number back to the main program, where it is stored in `total`. That is the whole trip a value makes into a parameter and back out.

### The arrows that decide whether this is right

1. **Both diamond exits rejoin** at the End. `Over budget` and `Within budget` are the two prints, and after either one the program finishes.
2. **The double-rail sits between "set base" and the diamond**, not off to the side. The decision tests `total`, and `total` does not exist until the call has returned.
3. **Nothing hangs off the double-rail** except the arrow that leads to storing the result. A function call is one step on the main path, not a branch.

### Before you submit

Press **Check my diagram**, then trace it by hand. With `base = 100`, the call returns `108`, so follow the `yes` path to `Over budget`. Now change your mental `base` to `50` and trace again: the call returns `54`, and the answer flips. If your chart sends both values the same way, the diamond is in the wrong place.

That hand-trace is the actual test here. The checker cannot do it for you.
