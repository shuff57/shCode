**Goal:** Turn a function that only prints its answer into one that hands it back, and prove the difference by using the result in arithmetic.

## Step 1: The printing version

This function computes correctly, but it only shows the number to a person. The call itself hands back nothing.

```js live plain
function areaAndPrint(width, height) {
  console.log(width * height);
}

const a = areaAndPrint(3, 4);
console.log("The stored value is: " + a);
```

The `12` comes from inside the function. The `undefined` comes from the call, because there was no `return`.

## Step 2: Prove the value is unusable

The caller of a printing function cannot do anything with the result. Arithmetic on `undefined` produces `NaN`, the value JavaScript uses for "not a number".

```js live plain
function areaAndPrint(width, height) {
  console.log(width * height);
}

const a = areaAndPrint(3, 4);
console.log("Two rooms: " + (a * 2));
```

`Two rooms: NaN`. The computation was fine inside; the value just never reached the caller.

## Step 3: Return instead

Change one word: swap `console.log` for `return`. Now the call produces a real number, so the caller can store it and do arithmetic with it.

```js live plain
function area(width, height) {
  return width * height;
}

const a = area(3, 4);
console.log("One room: " + a);
console.log("Two rooms: " + (a * 2));
```

`12` then `24`. The doubling is the proof: arithmetic only works if a real number came back.

## Step 4: Let the caller decide how to show it

A returning function keeps its options open. The caller can print the value, store it, compare it, or pass it on. A printing function can only ever be printed.

```js live plain
function area(width, height) {
  return width * height;
}

const room = area(5, 6);

console.log(room);
if (room > 25) {
  console.log("That is a big room.");
}
```

The same returned value is both printed and compared. That second use is impossible for a printing function, because there is no value to compare.

## Key takeaways

- `console.log` shows a value to a person; `return` gives it to the program.
- A function that finishes without `return` produces `undefined`.
- Arithmetic on `undefined` gives `NaN`, the symptom of a missing `return`.
- A returning function's result can be stored, reused, and tested; a printed one cannot.
