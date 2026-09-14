## Chart the Code: Expanding an Arrow to Its Full Form

**What you'll practise:**
- Turning a one-line arrow into the steps the machine actually runs
- Seeing where the implicit return lands in a chart
- Putting a decision inside a helper that calls a function twice
- Getting the loop-free "call it again?" arrows landing correctly

A one-line arrow hides a whole little program. `applyTwice` takes a function and a value, calls the function on the value, then calls it **again** on that result. Expressed as an arrow, that is one short line. Charted, it is read-parameters, first call, decide-if-done, second call, print.

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
| **Task** (rectangle) | Reading in `operation` and `value`, applying `operation` once, storing that result, applying it a second time |
| **Decision** (diamond) | "Have I applied `operation` twice yet?" |
| **Input / Output** (parallelogram) | The final `console.log` |

At least seven shapes, at least one decision, and at least two task rectangles.

### The arrows that decide whether this is right

This chart has one decision, so three arrows need to land exactly.

1. **The `no` arrow** (not yet twice) goes to the second application: run `operation` on the first result.
2. **The `yes` arrow** (twice now) goes to the print, because the value to print is ready.
3. **The second application loops back** to the decision — after the second call, the question "twice yet?" is asked again, and now the answer is `yes`.

That third arrow is the classic error. If the second application drops straight to the print without re-checking, the chart cannot show how the "twice" decision is ever reached.

### The point of the lesson

The implicit return is why the print can hang off the `yes` branch at all: the arrow's single expression *is* the value sent back. If `applyTwice`'s body had braces without a `return`, the decision's `yes` branch would lead to `undefined`, and the chart would have to say so.

### Before you submit

Press **Check my diagram**, then trace it by hand: `operation` is `(n) => n * 2`, `value` is `5`. First application gives `10`, second gives `20`. Follow your own arrows and confirm you pass the decision twice. If your chart reaches the print without a second application, it is wrong even if every check is green.

That hand-trace is the actual test here. The checker cannot do it for you.
