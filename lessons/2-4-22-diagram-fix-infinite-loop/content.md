## Fix the Infinite Loop

**What you'll practise:**
- Recognising an infinite loop in a written plan
- Seeing that a loop needs a way out that can be reached
- Writing the loop's test and closing the loop

### The broken plan

Someone planned a countdown: `count` starts at `5`, prints while it is above `0`, and goes down by `1` each round. Their plan arrives in `README.md` already written, and already wrong: its loop says `REPEAT FOREVER`. The finished plan is drawn as a flow chart above the editor. You **read** it, you do not draw it.

### The code it describes

```js
let count = 5;

while (count > 0) {
  console.log(count);
  count = count - 1;
}
```

### Why this is the bug you read about

Press **Grade** before you change anything. The cards for starting at 5, printing and counting down are green, and the cards for the loop's test and for closing the loop are red. Counting down is not enough: nothing ever *asks* whether to stop, so the loop never leaves. On the chart, that is a diamond with only a `yes` exit. **An infinite loop is not a plan with a missing end line. It is a plan whose way out can never be reached.**

### Your job

1. Change `REPEAT FOREVER` into `WHILE count > 0`.
2. Keep the print and the countdown step inside it, indented.
3. Close the loop with `END WHILE`, so the plan can reach its end.

### Before you submit

Press **Grade**, then trace the loop by hand: `count` is 5, 4, 3, 2, 1, printing each time, then 0 fails the test and the loop is over.
