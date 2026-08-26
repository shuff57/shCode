## Chart the Code: do...while

**What you'll practise:**
- Placing the decision diamond **after** the task, not before
- Seeing why that one position change guarantees a first run
- Routing the return arrow so the loop actually loops

### The code

```js
let attempts = 0;

do {
  attempts++;
  console.log("Attempt " + attempts);
} while (attempts < 3);
```

### What to draw

Every `for` and `while` chart you've drawn so far put the diamond **before** the task it guards. This one is different: draw the task first, *then* the diamond.

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Task** (rectangle) | `attempts = 0` (before the loop), and `attempts++` / print inside it. |
| **Decision** (diamond) | `attempts < 3`, placed **after** the task box. |

### The trap

The `yes` arrow out of the diamond has to loop back to the **task**, not to itself and not to a new copy of the task. The `no` arrow continues on to End. If your diamond sits *before* the task the way a `while` chart does, you've drawn `while`, not `do...while`: the whole point of this shape is that the reader hits the task before ever seeing the question.

Ask yourself before you submit: *does my chart force the task to run once even if `attempts < 3` would have been false to start with?* If the diamond comes first, the answer is no.

### Before you submit

Press **Check my diagram**. The checks confirm a legal flowchart: one Start, one End, nothing floating, the diamond has two labelled exits, every path reaches the End. They can't tell whether the diamond is on the correct side of the task, so compare your shape order against the code above before you call it done.

No points, no AI grader. Redraw as often as you like.
