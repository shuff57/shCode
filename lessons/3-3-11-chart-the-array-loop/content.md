## Plain English to Pseudocode: Looping Over an Array

**What you'll practise:**
- Turning plain English into exact, numbered steps
- Putting a decision *inside* a loop body
- Seeing where "after the loop" actually is
- Reading a flow chart and matching each box to a step

### The plan, in plain English

A loop with a decision inside it is the first shape that is genuinely hard to hold in your head, so write it down step by step:

1. Start `cheapCount` at `0`.
2. Go through every price in the `prices` array, one at a time.
3. For each price, check whether it is under `10`. If it is, add one to `cheapCount`.
4. After the loop has finished, print `cheapCount` once.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
const prices = [4.50, 12.00, 7.25, 30.00, 2.00];
let cheapCount = 0;

for (let i = 0; i < prices.length; i++) {
  if (prices[i] < 10) {
    cheapCount = cheapCount + 1;
  }
}

console.log("Items under $10:", cheapCount);
```

### What to write

Open `README.md` and type directly into it, no comment marks needed. The first and last lines are already there. Write your steps **between** them and number every one, including indented ones. Plain English is fine: the AI reads what your steps mean.

| Write this | Use it for |
|---|---|
| `SET cheapCount TO 0` | starting the counter |
| `FOR EACH price IN prices` ... `END FOR` | the loop |
| `IF price < 10` ... `END IF` | the check inside the loop |
| `ADD 1 TO cheapCount` | counting one cheap price |
| `PRINT cheapCount` | showing the answer |

### Where each step belongs

1. **The counter is set before the loop.** Set inside the loop, it would go back to `0` on every price.
2. **The check is inside the loop,** and the adding is inside the check. A price of `30` skips the adding but still moves on to the next price.
3. **The print is after the loop.** On the chart it hangs off the hexagon's "done" exit. Inside the loop, the program would print a running total five times, which is a different program.

On the chart, the `yes` arrow goes to "add one" and then back to the hexagon, and the `no` arrow goes back to the hexagon too. A `no` that dead-ends is a program that stops the first time it meets an expensive item.

### Before you submit

Press **Grade** above the editor, then trace your steps by hand with the real array: `4.50, 12.00, 7.25, 30.00, 2.00`. Follow your own steps and count. If you do not land on **3**, something is in the wrong place.
