## Chart the Code: Largest of Three

**What you'll practise:**
- Reading working code and recovering the algorithm underneath it
- Drawing two decisions in a row, each with both exits labelled
- Noticing that a `no` branch still has to go somewhere

In the last lesson you turned an algorithm into code. This lesson runs the arrow the other way: here is code you already understand, and your job is to draw the plan it came from.

That direction is the harder one, and it is the one worth practising. Anybody can copy a spec into boxes. Recovering the *shape* of a program from its text is what you will be doing every time you open somebody else's code, including your own, three weeks later.

### The code

```js
let largest = a;

if (b > largest) {
  largest = b;
}

if (c > largest) {
  largest = c;
}

console.log("Largest:", largest);
```

### What to draw

Draw the flowchart for that code. Read it once, then **cover it** and draw from memory: checking back only when you get stuck.

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Task** (rectangle) | `largest = a`, `largest = b`, `largest = c` |
| **Decision** (diamond) | `b > largest` and `c > largest`: two of them |
| **Input / Output** (parallelogram) | Optional, for the final print. |

### The trap

There are **two** diamonds, and each one needs **two** labelled exits. The `yes` path is easy: it updates `largest`. The `no` path is the one people forget: it does not update anything, but it still has to continue to the next step. An arrow that leads nowhere is a program that stops working when `b` happens to be small.

Ask yourself as you draw: *if `b` is not bigger, where does the reader go next?*

### Then compare

You have seen this algorithm charted before: it is **Figure 2.2.1**, back in lesson 2.2.2. Do not look at it yet.

Draw yours first, get it green, and *then* go back and put the two side by side. They will probably not be identical, and that is the interesting part: two different-looking charts can both be correct, because there is more than one legal way to route the same logic. What matters is whether both answer the same questions in the same order and send every path to an End.

If yours differs, work out which of these it is:

- **A different route, same logic**: fine. Charts are not fingerprints.
- **A missing `no` branch**, not fine. Find where the reader falls off the page.
- **The comparisons in a different order**: check it still works when `c` is the largest.

### Before you submit

Press **Check my diagram**. Nine structural checks run right in your browser and tell you exactly which shape is wrong: one Start, one End, nothing floating, and both exits labelled on both diamonds. Fix anything red and press it again.

There is no AI grader on this one and no points. The checks are the whole thing, and you can redraw as many times as you like.
