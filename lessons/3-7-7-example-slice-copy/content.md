**Goal:** Copy a range out of an array with `.slice()`, and prove the original never changes.

## Step 1: Slice a middle range

`slice(1, 3)` starts at index 1 and stops before index 3, so it copies two items. Run it and read the "not including" rule off the output.

```js live plain
const letters = ["a", "b", "c", "d", "e"];

console.log(letters.slice(1, 3));
console.log(letters.length);
```

## Step 2: Leave off the end

With `end` omitted, the slice runs to the finish. This is how you take "everything from here on".

```js live plain
const letters = ["a", "b", "c", "d", "e"];

console.log(letters.slice(2));
console.log(letters.slice(0, 2));
```

## Step 3: A full copy is a second array

`.slice()` with no arguments copies the whole array into a new one. Push onto the copy and watch the original stay put.

```js live plain
const original = [1, 2, 3];
const copy = original.slice();

copy.push(4);

console.log(original);
console.log(copy);
```

## Key takeaways

- `.slice(start, end)` copies from `start` up to but not including `end`.
- Leaving off `end` means "to the end of the array".
- `.slice()` never changes the input, so the result has to be assigned to be kept.
- `.slice()` with no arguments is a full copy — a genuinely separate array.
