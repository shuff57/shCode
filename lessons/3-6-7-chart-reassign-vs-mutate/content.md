## Chart the Code: Reassignment vs. Mutation Trace

**What you'll practise:**
- Tracing two writes to the same name and telling them apart
- Charting *what the caller sees* after each write
- Seeing why one change escapes the function and the other does not

A trace chart is a picture of a program running, step by step. This one follows a function that does the two things from Definition 3.6.1 to the same array — one after the other — so the difference is impossible to blur.

### The code

```js
function process(nums) {
  nums[0] = 0;
  nums = [9, 9];
}

let scores = [10, 20, 30];
process(scores);
console.log(scores);
```

Before you draw anything, predict the output. Then run it in your head line by line.

### What to draw

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Function call** (double rail) | `process(scores)`: press **+ more shapes** |
| **Task** (rectangle) | `scores = [10, 20, 30]`, `nums[0] = 0`, `nums = [9, 9]` |
| **Decision** (diamond) | "Did this write change the shared object, or move a local name?" |
| **Input / Output** (parallelogram) | The final print |

At least seven shapes, at least one diamond.

### The two writes to chart separately

1. **`nums[0] = 0`** reaches into the one array and changes an element. On your chart this is a mutation: it changes the object, and the caller's `scores` points at that same object. The caller sees it.

2. **`nums = [9, 9]`** points the function's own name at a brand-new array. On your chart this is a reassignment: only the local name moved. The caller's `scores` still points where it did, so the caller sees nothing.

Chart them as two separate tasks with a decision after each one asking whether the change escaped. The two decisions should take **different** exits — that is the whole point of the chart.

### The arrows that decide whether this is right

- The `yes` (escapes) exit belongs to the mutation, leading to a step that updates what the caller sees.
- The `no` (stays local) exit belongs to the reassignment.
- Both paths rejoin before the final print. The print happens once, after the function has returned.

### Before you submit

Press **Check my diagram**. Green means the chart is a legal flowchart — one start, labelled decision exits, everything reaching the end. Then do the thing the checker cannot: run the code and confirm your chart's final output box matches what really prints.

If you wrote `[9,9]` in your output box, the trace went wrong at the reassignment. That new array lives and dies inside the function.
