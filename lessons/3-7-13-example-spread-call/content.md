**Goal:** Feed an array into a function that wants separate arguments, using `...` at the call.

## Step 1: The problem

`Math.max` compares the arguments it is given. Given a single array, it cannot treat that array as a number, so the result is `NaN`.

```js live plain
console.log(Math.max(3, 9, 4));
console.log(Math.max([3, 9, 4]));
```

## Step 2: Spread the array at the call

Put `...` in front of the array at the call site. The array's elements arrive as separate arguments, and the call works.

```js live plain
const numbers = [3, 9, 4];

console.log(Math.max(...numbers));
```

## Step 3: Spread into your own function

The same move works for any function that takes separate parameters. `combine` wants three, and `...parts` supplies exactly three.

```js live plain
const parts = ["a", "b", "c"];

function combine(x, y, z) {
  return x + "-" + y + "-" + z;
}

console.log(combine(...parts));
```

## Key takeaways

- A function that compares separate arguments cannot accept one array in their place.
- `...arr` at a call site unpacks the array into individual arguments.
- The three dots go at the call, not inside the array literal.
- Spread is the reverse of a rest parameter, which gathers arguments into an array.
