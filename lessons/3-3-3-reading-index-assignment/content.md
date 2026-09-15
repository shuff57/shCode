## Changing an Item by Index

**What you'll learn:**
- How to replace one item in an array without touching the others
- That writing to a slot never grows or shrinks the array
- That an array can mix types, and how the console shows that to you

You already know how to read an item with `arr[i]`. The same syntax writes: assign to an existing slot and it is replaced **in place**.

```js
let colors = ["red", "green", "blue"];

colors[1] = "yellow";   // replace index 1
console.log(colors);     // ["red", "yellow", "blue"]
```

The array does not grow and it does not shrink — you are not adding an item, you are swapping what sits in a slot that already exists. `colors.length` is still `3` before and after.

**Try it:** Run the block and check the length after the assignment.

```js live plain
let colors = ["red", "green", "blue"];

console.log(colors.length);   // 3

colors[1] = "yellow";
console.log(colors);          // ["red", "yellow", "blue"]
console.log(colors.length);    // still 3
```

An array does not have to hold all the same type. `[42, "hello", true]` is a perfectly good array. When the console prints one, it shows strings in quotes but numbers and booleans bare — that is a **type signal**, not decoration:

```js live plain
let mixed = [42, "hello", true];
console.log(mixed);   // [42, "hello", true]
```

The quotes around `"hello"` tell you it is text; `42` and `true` have no quotes because they are a number and a boolean.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`arr[i] = value`** | Replace the item at index `i` with `value` |
| **in place** | Changed where it sits; the array's length does not change |
| **mixed-type array** | An array whose items are different types (e.g. `[42, "hello", true]`) |
