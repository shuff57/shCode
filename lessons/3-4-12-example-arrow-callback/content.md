**Goal:** Watch one counting loop answer three different questions because the rule arrives as an inline arrow.

## Step 1: A loop with the rule left out

`countMatching` walks the list and counts. Notice what it does *not* contain: any condition. The test is a parameter.

```js live plain
function countMatching(numbers, test) {
  let count = 0;
  for (let i = 0; i < numbers.length; i++) {
    if (test(numbers[i])) {
      count = count + 1;
    }
  }
  return count;
}

const readings = [4, -2, 7, 0, -9, 3];

console.log(countMatching(readings, (n) => n > 0));
```

The arrow `(n) => n > 0` is the rule. It is passed *without* being named first, and the loop calls it on each number.

```flow readonly caption="Figure 3.4.12: the counting loop. The diamond inside the loop is the callback: the loop asks it a yes or no question about each number, and never decides the answer itself."
flowchart TD
  A([Start]) --> B[count = 0]
  B --> C{more numbers left}
  C -- yes --> D{the callback says true for this number}
  D -- yes --> E[count = count + 1]
  E --> C
  D -- no --> C
  C -- no --> F[/return count/]
  F --> G([End])
```

## Step 2: Swap the callback, swap the question

The loop is untouched. Only the arrow changes.

```js live plain
function countMatching(numbers, test) {
  let count = 0;
  for (let i = 0; i < numbers.length; i++) {
    if (test(numbers[i])) {
      count = count + 1;
    }
  }
  return count;
}

const readings = [4, -2, 7, 0, -9, 3];

console.log(countMatching(readings, (n) => n < 0));
console.log(countMatching(readings, (n) => n % 2 === 0));
```

These two lines print `2` then `3`. Together with the `3` from step 1, that is `3`, `2`, `3`: one loop, written once, answers three questions.

## Step 3: The mistake the parentheses cause

Passing `double()` instead of `double` calls the function first and hands over a number.

```js live plain
function applyTwice(operation, value) {
  return operation(operation(value));
}

const double = (n) => n * 2;

console.log(applyTwice(double, 5));   // the function: 20

try {
  console.log(applyTwice(double(), 5));  // the RESULT: fails
} catch (err) {
  console.log(err.name + ": " + err.message);
}
```

`applyTwice` receives a number where it expected a function, then tries to call it. Pass the value `double` — no parentheses.

## Key takeaways

- A callback is a function passed to another function so it can be called later.
- Pass it with no parentheses: `double`, not `double()`.
- An inline arrow is the usual way to write a callback used in one place.
- Separating the loop from the rule lets one loop answer many questions.
