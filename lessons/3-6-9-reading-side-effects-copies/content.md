## Side effects

**What you'll learn:**
- What a side effect is
- Why an unexpected side effect is hard to debug
- When a side effect is the point of a function

When a function changes an object it was given, that change is a **side effect**. A side effect is any change a function makes that outlives the call and is visible to the rest of the program.

Side effects are not automatically bad. `arr.sort()` exists precisely to rearrange the array you handed it. The trouble is an *unexpected* one: the damage happens inside a function you may not have written, on data you thought was safe.

**Try it:** `sort` mutates in place. Run it and watch the caller's array change without any line outside the function touching it.

```js live plain
function sortScores(scores) {
  scores.sort(function (a, b) { return b - a; });
}

let highScores = [40, 90, 15, 70];
sortScores(highScores);
console.log(highScores);
```

The name `sortScores` promises to sort, and it does — the caller's array is reordered. That is a side effect that matches the name, so it is doing its job.

## The bug is the surprise

**What you'll learn:**
- Why a result-producing function must not also rearrange its input
- How to spot a side effect that does not match the function's name

A function named `sortScores` may reorder the array it was handed. A function named `getHighest` must not — the caller asked for a value, not for their data to be rearranged.

**Try it:** `getHighest` returns the top score, but it sorts the caller's array on the way. Run it and notice the surprise after the call.

```js live plain
function getHighest(scores) {
  scores.sort(function (a, b) { return b - a; });
  return scores[0];
}

let scores = [40, 90, 15, 70];
let top = getHighest(scores);
console.log("highest: " + top);
console.log(scores);
```

`highest` is correct, but `scores` came back reordered. When a name promises a result and the body also rearranges your data, the surprise is the bug.

## Working on a copy

**What you'll learn:**
- How the spread syntax makes a shallow copy of an array
- How copying first removes an unwanted side effect
- Why the copy is called shallow

The fix is to work on a copy. `[...scores]` uses the spread syntax to build a **new** array holding the same items, so a sort then reorders the copy and the caller's array survives untouched.

**Try it:** The only change from the buggy version is the `const copy = [...scores];` line. Run it and check that `scores` is unchanged.

```js live plain
function getHighest(scores) {
  const copy = [...scores];
  copy.sort(function (a, b) { return b - a; });
  return copy[0];
}

let scores = [40, 90, 15, 70];
let top = getHighest(scores);
console.log("highest: " + top);
console.log(scores);
```

A copy made this way is **shallow**: the new array is genuinely new, but if its items are themselves objects, both arrays still point at those same inner objects. For a flat list of numbers or strings a shallow copy is all you need. When you need a copy that goes all the way down, `structuredClone(value)` does that.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **side effect** | A change a function makes that outlives the call and is visible to the rest of the program |
| **mutating method** | A method that changes the array in place, such as `sort`, `push`, and `pop` |
| **spread (`...`)** | Syntax that unpacks an array into a new one: `[...arr]` |
| **shallow copy** | A new container holding the same items; the container is new, the items are still shared |
| **`structuredClone(value)`** | A built-in that makes a deep copy, all the way down |
