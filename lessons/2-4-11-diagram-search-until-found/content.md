## Plain English to Pseudocode: Search Until Found

**What you'll practise:**
- Writing a loop that has no stopping condition of its own
- Writing the early exit (break) as its own step in the yes branch
- Turning plain English into exact, numbered steps

### The plan, in plain English

1. Set `current` to `20`.
2. Repeat forever:
3. Is `current` a multiple of `7`?
4. If yes, print `Found: ` and `current`, then **break** (leave the loop).
5. If no, add `1` to `current` and go round again.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
let current = 20;

while (true) {
  if (current % 7 === 0) {
    console.log("Found: " + current);
    break;
  }
  current++;
}
```

### The thing worth noticing

There is no limit on this loop: `while (true)` never stops by itself. The **only** way out is the `if` inside the body, and its yes branch ends with `break`. `break` is not a shape on the chart or a special place: it is the step the yes branch takes to leave. Leave it out and the loop runs forever.

### Before you submit

Press **Grade**, then trace your steps by hand from `20`: `Found: 21`.
