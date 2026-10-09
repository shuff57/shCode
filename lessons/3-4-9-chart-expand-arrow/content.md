## Chart the Code: Expanding an Arrow to Its Full Form

**What you'll practise:**
- Turning a one-line function into the steps the machine actually runs
- Charting a call that is made twice, one after the other
- Keeping a straight-line program straight: no decision, no repeat
- Ending on one print

A function that takes a function can hide a whole little program. `applyTwice` takes an operation and a value, calls the operation on the value, then calls it **again** on that result. Written out, that is one short line. Charted, it is read-the-parameters, first call, second call, print.

### The code

```js
function applyTwice(operation, value) {
  return operation(operation(value));
}

console.log(applyTwice((n) => n * 2, 5));
```

### What to draw

Chart the **body of `applyTwice`**. The arrow `(n) => n * 2` is the `operation` value that gets passed in; it does not get its own row of shapes.

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each |
| **Task** (rectangle) | Reading in `operation` and `value`, applying `operation` once, applying it a second time on that result |
| **Input / Output** (parallelogram) | The final `console.log` |

At least six shapes. There is **no decision** in this program, so there is no diamond: the code does the same four things in the same order every time.

### The arrows that decide whether this is right

1. **The first call comes before the second.** The second call uses the result of the first, so its arrow comes after it.
2. **Nothing loops back.** The two calls are written one after the other. A chart with an arrow going back to an earlier step is charting a different program.
3. **The print is last.** It sits right before End, after both calls.

### The point of the lesson

`operation(operation(value))` looks like one step, but it is two calls with the inner one finishing first. Drawing them as two tasks makes that order visible. A repeat or a decision only belongs on a chart when the code has an `if` or a loop; this code has neither.

### Before you submit

Press **Check my diagram**, then trace it by hand: `operation` is `(n) => n * 2`, `value` is `5`. The first call gives `10`, the second gives `20`, and `20` is what prints. Follow your own arrows and confirm they run in that order. If your chart prints before the second call, it is wrong even if every check is green.

That hand-trace is the actual test here. The checker cannot do it for you.
