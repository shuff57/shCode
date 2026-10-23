## Plain English to Pseudocode: Tracing Parameter Values

**What you'll practise:**
- Turning plain English into exact, numbered steps
- Passing a value into a function as one step, without writing the function's body
- Putting the call **before** the decision that uses the same value
- Reading a flow chart and matching each box to a step

### The plan, in plain English

This program passes a value into a function, which prints a result, and then decides what to do with the same value:

1. Set `base` to `100`.
2. Call `showPriceWithTax` with `base`. Inside the call the value becomes `price`.
3. After the call, check whether `base` is over `80`.
4. If it is, print `Over budget`.
5. Otherwise, print `Within budget`.

The same plan is drawn as a flow chart above the editor. You do not draw it, you **read** it.

### The code it describes

```js
function showPriceWithTax(price) {
  console.log("With tax: " + price * 1.08);
}

const base = 100;
showPriceWithTax(base);

if (base > 80) {
  console.log("Over budget");
} else {
  console.log("Within budget");
}
```

### What to write

Open `README.md` and type directly into it, no comment marks needed. The first and last lines are already there. Write your steps **between** them and number every one. Plain English is fine: the AI reads what your steps mean.

| Write this | Use it for |
|---|---|
| `SET base TO 100` | starting the value |
| `CALL showPriceWithTax WITH base` | the function call, one step |
| `IF base is over 80` ... `ELSE` ... `END IF` | the decision |
| `OUTPUT "Over budget"` | each print |

### Where the value goes

The argument is `base`. Inside the call, that value becomes `price`, the parameter. You do not write the body: **a call is one step**. When the call finishes, `base` is unchanged, so the decision can still test it. The check uses `base`, never `price`.

### Before you submit

Press **Grade** above the editor, then trace your steps by hand twice: once with `base` at 100, and once pretending it is 50. The call runs both times, but the answer flips from `Over budget` to `Within budget`. If your steps send both values the same way, the check is in the wrong place.
