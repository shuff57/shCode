## Chart the Code — Search Until Found

**What you'll practise:**
- Drawing a loop that has no stopping condition of its own
- Placing `break` as the `yes` exit of a decision diamond, not as a separate shape
- Seeing why the diamond has to sit *inside* the loop body, not in the loop header

### The code

```js
let current = 20;

while (true) {
  if (current % 7 === 0) {
    console.log("Found: " + current);
    break;
  }
  current++;
}
```

### What to draw

There is no hexagon here — `while (true)` has no counter, no limit, nothing to collapse. The whole loop is one task, one decision, and a return arrow.

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Task** (rectangle) | `current = 20` (before the loop), and `current++` (inside it). |
| **Decision** (diamond) | `current % 7 === 0` |
| **Input / Output** (parallelogram) | The "Found" print. |

### The trap

`break` is not its own shape — it's what the `yes` exit of the diamond *does*. Route the `yes` arrow from `current % 7 === 0` straight to the print, and from there to End. Route the `no` arrow to `current++`, and from there back up to the diamond.

Notice what's missing compared to every `for` loop chart you've drawn: there is no separate "check the limit" diamond guarding the whole loop. The only diamond *is* the stopping condition, and it lives inside the body, not in front of it.

### Before you submit

Press **Check my diagram**. The checks confirm a legal flowchart — one Start, one End, nothing floating, the diamond has two labelled exits, every path reaches the End.

No points, no AI grader. Redraw as often as you like.
