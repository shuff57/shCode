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
| **Loop setup** (hexagon) | The `for` header `.map()` runs for you: the next price, or "no more" |
| **Decision** (diamond) | "Is there another price?" |
| **Input / Output** (parallelogram) | The final `console.log` |

At least seven shapes, at least one diamond.

### The three arrows that decide whether this is right

This chart has a decision nested inside a loop, so three arrows need to land exactly.

1. **The `yes` arrow** goes to "apply the callback to the price, add the result to `withTax`".
2. **The `no` arrow** does **not** stop. It skips the callback body and joins the route to the print, because once the list is exhausted the job is the collected array.
3. **Both of them** end up back at the loop setup, not the decision. The next item has to be fetched and re-checked, and the hexagon is where that happens.

That second one is the classic error. A `no` branch that dead-ends is a program that stops the first time it runs out of prices, and never prints anything.

### Where the result goes

The `print` is **outside** the loop. On the chart, it hangs off the hexagon: the path taken once there are no more prices, not off anything in the loop body. And the collected array is built **inside** the loop, one entry per pass, which is why it always ends up the same length as the input.

### Before you submit

Press **Check my diagram**, then trace it by hand with the real array: `10, 20, 30`. Follow your own arrows and count the callback calls. If you do not land on **three** results in `withTax`, the chart is wrong somewhere even if every check is green.

That hand-trace is the actual test here. The checker cannot do it for you.
