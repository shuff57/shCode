**Goal:** Watch what `NaN` does to everything downstream of it, so that when a program prints `NaN` you know to look *upstream* for the cause.

## Step 1 — Any operation on NaN gives NaN

```js live plain
console.log( NaN + 1 );
console.log( 3 * NaN );
console.log( "not a number" / 2 - 1 );
```

Three different operations, one answer each time: `NaN`. Adding to it does not fix it. Multiplying it does not fix it. Doing more arithmetic after it does not fix it.

The third line is the one to notice. `"not a number" / 2` produced `NaN`, and then `- 1` was applied to that — and the `NaN` survived. It does not get diluted by later, perfectly valid maths.

## Step 2 — Which is why NaN travels

```js live plain
let price = "12.99";        // oops — text, not a number
let quantity = 3;

let subtotal = price * quantity;
let tax = subtotal * 0.08;
let total = subtotal + tax;

console.log("total: " + total);
```

The mistake is on the first line: `price` holds *text*. But nothing complains there. The `NaN` is born at `price * quantity` and then travels through `tax` and `total`, so the error surfaces four lines later, in a `console.log` that is completely innocent.

Change `"12.99"` to `12.99` — no quotes — and run it again. Everything downstream repairs itself, because the problem was never downstream.

## Step 3 — The one exception

```js live plain
console.log( NaN ** 0 );
```

`1`. Raising anything to the power of zero gives `1`, and JavaScript honours that rule even for `NaN`. It is the only operation in the whole language that takes a `NaN` in and does not give one back.

You will never need this. It is worth seeing once so you know the rule is "sticky", not "magic".

## Key takeaways

- Any arithmetic on `NaN` produces `NaN` — it never heals.
- A `NaN` in your output means the mistake happened *earlier* than the line that printed it.
- Trace backwards to the first place a non-number entered the maths.
- `NaN ** 0` is `1`, and is the sole exception.
