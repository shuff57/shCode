## Chart the Code: Reassignment vs. Mutation Trace

**What you'll practise:**
- Tracing two writes to the same name and telling them apart
- Charting *what the caller sees* after each write
- Seeing why one change escapes the function and the other does not

A trace chart is a picture of a program running, step by step. This one follows a function that does the two kinds of write you met in this module to the same array — one after the other — so the difference is impossible to blur.

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

### The same program in plain steps

Each line of the code is one step. Read the **What it does** column to see which name or which array each step touches. The last two steps of the function are the ones your two diamonds are about.

| # | Pseudocode | What it does |
|---|---|---|
| 1 | `SET scores TO the array [10, 20, 30]` | Makes one array and names it `scores`. |
| 2 | `CALL process WITH scores` | Hands the function that same array. Inside, `nums` is a second name for it, so **two names, one array**. |
| 3 | `SET item 0 OF nums TO 0` | **Mutation.** Writes into the one shared array. |
| 4 | `SET nums TO a NEW array [9, 9]` | **Reassignment.** Points `nums` at a different array. `scores` is not touched. |
| 5 | `RETURN to the caller` | `nums` and the array `[9, 9]` are gone. |
| 6 | `OUTPUT scores` | Prints whatever array `scores` still names. |

Steps 3 and 4 are the two writes. After each one, ask the same question: **did `scores` see this change?**

### What to draw

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Function call** (double rail) | `process(scores)`: press **+ more shapes** |
| **Task** (rectangle) | `scores = [10, 20, 30]`, `nums[0] = 0`, `nums = [9, 9]` |
| **Decision** (diamond) | "Did this write change the shared object, or move a local name?" Draw it **twice**, once after each write |
| **Input / Output** (parallelogram) | The final print |

At least seven shapes, at least two diamonds. Give each exit of a diamond its own task before the paths meet at the print: two arrows from one diamond cannot both go to the same shape.

### The two writes to chart separately

1. **`nums[0] = 0`** reaches into the one array and changes an element. On your chart this is a mutation: it changes the object, and the caller's `scores` points at that same object. The caller sees it.

2. **`nums = [9, 9]`** points the function's own name at a brand-new array. On your chart this is a reassignment: only the local name moved. The caller's `scores` still points where it did, so the caller sees nothing.

Chart them as two separate tasks with a decision after each one asking whether the change escaped. The two decisions should take **different** exits — that is the whole point of the chart.

### The arrows that decide whether this is right

- After `nums[0] = 0` the first diamond's answer is **yes**: the caller sees it. Give that exit a task such as "caller sees 0 at index 0".
- After `nums = [9, 9]` the second diamond's answer is **no**: only the local name moved. Give that exit a task such as "caller's scores unchanged".
- Each diamond's other exit goes to a task of its own too. Everything rejoins before the final print, which happens once, after the function has returned.

### Before you submit

Press **Check my diagram**. Green means the chart is a legal flowchart — one start, labelled decision exits, everything reaching the end. Then do the thing the checker cannot: run the code and confirm your chart's final output box matches what really prints.

If you wrote `[9,9]` in your output box, the trace went wrong at the reassignment. That new array lives and dies inside the function.
