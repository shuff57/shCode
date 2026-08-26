## The whole system, on one page

There are 8 basic data types in JavaScript: **seven primitives** and **one object type**.

| Type | For | Note |
|---|---|---|
| `number` | integers and floating-point alike | limited to `±(2^53 - 1)` for exact integers |
| `bigint` | integers of arbitrary length | created by adding `n` to the end |
| `string` | text | zero or more characters; no separate character type |
| `boolean` | `true` / `false` | most come out of comparisons |
| `null` | unknown or deliberately empty values | a standalone type with a single value |
| `undefined` | unassigned values | a standalone type with a single value |
| `symbol` | unique identifiers | used with objects; met later |
| `object` | collections of data | **the only non-primitive** |

`typeof` tells you which one a value is. Use it as `typeof x` or `typeof(x)`; it returns a string like `"string"` or `"number"`. Remember the exception: **`typeof null` returns `"object"`**, and that is a bug in the language, not the actual type of `null`.

**What you'll learn from it:**
- Eight types: seven primitive, one object.
- `null` and `undefined` are each a type with exactly one value.
- `number` is exact only up to `2^53 - 1`; past that you need `bigint`.
- `typeof` names the type, with the `null` exception to remember.

**Try it:**

Every type in the language, in one run.

```js live plain
console.log(typeof 42);                  // number
console.log(typeof 42n);                 // bigint
console.log(typeof "text");              // string
console.log(typeof false);               // boolean
console.log(typeof null);                // object  <-- the known bug
console.log(typeof undefined);           // undefined
console.log(typeof Symbol("id"));        // symbol
console.log(typeof { pages: 200 });      // object
```

Eight lines, eight types, one wrong answer. If you can look at that output and say which line is lying and what the truth is, module 1.2's type system is done.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **primitive type** | Holds a single thing. Seven of the eight types |
| **object** | The one non-primitive type; holds a collection |
| **`2^53 - 1`** | `9007199254740991`: the exact-integer limit of `number` |
| **standalone type** | A type with exactly one value in it: `null` and `undefined` |
