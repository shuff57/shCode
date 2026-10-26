## Plain English to Pseudocode: do...while

**What you'll practise:**
- Putting the question after the body, not before it
- Seeing why a do...while always runs at least once
- Turning plain English into exact, numbered steps

### The plan, in plain English

1. Set `attempts` to `0`.
2. Do this: add `1` to `attempts`, then print `Attempt ` and `attempts`.
3. **After** that, check whether `attempts` is less than `3`. If yes, go back to step 2. If no, the loop is over.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
let attempts = 0;

do {
  attempts++;
  console.log("Attempt " + attempts);
} while (attempts < 3);
```

### The thing worth noticing

Every `for` and `while` plan so far asked its question **first**. This one does the work first and asks afterwards, so the body is guaranteed to run once even when the question would have been `no` from the start. Put the question before the body and you have written a `while`, not a `do...while`. The yes arrow goes back to the **body**, not to the question and not to the start.

### Before you submit

Press **Grade**, then trace your steps by hand: `Attempt 1`, `Attempt 2`, `Attempt 3`.
