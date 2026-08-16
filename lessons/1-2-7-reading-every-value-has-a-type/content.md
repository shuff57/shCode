## Eight types, and that is all of them

Every value in JavaScript has a **type**. A type tells you what kind of thing the value is — a number, a piece of text, a yes/no answer, and so on.

There are exactly eight basic data types. Not "about eight", not "eight common ones" — eight. Everything you will ever put in a variable is one of these:

| Type | Holds | Example |
|---|---|---|
| `number` | whole numbers and decimals | `42`, `3.5` |
| `bigint` | integers too large for `number` | `9007199254740993n` |
| `string` | text | `"hello"` |
| `boolean` | `true` or `false` | `true` |
| `null` | "nothing", on purpose | `null` |
| `undefined` | "no value given yet" | `undefined` |
| `symbol` | a unique identifier (advanced) | `Symbol("id")` |
| `object` | a collection of values | `{ pages: 200 }` |

The next lessons take one row at a time. This one is the map, so that when you meet `NaN` or `undefined` you know which neighbourhood you are in.

**What you'll learn from it:**
- Every value in JavaScript has a type.
- There are exactly eight basic data types.
- Seven of them are *primitive* — they hold one single thing.
- The eighth, `object`, holds collections. It gets its own lesson (1.2.22).

**Try it:**

Five of the eight, one per line. Read the type names beside each value before you run it.

```js live plain
let count = 42;              // number
let greeting = "hello";      // string
let isReady = true;          // boolean
let chosen = null;           // null
let notSetYet;               // undefined

console.log(count);
console.log(greeting);
console.log(isReady);
console.log(chosen);
console.log(notSetYet);
```

Notice the last one. `notSetYet` was declared and never given a value, and it still printed something. That is a type too — and it has its own lesson at 1.2.20.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **data type** | A classification telling the language what kind of value it is holding |
| **value** | The actual thing stored — `42`, `"hello"`, `true` |
| **primitive type** | A type whose values hold only a single thing |
| **object** | The one non-primitive type — holds a collection of values |
