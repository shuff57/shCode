## Plain English to Pseudocode: continue Skips, Doesn't Leave

**What you'll practise:**
- Seeing that continue skips the rest of ONE round and stays in the loop
- Telling continue apart from break
- Turning plain English into exact, numbered steps

### The plan, in plain English

1. For each `i` from `1` to `6`:
2. If `i` is even, **continue**: skip the rest of this round.
3. Otherwise, print `i`.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
for (let i = 1; i <= 6; i++) {
  if (i % 2 === 0) {
    continue;
  }
  console.log(i);
}
```

### The thing worth noticing

`continue` skips the rest of **one round** and then the loop carries on with the next `i`. On the chart, both exits of the diamond go back to the hexagon; nothing leaves the loop early. A `break` is different: its exit goes out of the loop altogether.

### Before you submit

Press **Grade**, then trace your steps by hand: 1 prints, 2 skips, 3 prints, 4 skips, 5 prints, 6 skips.
