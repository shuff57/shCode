## Array Basics: Index, push, pop

**What you'll learn:**
- How an array stores an ordered list of values in a single variable
- How zero-based indexing works (`arr[0]` is the first item, not `arr[1]`)
- How `.push()` adds an item to the end and `.pop()` removes the last item
- How `.length` tells you how many items are in the array
- How to read the last item, and what reading one place past the end gives you

An **array** is a variable that holds a list of values in order. You create one with square brackets:

```js
let fruits = ["apple", "banana", "cherry"];
```

Each item has a position called an **index**. The first item is at index `0`, not `1`:

| Index | Value |
|-------|-------|
| 0 | `"apple"` |
| 1 | `"banana"` |
| 2 | `"cherry"` |

Use `fruits[0]` to read the first item. `fruits[2]` reads the third. `fruits.length` is `3`.

`.push(value)` adds a new item at the end. `.pop()` removes the last item and gives it back to you.

**Try it:** Run the block and trace what the array looks like after each step.

```js live plain
let fruits = ["apple", "banana", "cherry"];

console.log(fruits[0]);        // first item
console.log(fruits[2]);        // third item
console.log(fruits.length);    // 3

fruits.push("date");
console.log(fruits.length);    // 4
console.log(fruits[3]);        // "date"

let removed = fruits.pop();
console.log(removed);          // "date"
console.log(fruits.length);    // 3
```

### The last item, and one place past it

The last index is always one less than `.length`, so `fruits[fruits.length - 1]` reads the last item however long the array is. Reading `fruits[fruits.length]` goes one place past the end, where nothing lives, and gives `undefined`:

```js live plain
let fruits = ["apple", "banana", "cherry"];

console.log(fruits.length);
console.log(fruits[fruits.length - 1]);
console.log(fruits[fruits.length]);
```

`3`, then `cherry`, then `undefined`. Nothing crashes yet, but asking that `undefined` for a property, such as `fruits[fruits.length].name`, is a `TypeError`.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **array** | A variable that holds an ordered list of values |
| **index** | The position of an item in an array; starts at `0` |
| **`arr[i]`** | Read (or write) the item at index `i` |
| **`.push(value)`** | Add `value` to the end of the array |
| **`.pop()`** | Remove and return the last item of the array |
| **`.length`** | The number of items currently in the array |
| **last item** | `arr[arr.length - 1]`; `arr[arr.length]` is one place past the end and is `undefined` |
