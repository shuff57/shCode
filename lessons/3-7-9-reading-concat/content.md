## Joining Lists with `.concat()`

**What you'll learn from it:**
- How `.concat()` returns a new array with another array's items added on the end
- That both the original and the argument are left unchanged
- That array arguments are flattened one level rather than nested
- That `.concat()` can take loose values and several arrays at once
- How it differs from `.push()`

`.concat()` is the opposite of `.slice()`: it returns a new array with another array's items added on the end.

**Try it:** Run the block and read the last two lines. Both originals survive.

```js live plain
const first = [1, 2];
const second = [3, 4];

const joined = first.concat(second);

console.log(joined);
console.log(first);
console.log(second);
```

`.concat()` also takes loose values and several arrays at once. Each array argument has its elements added individually, rather than as a nested array:

```js live plain
console.log([1, 2].concat(3));
console.log([1].concat([2], [3, 4]));
```

The difference from `.push()` is the thing to hold on to. `push` **changes** the array it is called on and adds its argument as one item, so pushing an array nests it: `[1, 2].push([3, 4])` gives `[1, 2, [3, 4]]`. `concat` leaves both arrays alone and returns a new flat array.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`.concat(...values)`** | Returns a new array of the original followed by the given values |
| **flattened one level** | An array argument has its elements added individually, not nested |
| **non-mutating** | Neither the original nor the arguments are changed |
| **`.push(v)` vs `.concat(v)`** | `push` mutates and nests an array argument; `concat` returns a new flat array |
