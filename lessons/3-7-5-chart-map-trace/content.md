## Chart the Code: `.map()`'s Callback Trace

**What you'll practise:**
- Reading a method call as a loop you did not write
- Putting a decision inside a loop body, and rejoining the `no` path
- Seeing where the collected result is built up
- Getting the loop-back arrow landing on the right shape

`.map()` is short to write and worth drawing once. The method walks the array, calls your callback once per element, and collects what each call returns. Drawing that walk makes the "same length" guarantee obvious.

### The code

```js
const prices = [10, 20, 30];
const withTax = prices.map((price) => price * 1.08);

console.log(withTax);
```

### What to draw

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each |
| **Task** (rectangle) | Starting `withTax` as an empty result, and adding a taxed price to it |
| **Loop setup** (hexagon: press **+ more shapes**) | The `for` header `.map()` runs for you: the next price, or "no more" |
| **Decision** (diamond) | "Is there another price?" Ask it this way, so `yes` means keep going and `no` means done |
| **Input / Output** (parallelogram) | The final `console.log` |

At least seven shapes, at least one diamond.

### The three arrows that decide whether this is right

This chart has a decision inside a loop, so three arrows need to land exactly.

1. **The `yes` arrow** goes to "apply the callback to the price, add the result to `withTax`".
2. **After that task**, an arrow goes **back to the loop setup**, not on to the print. The next price has to be fetched and re-checked, and the hexagon is where that happens.
3. **The `no` arrow** leaves the loop. Once there are no more prices, it goes to the print.

The classic error is the second one. If the adding task goes straight to the print, the chart shows a program that handles one price and stops.

### Where the result goes

The `print` is **outside** the loop. On the chart, it hangs off the `no` arrow: the path taken once there are no more prices, not off anything in the loop body. And the collected array is built **inside** the loop, one entry per pass, which is why it always ends up the same length as the input.

### Before you submit

Press **Check my diagram**, then trace it by hand with the real array: `10, 20, 30`. Follow your own arrows and count the callback calls. If you do not land on **three** results in `withTax`, the chart is wrong somewhere even if every check is green.

That hand-trace is the actual test here. The checker cannot do it for you.
