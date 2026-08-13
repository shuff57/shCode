## Array Basics: Index, push, pop

**What you'll learn:**
- How an array stores an ordered list of values in a single variable
- How zero-based indexing works (`arr[0]` is the first item, not `arr[1]`)
- How `.push()` adds an item to the end and `.pop()` removes the last item
- How `.length` tells you how many items are in the array

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
