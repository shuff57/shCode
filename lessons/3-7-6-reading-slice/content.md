## Taking Part of a List with `.slice()`

**What you'll learn from it:**
- How `.slice(start, end)` copies a range of an array
- Why the `end` index is excluded, so the count is `end - start`
- That leaving off `end` means "to the finish"
- That the original array is never changed
- That `.slice()` with no arguments makes a full, independent copy

`.slice(start, end)` returns a **copy** of part of an array: from `start` up to but **not including** `end`.

**Try it:** Run the block and compare the three slices with the original on the last line.

```js live plain
const letters = ["a", "b", "c", "d", "e"];

console.log(letters.slice(1, 3));
console.log(letters.slice(2));
console.log(letters.slice(0, 2));
console.log(letters);
```

Three points trip people up, in order of how often. The **end index is excluded**: `slice(1, 3)` gives positions 1 and 2, not 1, 2 and 3; the count is `end - start`. Leaving off `end` means "to the finish": `slice(2)` takes everything from position 2 onward. And the **original is untouched** — the last line proves it.

Calling `.slice()` with no arguments at all gives a full copy, which matters more than it looks. `const copy = original;` would give you a second name for the *same* array, so pushing would change both. `.slice()` makes an actual second array:

```js live plain
const original = [1, 2, 3];
const copy = original.slice();

copy.push(4);

console.log(original);
console.log(copy);
```

That is the whole point of this module's methods. `push` and `pop` change the array they are called on; `.map()`, `.slice()` and `.concat()` never do — they hand back something new.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`.slice(start, end)`** | Returns a copy of the elements from index `start` up to but not including `end` |
| **excluded end** | The element at `end` is not included in the result |
| **`.slice()`** | With no arguments, returns a full copy of the array |
| **non-mutating** | Leaves the original array unchanged; the result must be assigned to keep it |
