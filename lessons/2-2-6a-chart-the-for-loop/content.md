## Chart the Code — A for-loop That Accumulates

**What you'll practise:**
- Using the loop-setup hexagon for a `for` header
- Drawing the return arrow so the loop actually loops
- Seeing why `total` starts *outside* the loop

You traced this loop by hand in the last lesson. Now draw it.

### The code

```js
let total = 0;

for (let i = 1; i <= 5; i++) {
  total = total + i;
}

console.log("Sum 1 to 5:", total);
```

### A new shape arrives: the loop-setup hexagon

In the last reading you saw this loop drawn the long way — five shapes for one line of code (Figure 2.2.3). The hexagon is the shortcut it promised: it holds the counter, the limit and the step all at once.

```flow readonly caption="Figure 2.2.4 — the hexagon carries the counter, its limit, and its step. The arrow from the bottom of the body returns to the hexagon, not into the middle of the body."
flowchart TD
  A([Start]) --> B[total = 0]
  B --> C{{i = 1 to 5}}
  C --> D[total = total + i]
  D --> C
  C --> E[/print total/]
  E --> F([End])
```

Read the arrows out loud: *start, set total to 0, set up the counter, add i to total, back to the counter, add again... and when the counter runs out, print the total and end.*

The hexagon is **not new logic.** Put Figure 2.2.3 and Figure 2.2.4 side by side: the hexagon has swallowed the `i = 1` rectangle, the `i <= 5` diamond, and the `i = i + 1` rectangle — three shapes down to one. Nothing about how the loop runs has changed. The collapse is worth it because that same three-part pattern shows up in every loop you will ever write, and spelling it out every time buries the part that is actually different.

Say the number out loud: **three shapes became one.** That is the whole argument for the hexagon.

### What to draw

Draw the same loop yourself, from the code, on the canvas below. You will need the hexagon: press **+ more shapes** in the toolbar to reveal it.

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Loop setup** (hexagon) | `i = 1 to 5` — the whole `for` header |
| **Task** (rectangle) | `total = 0` and `total = total + i` |
| **Input / Output** (parallelogram) | The final print. |

### The two traps

**`total = 0` goes before the hexagon, not inside the loop.** If you put it inside, the total resets to zero on every single pass and the answer is always 5. Drawing it in the wrong place is the fastest way to understand why the code puts it where it does.

**The return arrow leaves the bottom of the loop body and lands on the hexagon.** Not on the rectangle, not on the middle of anything. This is the single most-missed arrow in the whole course, and it is worth slowing down for: the hexagon is where the counter advances and gets re-checked, so that is where flow has to come back to.

### Before you submit

Press **Check my diagram**. The checks confirm your chart is a legal flowchart — one Start, one End, nothing floating, every path reaching the End, at least six shapes. They cannot tell whether your arrow landed on the right shape, so compare yours against Figure 2.2.3 above before you call it done.

No points, no AI grader. Redraw as often as you want.
