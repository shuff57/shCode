## Plain English to Pseudocode: Nested Loops

**What you'll practise:**
- Putting one loop inside another
- Seeing that the inner loop restarts for every outer round
- Turning plain English into exact, numbered steps

### The plan, in plain English

1. For each `row` from `1` to `3`:
2. For each `col` from `1` to `4`, print `row` and `col`.
3. When the `col` loop is done, move on to the next `row` and start the `col` loop again.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
for (let row = 1; row <= 3; row++) {
  for (let col = 1; col <= 4; col++) {
    console.log("row " + row + ", col " + col);
  }
}
```

### The thing worth noticing

The inner loop is a step **inside** the outer loop's body, so it restarts from `1` for every row, and the print goes back to the inner hexagon. Only when `col` has run through all four values does the flow return to the outer hexagon for the next `row`. Two loops side by side would be a different, much smaller program.

### Before you submit

Press **Grade**, then trace `row 1` by hand: col 1, 2, 3, 4, and only then `row 2`. Twelve lines print in all.
