**Goal:** Write a function that keeps only the passing scores from an array, returning a new list and leaving the original alone.

## Step 1: The `passing` function

Here is the build-a-new-list shape from the reading: empty array, `for...of` loop, push every score that clears the bar, return the result.

```js live plain
function passing(scores) {
  let result = [];
  for (let s of scores) {
    if (s >= 60) {
      result.push(s);
    }
  }
  return result;
}
```

The loop visits every score once. Each one is either pushed into `result` (it passed) or skipped (it did not). Nothing is removed from the original — `scores` still holds every value.

## Step 2: Call it with a mixed set

Run this and confirm only the passing scores come back.

```js live plain
function passing(scores) {
  let result = [];
  for (let s of scores) {
    if (s >= 60) {
      result.push(s);
    }
  }
  return result;
}

let grades = [72, 55, 88, 41, 60, 93];
console.log(passing(grades));   // [72, 88, 60, 93]
```

## Step 3: Call it with an array that returns nothing

Now try a set where nothing passes:

```js live plain
function passing(scores) {
  let result = [];
  for (let s of scores) {
    if (s >= 60) {
      result.push(s);
    }
  }
  return result;
}

console.log(passing([30, 45, 12]));   // []
```

The output is `[]` — an empty array. That is **correct, not an error**: "nothing matched" is a valid answer, and it means a caller never has to special-case it. The function returns the same type (an array) whether it matched everything, something, or nothing, so the code that uses it stays simple.

## Key takeaways

- The filter shape is: empty array → loop → push matches → return.
- The function never mutates the input array; it builds a new one.
- An empty result is a legitimate answer, not a failure.
