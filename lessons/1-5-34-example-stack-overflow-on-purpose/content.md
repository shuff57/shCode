**Goal:** Cause a stack overflow deliberately, while you already know what the answer should have been: which is the easiest possible circumstance in which to learn an error message.

## Step 1: Predict first

Here is `recursiveSum` with the base case removed. **Before you run it**, say what will happen.

```js
function recursiveSum(x) {
  return x + recursiveSum(x - 1);
}

console.log(recursiveSum(10));
```

Trace it: `10` calls `9`, which calls `8`, … which calls `0`, which calls `-1`, which calls `-2`. Nothing ever says stop, so `x` keeps decreasing past zero forever and the calls pile up.

## Step 2: Run it

```js live plain
function recursiveSum(x) {
  return x + recursiveSum(x - 1);
}

try {
  console.log(recursiveSum(10));
} catch (err) {
  console.log("It stopped itself:");
  console.log(err.name + ": " + err.message);
}
```

```
RangeError: Maximum call stack size exceeded
```

That is the stack overflow from 1.5.33. The chain of deferred calls ran out of room to wait in.

*(The `try`/`catch` here is only so the message prints tidily instead of stopping the page. You meet error handling properly later: ignore it for now and read the message.)*

## Step 3: Fix it

```js live plain
function recursiveSum(x) {
  if (x === 0) {
    return 0;
  }
  return x + recursiveSum(x - 1);
}

console.log(recursiveSum(10));
```

`55`. Three lines added, and they are the three that say **when to stop**.

## Step 4: Why cause an error on purpose

Because you already know the answer.

The first time you see `RangeError: Maximum call stack size exceeded` in your own project, you will be confused, under time pressure, and unsure whether the problem is your logic or your typing. Having caused it once deliberately turns it into a recognisable message with a known meaning: *something is calling itself and never stopping.*

That is worth ten minutes now. The same trick applies to every error message in 1.5.38: cause it once while you are calm.

## Key takeaways

- No base case means the call chain never ends.
- The error is `RangeError: Maximum call stack size exceeded`.
- The fix is always the same: give it a case that answers without recursing.
- Causing an error deliberately is the cheapest way to learn to recognise it.
