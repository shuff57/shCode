## The five primary data types

**What you'll learn:**
- The five types JavaScript uses most: number, string, boolean, null, undefined
- What each type represents and when you see it
- How to use the `typeof` operator to find out what type a value is

Every value in JavaScript belongs to a **type**. JavaScript has several types; these five cover almost everything you'll write in this course:

| Type | Examples | What it is |
|------|----------|------------|
| `number` | `42`, `3.14`, `-7` | Any numeric value |
| `string` | `"hello"`, `'hi'`, `` `hey` `` | Text in quotes |
| `boolean` | `true`, `false` | A yes/no value |
| `null` | `null` | An intentional "no value" |
| `undefined` | `undefined` | A variable that has not been given a value yet |

The `typeof` operator returns the type of any value as a string. Write `typeof` in front of a value or variable name.

**Try it:** Run the block and read each output. Notice that `typeof null` returns `"object"` — that is a famous old JavaScript bug. Every other language would call it `"null"`.

```js live console
let age = 17;
let name = "Jordan";
let enrolled = true;
let nothing = null;
let notSet;

console.log(typeof age);
console.log(typeof name);
console.log(typeof enrolled);
console.log(typeof nothing);
console.log(typeof notSet);
```

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **data type** | The category a value belongs to (number, string, etc.) |
| **number** | Any numeric value: integers and decimals |
| **string** | Text surrounded by quotes (single, double, or backtick) |
| **boolean** | Exactly `true` or `false` |
| **`null`** | Intentional empty value — you set it on purpose |
| **`undefined`** | A variable that exists but has not been assigned a value |
| **`typeof`** | Operator that returns a type name as a string |
