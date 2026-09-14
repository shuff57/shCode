**Goal:** Prove that pointing a parameter at a new object is a local move. It never reaches the caller's variable, even when the object is an array.

## Step 1: The reassignment inside the function

The function builds a new array and points its own parameter `arr` at it. Inside, everything looks changed.

```js live plain
function replace(arr) {
  arr = [9, 9, 9];
  console.log("inside: ", arr);
}

let scores = [1, 2, 3];
replace(scores);
```

## Step 2: The caller never moved

Now print `scores` after the call. It still points at the original array, because `arr` and `scores` were two separate names.

```js live plain
function replace(arr) {
  arr = [9, 9, 9];
  console.log("inside: ", arr);
}

let scores = [1, 2, 3];
replace(scores);
console.log("outside:", scores);
```

`inside` prints `[9,9,9]`; `outside` prints `[1,2,3]`. The function really did the work — it just did it on a name the caller cannot see.

## Step 3: Contrast with a mutation

Change the function body from a reassignment to a mutation and the caller notices at once. This is the whole distinction in two runs side by side.

```js live plain
function changeInPlace(arr) {
  arr[0] = 9;
  console.log("inside: ", arr);
}

let scores = [1, 2, 3];
changeInPlace(scores);
console.log("outside:", scores);
```

## Key takeaways

- Reassigning a parameter (`arr = [...]`) points only the function's own name somewhere new; it dies with the call.
- Mutating the object (`arr[0] = 9`) writes into the shared object, so the caller sees it.
- Both lines look equally forceful. What separates them is whether a *name* moved or an *object* changed.
- A function can mutate an object you handed it; it can never reassign your variable.
