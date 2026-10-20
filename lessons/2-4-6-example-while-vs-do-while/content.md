**Goal:** Give both loops a condition that is false from the very start, and watch what each one actually does.

## Step 1: Predict, then run

`n` is 100, and both loops test `n < 10`: false before either one even starts. Predict how many times each body will print, then run.

```js live plain
let n = 100;

while (n < 10) {
  console.log("while body ran");
}

do {
  console.log("do...while body ran");
} while (n < 10);
```

The `while` body ran **zero** times: it checked `100 < 10`, found it false, and never entered. The `do...while` body ran **exactly once**, then checked `100 < 10`, found it false, and stopped. That "at least once" is the entire difference between the two.

```flow readonly caption="Figure 2.4.6a: the while loop with n at 100. The test comes first and is false, so the no arrow goes straight to the end. The body is never reached."
flowchart LR
  A([Start]) --> B[n starts at 100]
  B --> C{n is less than 10}
  C -- yes --> W[/log while body ran/]
  W --> C
  C -- no --> E([End])
```

```flow readonly caption="Figure 2.4.6b: the do...while loop with n at 100. The body comes first, so it runs once. Then the test is false and the no arrow leaves the loop."
flowchart LR
  A([Start]) --> B[n starts at 100]
  B --> D[/log do...while body ran/]
  D --> C{n is less than 10}
  C -- no --> E([End])
  C -- yes --> D
```

## Step 2: The same question, a different starting value

Here `x` starts at `0` and the condition is `x < 0`: false immediately, same as Step 1. Predict how many times `"ran"` prints before running.

```js live plain
let x = 0;

do {
  console.log("ran");
  x++;
} while (x < 0);
```

It prints once. The body runs *before* anything is tested, only after that first run does `x` become `1`, and `1 < 0` is false, so the loop stops there.

## Key takeaways

- `while` can run its body **zero** times if the condition starts false.
- `do...while` always runs its body **at least once**, no matter what the condition says at the start.
- The difference only shows up when the condition is false on the very first check, once the loop is running normally, both behave the same way.
