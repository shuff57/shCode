## Plain English to Pseudocode: Destructuring vs. Plain Access

**What you'll practise:**
- Turning plain English into exact, numbered steps
- Showing a destructuring line as one step of its own, before the work that uses the names
- Putting a decision on a destructured variable
- Reading a flow chart and matching each box to a step

### The plan, in plain English

Destructuring looks like syntax, but in a plan it is a step that happens before the work that uses the names. This lab is `describeBox()`:

1. Take `width`, `height` and `color` out of `options` in one step.
2. Build the note from the color, the width and the height.
3. If the width is greater than the height, the box is wide.
4. In that case, add `" (wide)"` to the end of the note.
5. Either way, give the note back.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

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

### What to write

Open `README.md` and type directly into it, no comment marks needed. The first and last lines are already there. Write your steps **between** them and number every one. Plain English is fine: the AI reads what your steps mean.

| Write this | Use it for |
|---|---|
| `SET width, height and color TO the parts of options` | the unpack, all three at once |
| `BUILD the note` | joining the color, width and height |
| `IF width > height` ... `END IF` | the wide check |
| `RETURN the note` | the answer |

### The point of the plan

The **unpack is its own step**, written *before* the line that builds the note. If you instead scatter three separate reads (`options.width`, then `options.height`, then `options.color`) through the rest of the steps, you have written the plain-access version, not this one, even though the output is identical.

That difference is the entire reason destructuring exists: the reads happen once, up front, in one visible place.

### Before you submit

Press **Grade** above the editor, then trace your steps by hand twice: once with `width = 10` and `height = 4`, and once with `width = 3` and `height = 8`. The first must reach the step that adds `" (wide)"`. The second must skip it and still give the note back.
