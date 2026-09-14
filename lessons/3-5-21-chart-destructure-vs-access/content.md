## Chart the Code: Destructuring vs. Plain Access

**What you'll practise:**
- Showing a destructuring line as a task of its own
- Seeing that plain access spreads the same reads across the code
- Putting a decision on a destructured variable

Destructuring looks like syntax, but on a chart it is a step that happens before the work that uses the names.

### The code

```js
function describeBox(options) {
  const { width, height, color } = options;

  let note = color + " box " + width + "x" + height;

  if (width > height) {
    note = note + " (wide)";
  }

  return note;
}

console.log(describeBox({ width: 10, height: 4, color: "red" }));
```

### What to draw

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Task** (rectangle) | The unpack (`width, height, color = options`), building `note`, appending `" (wide)"` |
| **Decision** (diamond) | `width > height` |
| **Input / Output** (parallelogram) | The final print |

At least six shapes, at least one diamond.

### The point of the chart

The **unpack is its own task**, drawn *before* the line that builds `note`. If you instead scatter three separate reads through the rest of the chart, you have charted the plain-access version, not this one — even though the output is identical.

That difference is the entire reason destructuring exists: the reads happen once, up front, in one visible place.

### Before you submit

Press **Check my diagram**, then trace it by hand with `width = 10` and `height = 4`. `width > height` is true, so the note must end with `" (wide)"`. If your chart's `yes` path does not reach the append box, the chart is wrong even if every check is green.

That hand-trace is the actual test here. The checker cannot do it for you.
