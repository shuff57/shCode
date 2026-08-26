**Goal:** Leave *both* loops of a nested pair, using a flag the outer loop checks.

## Step 1: The problem with a plain break

The last lesson showed that `break` only leaves the inner loop. If you actually need to stop everything: both loops: a single `break` can't do it on its own.

## Step 2: A flag the outer loop watches

```js live plain
let stop = false;

for (let i = 1; i <= 3 && !stop; i++) {
  for (let j = 1; j <= 3; j++) {
    if (i === 2 && j === 2) {
      stop = true;
      break;
    }
    console.log("i=" + i + " j=" + j);
  }
}

console.log("Done.");
```

**What you should see:**
```
i=1 j=1
i=1 j=2
i=1 j=3
i=2 j=1
Done.
```

## Step 3: Read the outer condition closely

`i <= 3 && !stop` is the `&&` from section 2.1 doing real work: the outer loop continues only while it **has rounds left** *and* **nothing has asked it to stop**. When `i === 2 && j === 2` is true, `stop` becomes `true`, `break` ends the inner loop immediately, and on the outer loop's next check, `!stop` is `false`, so the outer loop ends too, without a second `break` anywhere.

## Key takeaways

- One `break` only ever leaves one loop. To leave two nested loops, you need a flag the outer loop's own condition checks.
- The pattern is: set the flag, `break` the inner loop, and let the outer loop's `&&` condition catch the flag on its own next check.
- This is the same accumulator-style pattern you've used before: a variable set inside the loop that changes what happens on a later round.
