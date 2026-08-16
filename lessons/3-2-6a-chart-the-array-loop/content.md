## Chart the Code — Looping Over an Array

**What you'll practise:**
- Charting a loop that walks an array
- Putting a decision *inside* a loop body
- Seeing where "after the loop" actually is

A loop with a decision inside it is the first chart shape that is genuinely hard to hold in your head, which makes it the first one properly worth drawing.

### The code

```js
const prices = [4.50, 12.00, 7.25, 30.00, 2.00];
let cheapCount = 0;

for (let i = 0; i < prices.length; i++) {
  if (prices[i] < 10) {
    cheapCount = cheapCount + 1;
  }
}

console.log("Items under $10:", cheapCount);
```

### What to draw

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Loop setup** (hexagon) | `i = 0 to prices.length - 1` — the whole `for` header |
| **Decision** (diamond) | `prices[i] < 10` |
| **Task** (rectangle) | `cheapCount = 0`, and adding one to it |
| **Input / Output** (parallelogram) | The final print |

At least seven shapes, at least one diamond.

### The three arrows that decide whether this is right

This chart has a decision nested inside a loop, so three arrows all need to land in exactly the right place. Get these and the rest follows.

1. **The `yes` arrow** out of the diamond goes to "add one to cheapCount".
2. **The `no` arrow** does **not** stop. It skips the adding and rejoins — because a price of $30 still has to move on to the next item.
3. **Both of them** end up back at the hexagon, not at the diamond. The counter has to advance and be re-checked, and the hexagon is where that happens.

That second one is the classic error. A `no` branch that dead-ends is a program that stops the first time it meets an expensive item.

### And the fourth arrow

The `print` is **outside** the loop. On the chart, it hangs off the hexagon — the path taken when the counter has run out — not off anything in the loop body.

If your print is inside the loop, your chart says the program announces a running total five times. Which is a different program, and a reasonable one, but not this one.

### Before you submit

Press **Check my diagram**, then trace it by hand with the real array: `4.50, 12.00, 7.25, 30.00, 2.00`. Follow your own arrows and count. If you do not land on **3**, the chart is wrong somewhere even if every check is green.

That hand-trace is the actual test here. The checker cannot do it for you.
