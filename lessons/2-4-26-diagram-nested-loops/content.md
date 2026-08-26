## Chart the Code: Nested Loops

**What you'll practise:**
- Using two loop-setup hexagons, one for the outer loop and one for the inner
- Routing the inner hexagon's return arrow before the outer one's
- Seeing where the inner loop's whole cycle sits inside the outer loop's body

### The code

```js
for (let row = 1; row <= 3; row++) {
  for (let col = 1; col <= 4; col++) {
    console.log("row " + row + ", col " + col);
  }
}
```

### What to draw

Two hexagons, one after the other: press **+ more shapes** if you don't already have it out.

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each. |
| **Loop setup** (hexagon) | Two of them: `row = 1 to 3`, and `col = 1 to 4` |
| **Input / Output** (parallelogram) | The print inside the inner loop |

### Where each return arrow goes

This is the part that trips people up, so trace it before you draw: which hexagon does the print's return arrow go back to?

The print happens inside the **inner** loop, so its return arrow goes back to the **inner** hexagon (`col = 1 to 4`), not the outer one. Only once the inner hexagon has cycled through all of `col`'s values does flow return to the **outer** hexagon (`row = 1 to 3`), which then either starts a fresh inner loop for the next `row`, or moves on to End.

Picture it as two loops stacked, not two loops side by side: the whole inner hexagon-and-print cycle sits *inside* the outer loop's body, the same way the inner `for` sits inside the outer `for`'s braces in the code.

### The trap

If your print's return arrow goes straight to the outer hexagon instead of the inner one, your chart says the inner loop only ever runs once per row: which is a completely different (and much smaller) program than the one you're charting.

### Before you submit

Press **Check my diagram**. The checks confirm a legal flowchart: one Start, one End, nothing floating, at least six shapes, every path reaching the End. They can't tell whether the return arrows land on the right hexagon, so trace `row 1` through both hexagons by hand and compare against the code's expected output before you call it done.

No points, no AI grader. Redraw as often as you like.
