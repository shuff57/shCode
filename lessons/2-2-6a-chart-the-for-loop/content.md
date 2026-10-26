## Plain English to Pseudocode: A for-loop That Accumulates

**What you'll practise:**
- Writing a for loop as numbered pseudocode
- Starting total before the loop, not inside it
- Knowing what belongs inside the loop and what comes after it

### The plan, in plain English

1. Set `total` to `0`.
2. Repeat for `i` from `1` to `5`: add `i` to `total`.
3. When the loop has finished, print `total`.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
let total = 0;

for (let i = 1; i <= 5; i++) {
  total = total + i;
}

console.log("Sum 1 to 5:", total);
```

### The thing worth noticing

**`total = 0` goes before the loop, not inside it.** Inside, the total would reset to zero on every pass and the answer would always be 5. The chart's hexagon holds the whole `for` header (counter, limit, step); the arrow from the bottom of the body returns to the hexagon, and the print comes after the loop runs out. In your pseudocode, `END FOR` marks where the body stops and the loop closes.

### Before you submit

Press **Grade**, then trace your steps by hand: `total` goes 0, 1, 3, 6, 10, 15. Nothing here is graded and you can retry as often as you like.
