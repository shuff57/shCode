**Goal:** Take a function that silently mutates the caller's array and make it safe with one line — copying before it changes anything.

## Step 1: The side effect

`addItem` pushes onto the array it was handed. The call looks like it just returns a value, but the caller's list is changed too.

```js live plain
function addItem(list, item) {
  list.push(item);
  return list;
}

const myList = ["a", "b"];
const result = addItem(myList, "c");
console.log(result);
console.log(myList);
```

Both lines print `["a","b","c"]` — there is only one array, and `push` reached it.

## Step 2: Copy first

Build a new array from the old one plus the new item, and the caller's list never moves. No `push`, no shared mutation.

```js live plain
function addItemSafely(list, item) {
  return [...list, item];
}

const myList = ["a", "b"];
const result = addItemSafely(myList, "c");
console.log(result);
console.log(myList);
```

Now it prints `["a","b","c"]` then `["a","b"]`. The original array survives because the function never wrote into it.

## Step 3: Copy before a mutating method

`sort` mutates the array in place. Copy with `[...scores]`, sort the copy, and the caller's order is preserved.

```js live plain
function highestThree(scores) {
  const copy = [...scores];
  copy.sort(function (a, b) { return b - a; });
  return copy.slice(0, 3);
}

const original = [40, 90, 15, 70, 55];
console.log(highestThree(original));
console.log(original);
```

## Key takeaways

- Any function that calls a mutating method (`push`, `sort`, `pop`) changes the caller's object unless it copies first.
- `[...arr]` builds a new array holding the same items; `{...obj}` does the same for a plain object.
- The copy is shallow: nested objects inside are still shared, so a deep change needs `structuredClone`.
- The one-line rule for a result-producing function: copy, then change the copy.
