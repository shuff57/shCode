## Plain English to Pseudocode: A Function That Calls Its Parameter Twice

**What you'll practise:**
- Turning a one-line function into the steps the machine actually runs
- Writing a call that is made twice, one after the other
- Keeping a straight-line program straight: no decision, no repeat
- Reading a flow chart and matching each box to a step

`operation` is a function handed in from outside; you will meet passing a function to a function properly in 3.4.11, and here you only need to write down what happens inside. `applyTwice` takes an operation and a value, calls the operation on the value, then calls it **again** on that result. Written out, that is one short line. In steps, it is read the parameters, first call, second call, print.

### The plan, in plain English

1. Read in `operation` and `value`.
2. Call `operation` on `value`. Call the answer `first`.
3. Call `operation` again, this time on `first`. Call that answer `second`.
4. Print `second`.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
function applyTwice(operation, value) {
  return operation(operation(value));
}

console.log(applyTwice((n) => n * 2, 5));
```

The arrow `(n) => n * 2` is the `operation` value that gets passed in; it does not get steps of its own.

### What to write

Open `README.md` and type directly into it, no comment marks needed. The first and last lines are already there. Write your steps **between** them and number every one. Plain English is fine: the AI reads what your steps mean.

| Write this | Use it for |
|---|---|
| `READ operation AND value` | taking in the two parameters |
| `SET first TO operation(value)` | the first call, keeping its answer |
| `SET second TO operation(first)` | the second call, on that answer |
| `PRINT second` | showing the result |

### The three things that decide whether this is right

1. **The first call comes before the second.** The second call uses the result of the first, so it comes after it.
2. **Nothing loops back and nothing is decided.** The two calls are written one after the other. A repeat or a decision only belongs when the code has an `if` or a loop; this code has neither.
3. **The print is last.** It comes after both calls.

`operation(operation(value))` looks like one step, but it is two calls with the inner one finishing first. Writing them as two steps makes that order visible.

### Before you submit

Press **Grade** above the editor, then trace your steps by hand: `operation` is `(n) => n * 2`, `value` is `5`. The first call gives `10`, the second gives `20`, and `20` is what prints. If your steps print before the second call, they are wrong even if Grade is green.
