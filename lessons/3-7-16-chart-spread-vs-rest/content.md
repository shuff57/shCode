## Chart the Code: Spread vs. Rest, Side by Side

**What you'll practise:**
- Reading `...` in two places and telling which direction it points
- Charting a loop that gathers a variable number of arguments
- The same loop shape reused for a call that unpacks an array

The three dots mean opposite things depending on where they sit. Inside a **definition**, `...numbers` gathers arguments into an array. At a **call**, `...values` unpacks an array into arguments. The code below shows both directions in one function.

### The code

```js
function total(...numbers) {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum = sum + numbers[i];
  }
  return sum;
}

const scores = [1, 2, 3];
console.log(total(5, 5));
console.log(total(...scores));
```

### What to draw

Chart the **body of `total`** — the part that runs once the arguments have arrived. The two calls at the bottom are just different ways of supplying the same array, so they share one chart.

| Shape | Use it for |
|---|---|
| **Start / End** (oval) | One of each |
| **Task** (rectangle) | Starting `sum` at 0, and adding each number to it |
| **Loop setup** (hexagon) | The `for` header: the next index, or "past the end" |
| **Decision** (diamond) | "Is there another number?" |
| **Input / Output** (parallelogram) | The `return sum` at the end |

At least seven shapes, at least one diamond.

### The arrows that matter

1. **The `yes` arrow** from the diamond goes to "add `numbers[i]` to sum".
2. **The `no` arrow** skips the adding and joins the path to the return, because once the array is exhausted the answer is ready.
3. **The loop-back arrow** lands on the hexagon, not the diamond: the counter has to advance and be re-checked.

### The point of the lesson

The chart is the **same** whether the caller wrote `total(5, 5)` or `total(...scores)`. Spread at the call site changes only how the array reaches `numbers`; the gathering loop inside is identical either way. That is why the two directions share one picture: one is the doorway, the other is the room.

### Before you submit

Press **Check my diagram**, then trace it by hand: `total(1, 2, 3)` should reach the return with `sum` equal to **6**. Follow your arrows and do the addition yourself. If you do not land on 6, fix the chart even if every check is green.
