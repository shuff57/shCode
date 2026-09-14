## Chart the Code: Full Syntax-Forms Comparison

**What you'll practise:**
- Charting one operation that passes through all three function forms
- Seeing which form needs a name, which needs `return`, and which can drop it
- Keeping a chain of same-shape steps readable
- Ending every path at one print

The three forms are usually shown as three separate examples. Charting them in sequence makes the comparison concrete: a declaration, then the same job as an expression, then the same job as an arrow — with the differences visible as the shapes you pass through.

### The code

```js
function addA(a, b) {
  return a + b;
}

const addB = function (a, b) {
  return a + b;
};

const addC = (a, b) => a + b;

console.log(addA(1, 2), addB(1, 2), addC(1, 2));
```

### What to draw

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each |
| **Task** (rectangle) | Writing the declaration, writing the expression, writing the arrow, then reading the results |
| **Decision** (diamond) | "Is the function named?" and "Does the body use braces?" |
| **Input / Output** (parallelogram) | The final `console.log` |

At least eight shapes, at least two decision diamonds, at least three task rectangles.

### The three arrows that decide whether this is right

1. **The `yes` exit** of "is the function named?" goes to the declaration's task: `function addA` keeps its name and its own `return`.
2. **The `no` exit** goes on to the expression's task, where the value is assigned to a `const` and the function itself is unnamed.
3. **Both tasks feed one more question** — "does the body use braces?" — because that is what decides whether `return` is required or can be dropped for the arrow form.

That last question is the whole comparison. Braces mean a block body and an explicit `return`; no braces on a single-expression arrow means the implicit return does the work.

### The point of the lesson

The three forms are one operation, written three ways — the chart should say so. If your chart has three separate Start-to-End strips that never meet, it is describing three programs rather than one choice made three times. All paths belong to the same print at the end.

### Before you submit

Press **Check my diagram**, then trace it by hand: the three calls all compute `1 + 2`, so the print is `3 3 3`. Follow your arrows and confirm each form reaches that one print. If a form dead-ends before the print, the chart is wrong even if every check is green.

That hand-trace is the actual test here. The checker cannot do it for you.
