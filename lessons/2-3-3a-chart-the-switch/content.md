## Chart the Code: a switch is a chain of diamonds

**What you'll practise:**
- Seeing what a `switch` really is underneath
- Drawing three questions in a row, each with a `no` path onward
- Understanding `break` as an arrow, not a keyword

There is no "switch shape". A flowchart has one way to ask a question: the diamond, so a three-case `switch` becomes **three diamonds in a row.** That is not a limitation of flowcharts; it is the switch showing you what it has been doing all along.

### The code

```js
let grade = "B";

switch (grade) {
  case "A":
    console.log("Excellent");
    break;
  case "B":
    console.log("Good");
    break;
  case "C":
    console.log("Passing");
    break;
  default:
    console.log("Not a grade I know");
}

console.log("Done");
```

### What to draw

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Decision** (diamond) | `grade == "A"`, then `grade == "B"`, then `grade == "C"`: three of them |
| **Task** (rectangle) | The four prints, and the final "Done" |

The `yes` arrow off each diamond goes to that case's print. The `no` arrow goes **down to the next diamond**, and the `no` off the last one goes to the `default` print. That chain of `no` arrows is the whole structure of a switch.

### Where `break` lives on the chart

Here is the part worth slowing down for. `break` is not a shape. **`break` is the arrow that goes from a case's print straight to the End**, skipping every diamond below it.

Now imagine deleting one. Without `break` after `case "A"`, the arrow out of `"Excellent"` would not jump to the End: it would drop into `"Good"` and print that too. That is **fall-through**, and on a flowchart it is impossible to miss: the arrow visibly goes into the next box.

Draw the version *with* the breaks. Then, before you submit, put a finger on the `"Excellent"` box and trace where its arrow goes. That arrow is the `break`.

### Before you submit

Press **Check my diagram**. It needs at least three diamonds, each with exactly two labelled exits, and every path reaching the End.

The `default` case has no diamond of its own: it is just where the last `no` arrow lands. If you find yourself wanting a fourth diamond for it, you have found the difference between "another case" and "everything else".
