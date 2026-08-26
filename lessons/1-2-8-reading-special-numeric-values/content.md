## Three values that live inside `number`

> **Definition 1.2.1: Special numeric values.** Besides ordinary numbers, the `number` type includes three special values: **`Infinity`**, **`-Infinity`** and **`NaN`**. `Infinity` is larger than any number. `NaN` stands for "Not a Number" and represents the result of an invalid maths operation.

The odd part is that all three *are* of type `number`. `NaN` is a number whose whole job is to mean "this is not a number." Nobody claims that is elegant; it is simply how the type works.

- **`Infinity`** appears when you divide by zero, and you can also write it directly.
- **`-Infinity`** is the same idea in the other direction.
- **`NaN`** appears when a maths operation makes no sense: multiplying text by a number, for instance.

**What you'll learn from it:**
- `Infinity`, `-Infinity` and `NaN` are all values of type `number`.
- Dividing by zero gives `Infinity` rather than an error.
- `NaN` means "Not a Number" and comes from maths that does not make sense.
- The program keeps running either way: nothing here crashes.

**Try it:**

```js live plain
console.log( 1 / 0 );                  // Infinity
console.log( Infinity );               // Infinity: you can write it directly
console.log( -1 / 0 );                 // -Infinity
console.log( "not a number" / 2 );     // NaN
console.log( 5 );                      // still running
```

Read that last line again. In many languages, dividing by zero **halts the program** with an error. In JavaScript, maths is "safe": the script never crashes from a bad maths operation. Dividing by zero, multiplying a word by a number: at worst you get `Infinity` or `NaN`, and the code keeps going.

Which sounds friendly, and is a double-edged thing. A crash tells you exactly where the problem was. A `NaN` quietly travels onward into your next calculation: see 1.2.9.

---

## Short glossary (quick reference)

| Term | Meaning |
|------|---------|
| **`Infinity`** | A value larger than any number; the result of dividing by zero |
| **`-Infinity`** | The same in the negative direction |
| **`NaN`** | "Not a Number": the result of an invalid maths operation. Its type is still `number` |
| **safe maths** | JavaScript never halts on a bad maths operation; it returns a special value instead |
