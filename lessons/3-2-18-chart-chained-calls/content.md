## Plain English to Pseudocode: Data Flow Through Chained Calls

**What you'll practise:**
- Turning plain English into exact, numbered steps
- Putting two nested calls in the order they run, inner first
- Showing the value the inner call hands to the outer one
- Reading a flow chart and matching each box to a step

### The plan, in plain English

When one call is written inside another, the inner one runs first and its value travels into the outer one. This program does exactly that:

1. Call `double` with `5`. It hands back `10`.
2. Call `addTen` with that `10`. It hands back `20`.
3. Set `result` to the value `addTen` handed back.
4. If `result` is over `25`, print `Big`.
5. Otherwise, print `Small`.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
function double(n) {
  return n * 2;
}

function addTen(n) {
  return n + 10;
}

const result = addTen(double(5));

if (result > 25) {
  console.log("Big");
} else {
  console.log("Small");
}
```

### What to write

Open `README.md` and type directly into it, no comment marks needed. The first and last lines are already there. Write your steps **between** them and number every one. Plain English is fine: the AI reads what your steps mean.

| Write this | Use it for |
|---|---|
| `CALL double WITH 5` | running the inner call |
| `SET result TO ...` | keeping the value `addTen` hands back |
| `IF result > 25` ... `ELSE` ... `END IF` | the Big / Small check |
| `PRINT "Big"` | showing something |

### The order the two calls have to be in

1. **First: `double(5)`.** It takes `5` and hands back `10`.
2. **Second: `addTen`, on that `10`.** Nothing can be handed to `addTen` until `double` has returned.
3. **Only then** is `result` set and tested. `result` does not exist until the outer call has returned.

Writing the outer call first is the classic error. On the chart the two double-rail boxes run left to right in the same order your steps do: inner, then outer.

### Before you submit

Press **Grade** above the editor, then trace your steps by hand with `5`. Inner call: `double(5)` is `10`. Outer call: `addTen(10)` is `20`. The check asks `20 > 25`, which is false, so the path is `Small`. If your steps reach `Big`, either the calls are in the wrong order or the check tests the wrong value.
