**Goal:** Use `while` when you don't know the count ahead of time, and understand why forgetting to update the condition variable causes an infinite loop.

## Step 1: A while countdown

`while` checks its condition before every pass. Here `count` starts at 3 and decreases by 1 each time. When `count` reaches 0, the condition is false and the loop stops.

```js live plain
let count = 3;

while (count > 0) {
  console.log("T-minus " + count);
  count = count - 1;
}

console.log("Liftoff!");
```

## Step 2: The infinite-loop trap (read only: do not remove count--)

The code below is safe because it **does** update `count`. But if you removed `count = count - 1`, the condition `count > 0` would stay true forever and the loop would never end: freezing the browser tab.

The rule: every `while` loop **must** have at least one line inside it that moves the condition variable toward the stopping point.

```js live plain
let count = 3;

// Safe: count decreases each pass, so the loop WILL end.
while (count > 0) {
  console.log("count = " + count);
  count = count - 1;   // <-- this line is what makes it safe
}

console.log("Finished safely.");
```

## Key takeaways

- Use `while` when the number of passes is not known ahead of time.
- Use `for` when you know exactly how many times to repeat.
- Every `while` loop must update the condition variable inside the body: forgetting creates an infinite loop.
