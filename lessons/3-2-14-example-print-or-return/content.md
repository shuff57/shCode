**Goal:** Decide, for a real function, whether it should print or return, by asking who needs the result.

## Step 1: A function the caller will reuse

`totalPrice` computes an order total. The caller wants to act on that number, so the function must return it.

```js live plain
function totalPrice(price, quantity) {
  return price * quantity;
}

console.log(totalPrice(3, 4));

const order = totalPrice(3, 4);
if (order > 10) {
  console.log("Free shipping!");
}
```

The same value is printed once and used in a condition once. Because the function returned it, both are possible.

## Step 2: The same job, done by printing

Now write it as a printing function and watch the caller's options collapse. The `12` still appears, but `order` is `undefined`, so the comparison cannot work.

```js live plain
function totalPrice(price, quantity) {
  console.log(price * quantity);
}

totalPrice(3, 4);

const order = totalPrice(3, 4);
console.log("Is the order over 10? " + (order > 10));
```

`Is the order over 10? false`. It is not false because the order is small; it is false because `order` is `undefined` and `undefined > 10` is false. The bug looks like a logic error and is really a missing `return`.

## Step 3: A function whose whole job is to show something

Printing is still right when showing the user *is* the job. A function that reports a result to the screen does not need to hand anything back.

```js live plain
function reportOrder(price, quantity) {
  const total = price * quantity;
  console.log("You ordered " + quantity + " item(s).");
  console.log("Your total is $" + total.toFixed(2) + ".");
}

reportOrder(3, 4);
reportOrder(5, 2);
```

Here the point is the message, not a number for the program to use later. There is nothing to return, because nothing else needs the value.

## Step 4: The mixed case, done well

When a function both computes and reports, the clean split is: a small returning function does the math, and the reporting function calls it and prints. The math stays reusable.

```js live plain
function totalPrice(price, quantity) {
  return price * quantity;
}

function reportOrder(price, quantity) {
  const total = totalPrice(price, quantity);
  console.log("Your total is $" + total.toFixed(2) + ".");
}

reportOrder(3, 4);
console.log("Reusing the number: " + totalPrice(3, 4) * 2);
```

`totalPrice` can be used by the report and by the last line, which doubles it. Keeping the computation separate is what makes that reuse possible.

## Key takeaways

- A function should return its result and let the caller decide whether to print it.
- Return when the value will be stored, compared, added, or passed on.
- Print when showing the user is the whole job and nobody needs the number afterwards.
- When a function needs to do both, let a returning function compute and a printing one report.
